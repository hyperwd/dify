# Dify AlmaLinux 9 部署指南

这是一个为 AlmaLinux 9 优化的 Dify 部署解决方案，包含完整的 Docker 容器化部署、健康检查和监控系统。

## 🚀 快速开始

### 1. 系统要求

- AlmaLinux 9 或其他 RHEL 系系列
- 至少 4GB RAM，推荐 8GB 或更多
- 至少 20GB 可用磁盘空间
- Docker 和 Docker Compose
- 具有 sudo 权限的用户账户

### 2. 安装系统依赖

```bash
# 克隆或下载项目到服务器
# 假设项目已下载到 /opt/dify

# 安装系统依赖
cd /opt/dify/almalinux9
sudo ./install-dependencies.sh

# 重新登录以使用户组生效
```

### 3. 部署 Dify

```bash
# 完整部署
./deploy.sh

# 或者分步部署
./deploy.sh --env-only  # 仅设置环境
# 编辑 .env 文件配置 API 密钥等
./deploy.sh             # 执行部署
```

### 4. 访问服务

部署完成后，可以通过以下地址访问：

- **Web 界面**: http://localhost
- **API 文档**: http://localhost/docs
- **健康检查**: http://localhost/health

## 📁 项目结构

```
almalinux9/
├── README.md                    # 本文档
├── .env.example                 # 环境配置模板
├── docker-compose.yaml          # Docker Compose 配置
├── Dockerfile.api               # API 服务 Dockerfile
├── Dockerfile.web               # Web 服务 Dockerfile
├── nginx/
│   ├── nginx.conf              # Nginx 主配置
│   └── proxy.conf              # 代理配置
├── deploy.sh                    # 部署脚本
├── install-dependencies.sh      # 系统依赖安装脚本
└── health-check.sh              # 健康检查和监控脚本
```

## ⚙️ 配置说明

### 环境配置 (.env)

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
cp .env.example .env
```

主要配置项：

- `SECRET_KEY`: 安全密钥（建议修改）
- `DATABASE_URL`: 数据库连接
- `REDIS_URL`: Redis 连接
- `VECTOR_STORE`: 向量数据库类型
- `STORAGE_TYPE`: 存储类型
- `OPENAI_API_KEY`: OpenAI API 密钥

### 向量数据库选择

支持以下向量数据库：

```bash
# Weaviate（默认）
VECTOR_STORE=weaviate

# Qdrant
VECTOR_STORE=qdrant

# Milvus
VECTOR_STORE=milvus
```

### 存储配置

支持多种存储后端：

```bash
# 本地存储（默认）
STORAGE_TYPE=local

# AWS S3
STORAGE_TYPE=s3
S3_BUCKET_NAME=your-bucket
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
```

## 🔧 管理命令

### 服务管理

```bash
# 启动服务
./deploy.sh

# 停止服务
cd /opt/dify/almalinux9
docker compose down

# 重启服务
docker compose restart

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f
```

### 健康检查

```bash
# 完整健康检查
./health-check.sh

# 持续监控
./health-check.sh --watch

# 生成健康报告
./health-check.sh --report

# 检查特定组件
./health-check.sh --services
./health-check.sh --resources
./health-check.sh --database
```

### 系统监控

```bash
# 查看系统状态
dify-monitor

# 服务管理快捷命令
dify-service start|stop|restart|status|logs|update|clean
```

## 🛠️ 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80

   # 停止冲突服务
   sudo systemctl stop nginx
   ```

2. **Docker 权限问题**
   ```bash
   # 添加用户到 docker 组
   sudo usermod -aG docker $USER

   # 重新登录
   ```

3. **内存不足**
   ```bash
   # 检查内存使用
   free -h

   # 创建交换文件
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **磁盘空间不足**
   ```bash
   # 清理 Docker
   docker system prune -a

   # 清理日志
   sudo journalctl --vacuum-time=7d
   ```

### 日志位置

- **应用日志**: `../volumes/app/logs/`
- **Nginx 日志**: `../volumes/web/nginx/logs/`
- **健康检查日志**: `health-check.log`
- **Docker 日志**: `docker compose logs [service-name]`

### 性能优化

1. **系统优化**：
   ```bash
   # 调整文件描述符限制
   echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
   echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
   ```

2. **Docker 优化**：
   ```bash
   # 配置 Docker 日志轮转
   sudo tee /etc/docker/daemon.json > /dev/null <<EOF
   {
     "log-driver": "json-file",
     "log-opts": {
       "max-size": "10m",
       "max-file": "3"
     }
   }
   EOF

   sudo systemctl restart docker
   ```

## 🔒 安全配置

### SSL/TLS 配置

1. **获取 SSL 证书**：
   ```bash
   # 使用 Let's Encrypt
   sudo dnf install certbot
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. **配置 Nginx HTTPS**：
   ```bash
   # 编辑 nginx/nginx.conf
   # 取消 HTTPS server 块的注释
   # 更新证书路径
   ```

### 防火墙配置

```bash
# 开放必要端口
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

### 安全加固

- 修改默认密钥和密码
- 启用防火墙
- 定期更新系统
- 配置备份策略
- 监控异常访问

## 📊 监控和告警

### 内置监控

- **健康检查**: 自动检测服务状态
- **资源监控**: CPU、内存、磁盘使用率
- **日志监控**: 自动检测错误日志

### 告警配置

在 `health-check.sh` 中配置：

```bash
# 邮件告警
ALERT_EMAIL="admin@your-domain.com"

# Webhook 告警
WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### 外部监控

可以集成以下监控系统：

- Prometheus + Grafana
- ELK Stack
- Zabbix
- Nagios

## 🔄 备份和恢复

### 数据备份

```bash
# 备份数据库
docker compose exec db pg_dump -U postgres dify > backup.sql

# 备份存储数据
tar -czf storage-backup.tar.gz ../volumes/app/storage/
```

### 数据恢复

```bash
# 恢复数据库
docker compose exec -T db psql -U postgres -d dify < backup.sql

# 恢复存储数据
tar -xzf storage-backup.tar.gz -C ../volumes/app/
```

## 📈 升级指南

### 升级 Dify

```bash
# 备份数据
./backup.sh

# 拉取最新代码
git pull origin main

# 重新构建和部署
./deploy.sh --build

# 检查服务状态
./health-check.sh
```

### 版本回滚

```bash
# 切换到指定版本
git checkout v1.0.0

# 重新部署
./deploy.sh --build
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个部署方案。

## 📄 许可证

本项目遵循与 Dify 主项目相同的许可证。

## 📞 支持

如果遇到问题，请：

1. 查看[故障排除](#故障排除)部分
2. 检查健康检查日志
3. 提交 Issue 到项目仓库

---

**注意**: 这是一个针对 AlmaLinux 9 优化的部署方案，在其他系统上可能需要调整配置。