FROM node:22-alpine AS build

WORKDIR /app

COPY client/package*.json ./client/
COPY shared/ ./shared/

RUN npm ci --prefix client

COPY client/tsconfig*.json ./client/
COPY client/index.html ./client/
COPY client/vite.config.ts ./client/
COPY client/public/ ./client/public/
COPY client/src/ ./client/src/

RUN npm run build --prefix client

FROM nginx:alpine

COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
