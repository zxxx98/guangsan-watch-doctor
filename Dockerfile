FROM node:20-alpine AS builder

WORKDIR /app

# 确保 .dockerignore 不再忽略这些构建必需文件
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# --- 修改部分：复制构建产物和必要的依赖描述文件 ---
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
# 必须把 lockfile 也考过来，否则 pnpm install 会报错
COPY --from=builder /app/pnpm-lock.yaml ./ 
COPY --from=builder /app/src/config.json ./dist/

# 现在有了 package.json 和 pnpm-lock.yaml，执行 install 就会成功
RUN corepack enable && pnpm install --frozen-lockfile --prod

EXPOSE 3001

CMD ["node", "dist/server/index.js"]
