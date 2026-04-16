FROM node:22-alpine

WORKDIR /app

COPY server/package*.json ./server/
COPY shared/ ./shared/

RUN npm ci --prefix server

COPY server/tsconfig.json ./server/
COPY server/src/ ./server/src/

RUN npm run build --prefix server && \
    npm prune --omit=dev --prefix server

EXPOSE 3000

CMD ["node", "server/dist/server/src/index.js"]

