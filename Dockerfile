FROM node:20-alpine

RUN apk add --no-cache tzdata wget

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build:server && npm run build:client

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "dist/index.js"]
