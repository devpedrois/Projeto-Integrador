FROM alpine:3.24 AS base
COPY --from=node:22-alpine /usr/local/bin/node /usr/local/bin/node
RUN apk add --no-cache libatomic libstdc++ openssl ca-certificates \
    && apk add --no-cache --virtual .npm-bootstrap npm \
    && npm install --global --prefix /usr/local npm@12.2.1 undici@6.29.1 \
    && rm -rf /usr/local/lib/node_modules/npm/node_modules/undici \
    && ln -s ../../undici /usr/local/lib/node_modules/npm/node_modules/undici \
    && apk del .npm-bootstrap \
    && addgroup -g 1000 node \
    && adduser -D -u 1000 -G node node
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.docker.json ./
RUN npx prisma generate --config prisma/generate.config.ts \
    && npx tsc --project tsconfig.docker.json

FROM build AS migrate
ENV NODE_ENV=production
COPY prisma.config.ts ./
USER node

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node docker ./docker
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
