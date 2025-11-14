# Dify AlmaLinux 9 品牌定制部署

这是一个针对 AlmaLinux 9 的 Dify 品牌定制部署方案，使用官方基础镜像，只重新构建前端来应用你的品牌定制。

## 🎯 特点

- ✅ **最小化改动**: 仅重新构建前端，其他服务完全使用官方镜像
- ✅ **品牌定制**: 包含你自定义的品牌图标、logo 和界面元素
- ✅ **官方兼容**: API、Worker、数据库等都使用官方镜像
- ✅ **快速部署**: 一键部署到 AlmaLinux 9

## 🚀 快速部署

### 1. 系统要求

- AlmaLinux 9
- Docker 和 Docker Compose
- 网络连接（拉取官方镜像）

### 2. 部署命令

```bash
# 完整部署（推荐）
./deploy-brand.sh

# 或者分步部署
./deploy-brand.sh --env-only    # 仅设置环境
./deploy-brand.sh --pull        # 拉取官方镜像
./deploy-brand.sh --web-only    # 仅构建品牌前端
```

### 3. 配置环境

复制并编辑环境配置：
```bash
cp .env.example .env
# 编辑 .env 文件，设置 OPENAI_API_KEY 等配置
```

## 📁 架构说明

### 服务组件

| 服务 | 镜像 | 说明 |
|------|------|------|
| API | `langgenius/dify-api:0.9.0` | 官方后端API |
| Worker | `langgenius/dify-api:0.9.0` | 官方Worker |
| Web | **自定义构建** | 品牌定制前端 |
| Nginx | `nginx:alpine` | 反向代理 |
| PostgreSQL | `postgres:15-alpine` | 数据库 |
| Redis | `redis:7-alpine` | 缓存 |
| Weaviate | `semitechnologies/weaviate:1.19.0` | 向量数据库 |
| Sandbox | `langgenius/dify-sandbox:0.2.1` | 代码执行 |

### 品牌定制

品牌定制包含：
- ✅ 自定义 favicon 图标
- ✅ 自定义 app logo
- ✅ 品牌相关的界面文本
- ✅ 应用主题色彩

## ⚙️ 配置选项

### 环境变量 (.env)

主要配置项：
```bash
# 安全配置
SECRET_KEY=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# API 配置
OPENAI_API_KEY=your-openai-api-key

# 数据库配置（默认）
DATABASE_URL=postgresql://postgres:difyai123@db:5432/dify
REDIS_URL=redis://redis:6379/0

# 向量数据库（默认）
VECTOR_STORE=weaviate
```

### 完整配置选项

参考 `.env.example` 文件获取所有配置选项。

## 🛠️ 管理命令

### 服务管理

```bash
# 查看服务状态
docker compose -f docker-compose-brand.yaml ps

# 查看日志
docker compose -f docker-compose-brand.yaml logs -f

# 停止服务
docker compose -f docker-compose-brand.yaml down

# 重启服务
docker compose -f docker-compose-brand.yaml restart
```

### 品牌更新

如果需要更新品牌资源：

```bash
# 重新构建品牌前端
./deploy-brand.sh --web-only

# 然后重启服务
docker compose -f docker-compose-brand.yaml up -d
```

### 升级到新版本

```bash
# 更新代码和品牌资源
git pull origin main

# 重新部署
./deploy-brand.sh --build
```

## 🔒 访问地址

部署完成后：

- **Web 界面**: http://localhost
- **API 文档**: http://localhost/docs
- **健康检查**: http://localhost/health

## 📊 监控和维护

### 健康检查

使用健康检查脚本：
```bash
./health-check.sh
```

### 数据备份

```bash
# 备份数据库
docker compose -f docker-compose-brand.yaml exec db pg_dump -U postgres dify > backup.sql

# 备份存储
tar -czf storage-backup.tar.gz ../volumes/app/storage/
```

## 🆘 故障排除

### 常见问题

1. **镜像拉取失败**
   ```bash
   # 检查网络连接
   curl -I https://registry.hub.docker.com

   # 或使用国内镜像源
   sudo vim /etc/docker/daemon.json
   ```

2. **前端构建失败**
   ```bash
   # 清理并重新构建
   docker system prune -f
   ./deploy-brand.sh --web-only
   ```

3. **服务启动失败**
   ```bash
   # 查看详细日志
   docker compose -f docker-compose-brand.yaml logs
   ```

## 🔄 更新流程

1. **更新品牌资源**:
   ```bash
   # 修改 web/public/ 目录下的品牌文件
   git add web/public/
   git commit -m "update brand assets"
   ```

2. **重新构建和部署**:
   ```bash
   ./deploy-brand.sh --build
   ```

## 📝 文件结构

```
almalinux9/
├── README-BRAND.md              # 本文档
├── .env.example                 # 环境配置模板
├── docker-compose-brand.yaml   # 品牌定制编排配置
├── Dockerfile.web.brand        # 品牌前端 Dockerfile
├── deploy-brand.sh             # 品牌部署脚本
├── nginx/                      # Nginx 配置
└── health-check.sh             # 健康检查脚本
```

## 💡 提示

- 首次部署建议使用 `./deploy-brand.sh` 一键部署
- 生产环境请确保修改默认密钥和密码
- 定期备份数据库和存储文件
- 监控系统资源使用情况

---

这个方案最大程度保持了与官方Dify的兼容性，只在前端应用品牌定制，确保稳定性和可靠性。