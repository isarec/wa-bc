#!/usr/bin/env bash
set -euo pipefail

if [[ -f package.json ]]; then
  echo "[render-start] iniciando em $(pwd)"
  exec npm start
elif [[ -f wa-bc/package.json ]]; then
  cd wa-bc
  echo "[render-start] iniciando em $(pwd)"
  exec npm start
else
  echo "[render-start] ERRO: package.json não encontrado para iniciar aplicação" >&2
  exit 1
fi
