FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run bundle

FROM node:20-alpine

RUN apk add --no-cache tzdata wget

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3001

CMD ["node", "dist/bundle.js"]
