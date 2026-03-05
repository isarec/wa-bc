# WhatsApp API de teste com Baileys (Render Free)

API simples para teste de envio de mensagens no WhatsApp usando `@whiskeysockets/baileys`.

## Requisitos
- Node.js 20+
- Número para autenticar no WhatsApp

## Rodando localmente
```bash
npm install
cp .env.example .env
npm start
```

## Endpoints
### `GET /health`
Verifica status da API e conexão.

### `POST /session/connect`
Gera código de pareamento (`pairingCode`) para autenticar a sessão.

Body JSON:
```json
{
  "phoneNumber": "5511999999999"
}
```

### `POST /messages/send`
Envia mensagem de texto para um número.

Body JSON:
```json
{
  "to": "5511999999999",
  "message": "Mensagem de teste via API"
}
```

## Deploy no Render (plano free)
1. Suba este projeto no GitHub.
2. No Render, escolha **New +** > **Blueprint** e selecione o repositório.
3. O `render.yaml` cria automaticamente o serviço web free.
4. Garanta que o **Root Directory** esteja como `.` (raiz do repositório).
5. O projeto já inclui scripts de build/start (`scripts/render-build.sh` e `scripts/render-start.sh`) para evitar erro de `package.json` não encontrado.
6. Após deploy, use o endpoint `/session/connect` para obter `pairingCode`.
7. No WhatsApp do número autenticado: **Aparelhos conectados** > **Conectar aparelho** > inserir código.

## Observações
- Este projeto é apenas para testes.
- A pasta de autenticação local (`auth_info_baileys`) não é persistida entre reinícios no free sem disco persistente.
- Para manter sessão estável em produção, use armazenamento persistente.
