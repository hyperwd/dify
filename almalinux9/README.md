# Dify AlmaLinux 9 部署

一个为 AlmaLinux 9 优化的 Dify 部署解决方案，使用官方基础镜像，仅重新构建前端来应用品牌定制。

## 🚀 快速部署

### 1. 系统要求

- AlmaLinux 9 或其他 Linux 系统
- Docker 和 Docker Compose
- 网络连接（拉取官方镜像）

### 2. 部署命令

```bash
# 克隆或下载项目到服务器
cd /opt/dify/almalinux9

# 一键部署（自动检测IP）
./deploy.sh

# 或者手动指定IP
./deploy.sh 10.81.97.39
```

### 3. 配置环境变量

部署完成后，编辑 `.env` 文件配置 OpenAI API 密钥：

```bash
vim .env
# 修改 OPENAI_API_KEY
OPENAI_API_KEY=your-openai-api-key
```

然后重启服务：
```bash
docker compose restart
```

## 📋 文件说明

- `deploy.sh`: 主部署脚本，支持自动IP检测
- `docker-compose.yaml`: Docker编排配置（含IP占位符）
- `.env.example`: 环境配置模板
- `Dockerfile.web.brand`: 品牌定制前端Dockerfile

## 🌐 访问地址

部署完成后：

- **Web 界面**: http://你的服务器IP:3000
- **API 服务**: http://你的服务器IP:5001

## ⚙️ 配置选项

### 手动指定IP
```bash
./deploy.sh -i 192.168.1.100
```

### 仅生成配置文件
```bash
./deploy.sh -e 192.168.1.100
```

### 仅拉取镜像
```bash
./deploy.sh -p
```

### 仅构建前端
```bash
./deploy.sh -b
```

## 🛠️ 管理命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 停止服务
docker compose down

# 重启服务
docker compose restart

# 更新部署
git pull origin main
./deploy.sh
```

## 🔧 架构特点

- ✅ **官方兼容**: API、Worker、数据库等使用官方镜像
- ✅ **品牌定制**: 仅重新构建前端应用品牌定制
- ✅ **动态IP**: 支持自动检测或手动指定服务器IP
- ✅ **简化配置**: 最小化配置，避免复杂的认证问题

## 🐛 故障排除

### 常见问题

1. **IP地址错误**: 重新运行部署脚本指定正确IP
2. **端口冲突**: 确保端口 3000 和 5001 未被占用
3. **镜像拉取失败**: 检查网络连接或使用国内镜像源

### 日志查看
```bash
# 查看所有服务日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f web
docker compose logs -f api
```

## 📝 更新说明

- IP地址变化时，重新运行 `./deploy.sh` 即可
- 品牌资源更新时，使用 `./deploy.sh -b` 重新构建前端
- 系统更新后，使用 `./deploy.sh -p` 更新镜像

---

这个部署方案专注于稳定性和易用性，最大程度保持与官方Dify的兼容性。