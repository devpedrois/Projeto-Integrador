FROM alpine:3.24 AS base
COPY --from=node:22-alpine /usr/local/bin/node /usr/local/bin/node
RUN apk add --no-cache libatomic libstdc++ ca-certificates \
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
COPY src ./src
COPY scripts ./scripts
COPY tsconfig.json tsconfig.docker.json ./
RUN npm run build -- --project tsconfig.docker.json

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm pkg set 'scripts.bootstrap:permissoes=node dist/scripts/bootstrap-permissoes.js' \
    'scripts.migrate=node dist/scripts/migrate.js' \
    && npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node migrations ./dist/migrations
USER node
EXPOSE 3002
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=6 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3002)+'/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
