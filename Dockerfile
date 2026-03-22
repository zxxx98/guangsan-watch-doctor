# --- 第一阶段：构建阶段 (Builder) ---
FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm (corepack 在某些 alpine 版本中可能不稳定，建议直接安装)
RUN npm install -g pnpm

# 1. 复制依赖描述文件
COPY package.json pnpm-lock.yaml ./

# 2. 安装所有依赖（包含 devDependencies）
RUN pnpm install --frozen-lockfile

# 3. 复制源代码和配置文件 (确保 .dockerignore 已经删除了 src 和 tsconfig)
COPY . .

# 4. 执行构建 (如果这一步报错，请在本地运行 pnpm build 确认代码无误)
RUN pnpm build


# --- 第二阶段：运行阶段 (Runner) ---
FROM --platform=linux/arm64 node:20-alpine AS runner

WORKDIR /app

# 设置为生产环境
ENV NODE_ENV=production

# 1. 安装 pnpm
RUN npm install -g pnpm

# 2. 从 builder 阶段复制构建产物和依赖描述文件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
# 根据你的需求，额外复制 config.json
COPY --from=builder /app/src/config.json ./dist/

# 3. 只安装生产环境依赖
RUN pnpm install --frozen-lockfile --prod

# 暴露端口
EXPOSE 3001

# 启动命令
CMD ["node", "dist/server/index.js"]
