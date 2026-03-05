import express from 'express';
import dotenv from 'dotenv';
import pino from 'pino';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys';

dotenv.config();

const app = express();
app.use(express.json());

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = process.env.AUTH_FOLDER || 'auth_info_baileys';
const SESSION_NAME = process.env.SESSION_NAME || 'render-test-session';

let sock;
let isConnecting = false;
let lastConnectionUpdate = { connection: 'close', reason: 'not_initialized' };

async function createSocket({ phoneNumber } = {}) {
  if (isConnecting) {
    throw new Error('Conexão em andamento. Aguarde alguns segundos.');
  }

  isConnecting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(`${AUTH_FOLDER}/${SESSION_NAME}`);
    const { version } = await fetchLatestBaileysVersion();

    const newSocket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      printQRInTerminal: true,
      browser: ['Render API Bot', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    newSocket.ev.on('creds.update', saveCreds);

    newSocket.ev.on('connection.update', (update) => {
      lastConnectionUpdate = update;
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info('QR gerado no terminal para autenticação.');
      }

      if (connection === 'open') {
        logger.info('Conectado ao WhatsApp com sucesso.');
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        logger.warn(
          {
            statusCode,
            shouldReconnect
          },
          'Conexão encerrada.'
        );

        if (shouldReconnect) {
          createSocket().catch((error) => {
            logger.error({ error }, 'Falha ao reconectar automaticamente.');
          });
        }
      }
    });

    sock = newSocket;

    if (phoneNumber && !state.creds.registered) {
      const pairingCode = await newSocket.requestPairingCode(phoneNumber);
      logger.info({ phoneNumber }, 'Pairing code gerado para autenticação.');
      return { pairingCode };
    }

    return { pairingCode: null };
  } finally {
    isConnecting = false;
  }
}

function ensureSocketReady() {
  if (!sock || lastConnectionUpdate?.connection !== 'open') {
    throw new Error('WhatsApp ainda não está conectado. Chame /session/connect primeiro.');
  }
}

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    connection: lastConnectionUpdate?.connection || 'unknown'
  });
});

app.post('/session/connect', async (req, res) => {
  try {
    const { phoneNumber } = req.body ?? {};

    if (!phoneNumber) {
      return res.status(400).json({
        error: 'Informe phoneNumber no corpo da requisição no formato internacional. Ex: 5511999999999'
      });
    }

    const result = await createSocket({ phoneNumber });

    return res.json({
      message: 'Inicialização da sessão concluída. Verifique o pairingCode.',
      ...result
    });
  } catch (error) {
    logger.error({ error }, 'Erro ao conectar sessão.');
    return res.status(500).json({ error: error.message || 'Erro interno.' });
  }
});

app.post('/messages/send', async (req, res) => {
  try {
    ensureSocketReady();

    const { to, message } = req.body ?? {};

    if (!to || !message) {
      return res.status(400).json({
        error: 'Campos obrigatórios: to e message. Ex: to=5511999999999'
      });
    }

    const jid = `${to}@s.whatsapp.net`;
    const response = await sock.sendMessage(jid, { text: message });

    return res.json({
      success: true,
      remoteJid: response.key.remoteJid,
      messageId: response.key.id
    });
  } catch (error) {
    logger.error({ error }, 'Erro ao enviar mensagem.');
    return res.status(500).json({ error: error.message || 'Erro interno.' });
  }
});

app.listen(PORT, async () => {
  logger.info(`API rodando na porta ${PORT}.`);
  logger.info('Use POST /session/connect para parear e POST /messages/send para envio de teste.');

  if (process.env.AUTO_CONNECT === 'true') {
    try {
      await createSocket();
    } catch (error) {
      logger.error({ error }, 'Falha ao iniciar conexão automática.');
    }
  }
});
