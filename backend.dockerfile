# backend.Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY server ./server
COPY package*.json ./

RUN npm install

EXPOSE 3005

CMD ["node", "server/server.js"]