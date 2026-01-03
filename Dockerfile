ARG NODE_VERSION=22.20.0

FROM node:${NODE_VERSION}

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
