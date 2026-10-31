#!/usr/bin/env bash

# ==============================================================================
# VERCEL IGNORED BUILD STEP - OTIMIZZA ERP
# ==============================================================================
# Convenção da Vercel:
# - Exit code 1: O build DEVE PROSSEGUIR.
# - Exit code 0: O build DEVE SER IGNORADO/CANCELADO (economiza recursos).
# ==============================================================================

echo "🔍 [Vercel Ignored Build Step] Inspecionando branch: $VERCEL_GIT_COMMIT_REF"

# 1. Produção oficial (branch main): SEMPRE publicar
if [ "$VERCEL_GIT_COMMIT_REF" == "main" ]; then
  echo "✅ Branch de Produção (main) detectada. Executando deployment oficial..."
  exit 1
fi

# 2. Homologação/Preview oficial (branch develop): SEMPRE publicar no ambiente Preview
if [ "$VERCEL_GIT_COMMIT_REF" == "develop" ]; then
  echo "✅ Branch de Homologação (develop) detectada. Executando Preview deployment..."
  exit 1
fi

# 3. Pull Requests direcionados para main ou develop: Permitir build de validação
if [ "$VERCEL_ENV" == "preview" ] && [ -n "$VERCEL_GIT_PULL_REQUEST_ID" ]; then
  echo "✅ Pull Request #$VERCEL_GIT_PULL_REQUEST_ID detectado. Executando Preview deployment de validação..."
  exit 1
fi

# 4. Qualquer outra branch ad-hoc / individual (feature/*, fix/*): Ignorar build automático
echo "🛑 Branch não homologada ($VERCEL_GIT_COMMIT_REF). Ignorando deploy automático para evitar consumo desnecessário."
exit 0
