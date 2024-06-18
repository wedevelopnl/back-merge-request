FROM node:22-alpine3.19

WORKDIR /app

COPY index.js package.json package-lock.json ./

RUN npm ci

ENTRYPOINT ["node", "index.js"]
