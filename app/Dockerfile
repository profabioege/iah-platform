# Imagem do piloto para o Cloud Run (southamerica-east1).
# Base fixada por digest (node 24.22.1, publicada em 21/10/2026): build reproduzivel; atualizar so com novo teste.
#
# Mesmo caminho já validado na homologação local: `next build` + `next start`
# em Node, servidor em UTC. Nada de `app/src` muda para rodar aqui.
#
# Segredos NUNCA entram como ARG nem ficam na imagem: o modo real é decidido
# no build (next.config.ts exige AUTH_SECRET, SUPABASE_SERVICE_ROLE_KEY e
# SUPABASE_JWT_SECRET presentes), então eles chegam só ao passo de build como
# build secrets (`--secret id=...`) e, em execução, pelo Secret Manager.
#
# Build oficial: `scripts/windows/piloto-cloudrun.ps1 -Etapa Imagem` (roda o
# podman build DENTRO da maquina do Podman, com --secret id=...,src=<arquivo>,
# porque o cliente Windows falha ao gravar o temporario dos build secrets).

FROM docker.io/library/node:24-bookworm-slim@sha256:2dd9a4f758e173b65fee15388f7706af6fb01ef50cf7a2c0538711d67a6981ae AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Públicos: entram no bundle de qualquer forma (NEXT_PUBLIC_*).
ARG IAH_AUTH_MODE=supabase
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_BUILD_COMMIT
ARG NEXT_PUBLIC_BUILD_BRANCH
ARG NEXT_PUBLIC_BUILD_ENVIRONMENT
ARG NEXT_PUBLIC_SITE_URL

RUN --mount=type=secret,id=auth_secret,required=true \
    --mount=type=secret,id=service_role,required=true \
    --mount=type=secret,id=jwt_secret,required=true \
    AUTH_SECRET="$(cat /run/secrets/auth_secret)" \
    SUPABASE_SERVICE_ROLE_KEY="$(cat /run/secrets/service_role)" \
    SUPABASE_JWT_SECRET="$(cat /run/secrets/jwt_secret)" \
    IAH_AUTH_MODE="$IAH_AUTH_MODE" \
    npm run build

# Só o necessário para `next start`, sem dependências de desenvolvimento.
FROM docker.io/library/node:24-bookworm-slim@sha256:2dd9a4f758e173b65fee15388f7706af6fb01ef50cf7a2c0538711d67a6981ae AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    TZ=UTC

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

ARG NEXT_PUBLIC_BUILD_COMMIT
LABEL org.opencontainers.image.revision=$NEXT_PUBLIC_BUILD_COMMIT \
      org.opencontainers.image.source="https://github.com/profabioege/iah-platform"

USER node
EXPOSE 8080
CMD ["sh", "-c", "exec node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-8080}"]
