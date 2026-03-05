#!/usr/bin/env bash
set -euo pipefail

if [[ -f package.json ]]; then
  echo "[render-build] package.json encontrado em $(pwd)"
  npm ci
elif [[ -f wa-bc/package.json ]]; then
  echo "[render-build] package.json encontrado em $(pwd)/wa-bc"
  cd wa-bc
  npm ci
else
  echo "[render-build] ERRO: package.json não encontrado no diretório atual nem em ./wa-bc" >&2
  echo "[render-build] pwd=$(pwd)" >&2
  find . -maxdepth 2 -type f | sed -n '1,80p' >&2
  exit 1
fi
