# 广三黄埔医院号源监控系统

医院门诊号源自动监控系统，支持多门诊并发查询、飞书机器人通知、Docker 部署。

## 功能特性

- **多门诊监听**: 支持同时监听多个门诊科室（产科专家/普通、妇科专家/普通）
- **实时号源查询**: 定时轮询医院接口，获取最新号源信息
- **飞书通知**: 检测到有号时自动发送飞书机器人通知
- **详细时段展示**: 显示医生、时段、诊室、剩余号数等详细信息
- **停诊过滤**: 自动过滤停诊时段，避免误报
- **配置持久化**: 飞书 Webhook 配置自动保存，无需重复输入
- **防风控**: 多门诊请求间隔随机延迟，模拟真人操作

## 技术栈

- **前端**: React + TypeScript + Ant Design + Vite
- **后端**: Node.js + Express + TypeScript
- **部署**: Docker + Docker Compose

## 快速开始

### 方式一：使用 GitHub Container Registry（推荐）

```bash
# 拉取镜像
docker pull ghcr.io/<your-username>/watch-doctor:latest

# 运行容器
docker run -d \
  --name watch-doctor \
  -p 3001:3001 \
  -v watch-doctor-data:/app/data \
  ghcr.io/<your-username>/watch-doctor:latest

# 访问前端
open http://localhost:3001
```

### 方式二：Docker Compose 部署

```bash
# 克隆项目
git clone <repository-url>
cd watch-doctor

# 启动服务
docker-compose up -d

# 访问前端
open http://localhost:3001
```

### 方式三：本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 前端访问 http://localhost:3000
# 后端服务 http://localhost:3001
```

## 使用说明

### 1. 配置监听参数

- **监听时间范围**: 选择需要监听的日期范围
- **轮询频率**: 设置查询间隔（单位：分钟）
- **监听门诊**: 勾选需要监听的门诊科室

### 2. 配置飞书通知（可选）

1. 在飞书群组中添加自定义机器人
2. 获取 Webhook 地址
3. 在「飞书通知地址」输入框中填入 Webhook URL
4. 配置会自动保存，下次无需重复输入

### 3. 启动监听

点击「启动监听」按钮，系统将开始定时查询号源。

### 4. 查看结果

- 主表格显示每次查询的汇总信息
- 点击展开可查看各门诊详情
- 再次展开可查看医生的详细时段信息

### 5. 自动停止

当检测到有号源时，系统会：
1. 发送飞书通知
2. 自动停止监听

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/monitor/start` | POST | 启动监听 |
| `/api/monitor/stop` | POST | 停止监听 |
| `/api/monitor/status` | GET | 获取运行状态 |
| `/api/monitor/results` | GET | 获取查询结果 |
| `/api/monitor/results` | DELETE | 清空结果 |
| `/api/monitor/config` | GET | 获取配置 |
| `/api/monitor/config` | POST | 保存配置 |

## 项目结构

```
watch-doctor/
├── src/
│   ├── client/                 # 前端代码
│   │   ├── src/
│   │   │   ├── api/           # API 接口
│   │   │   ├── components/    # React 组件
│   │   │   └── types/         # TypeScript 类型
│   │   └── index.html
│   └── server/                 # 后端代码
│       ├── routes/            # API 路由
│       ├── services/          # 业务逻辑
│       └── types/             # TypeScript 类型
├── config.json                 # 持久化配置（自动生成）
├── docker-compose.yml          # Docker 编排
├── Dockerfile                  # Docker 镜像
└── package.json
```

## 配置说明

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | 3001 | 后端服务端口 |

### 门诊配置

在 `src/server/types/index.ts` 中配置：

```typescript
export const DEPARTMENTS: Department[] = [
  { deptId: "0001102103101", name: "产科专家门诊(黄埔)", branchId: "02" },
  { deptId: "0001102103102", name: "产科普通门诊(黄埔)", branchId: "02" },
  { deptId: "0001102102101", name: "妇科普通门诊(黄埔)", branchId: "02" },
  { deptId: "0001102102102", name: "妇科专家门诊(黄埔)", branchId: "02" },
];
```

## 飞书通知格式

```
🏥 医院号源通知

**张医生** (主任医师)
门诊: 产科专家门诊(黄埔)
日期: 2026-03-28
剩余号数: 5
出诊时段:
上午 诊室1: 08:00-08:30(1号)、08:30-09:00(2号)

---

通知时间: 2026/3/22 10:30:00
```

## 注意事项

1. **请求频率**: 建议轮询间隔不低于 1 分钟，避免触发风控
2. **多门诊延迟**: 多门诊查询时会自动添加 0.5-2 秒随机延迟
3. **停诊过滤**: `scheduleStatus === '3'` 的时段会被自动过滤
4. **时区问题**: 日期选择器已处理时区转换，无需手动调整

## CI/CD

项目使用 GitHub Actions 自动构建并推送 Docker 镜像到 GitHub Container Registry (GHCR)。

### 自动触发条件

- 推送到 `main` 或 `master` 分支
- 创建 `v*` 格式的 tag（如 `v1.0.0`）
- Pull Request 到 `main` 或 `master` 分支（仅构建不推送）

### 自动版本检测

当 `package.json` 中的 `version` 字段发生变化时，会自动创建对应的 Git tag 并触发 Docker 镜像构建。

**发布新版本流程**：

```bash
# 1. 更新 package.json 中的 version
# "version": "1.0.0" -> "version": "1.1.0"

# 2. 提交并推送
git add package.json
git commit -m "chore: bump version to 1.1.0"
git push origin main

# 3. 自动触发：创建 tag v1.1.0 -> 构建 Docker 镜像 -> 推送到 GHCR
```

### 手动发布

也可以手动创建 tag：

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 使用镜像

```bash
# 拉取最新镜像
docker pull ghcr.io/<your-username>/watch-doctor:latest

# 拉取特定版本
docker pull ghcr.io/<your-username>/watch-doctor:v1.0.0

# 拉取特定分支
docker pull ghcr.io/<your-username>/watch-doctor:main
```

## License

MIT
