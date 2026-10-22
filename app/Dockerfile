# Imagem do piloto para o Cloud Run (southamerica-east1).
#
# Mesmo caminho já validado na homologação local: `next build` + `next start`
# em Node, servidor em UTC. Nada de `app/src` muda para rodar aqui.
#
# Segredos NUNCA entram como ARG nem ficam na imagem: o modo real é decidido
# no build (next.config.ts exige AUTH_SECRET, SUPABASE_SERVICE_ROLE_KEY e
# SUPABASE_JWT_SECRET presentes), então eles chegam só ao passo de build como
# build secrets (`--secret id=...`) e, em execução, pelo Secret Manager.
#
#   podman build -f Dockerfile \
#     --secret id=auth_secret,env=AUTH_SECRET \
#     --secret id=service_role,env=SUPABASE_SERVICE_ROLE_KEY \
#     --secret id=jwt_secret,env=SUPABASE_JWT_SECRET \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=... --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
#     --build-arg NEXT_PUBLIC_BUILD_COMMIT=<sha> ... -t <imagem> .

FROM docker.io/library/node:24-bookworm-slim AS build
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
FROM docker.io/library/node:24-bookworm-slim AS runtime
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
