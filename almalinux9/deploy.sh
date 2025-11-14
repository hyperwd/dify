#!/bin/bash

# ============================================================================
# Dify AlmaLinux 9 最终部署脚本（动态IP替换）
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 脚本配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$SCRIPT_DIR"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yaml"
ENV_FILE="$DEPLOY_DIR/.env"

# 自动获取服务器IP
detect_server_ip() {
    # 尝试多种方法获取IP地址
    local ip=""

    # 方法1: 使用hostname -I
    if command -v hostname >/dev/null 2>&1; then
        ip=$(hostname -I | awk '{print $1}')
    fi

    # 方法2: 使用ip route
    if [[ -z "$ip" ]] && command -v ip >/dev/null 2>&1; then
        ip=$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7}' | head -1)
    fi

    # 方法3: 使用默认网关接口
    if [[ -z "$ip" ]]; then
        local interface=$(ip route | grep default | awk '{print $5}' | head -1)
        if [[ -n "$interface" ]]; then
            ip=$(ip addr show "$interface" | grep 'inet ' | awk '{print $2}' | cut -d'/' -f1 | head -1)
        fi
    fi

    # 方法4: 回退到localhost（仅用于测试）
    if [[ -z "$ip" ]]; then
        ip="localhost"
    fi

    echo "$ip"
}

# 生成动态docker-compose文件
generate_compose_file() {
    local server_ip="$1"

    log_info "更新Docker Compose配置文件中的IP地址..."

    if [[ -f "$COMPOSE_FILE" ]]; then
        # 创建临时文件进行替换
        local temp_file=$(mktemp)

        # 替换所有的SERVER_IP_HERE占位符
        sed "s#SERVER_IP_HERE#$server_ip#g" "$COMPOSE_FILE" > "$temp_file"

        # 添加http://前缀（如果没有的话）
        sed "s#CONSOLE_API_URL: $server_ip:#CONSOLE_API_URL: http://$server_ip:#g" "$temp_file" | \
        sed "s#CONSOLE_WEB_URL: $server_ip:#CONSOLE_WEB_URL: http://$server_ip:#g" | \
        sed "s#APP_API_URL: $server_ip:#APP_API_URL: http://$server_ip:#g" | \
        sed "s#APP_WEB_URL: $server_ip:#APP_WEB_URL: http://$server_ip:#g" | \
        sed "s#NEXT_PUBLIC_API_URL: $server_ip:#NEXT_PUBLIC_API_URL: http://$server_ip:#g" | \
        sed "s#NEXT_PUBLIC_CONSOLE_URL: $server_ip:#NEXT_PUBLIC_CONSOLE_URL: http://$server_ip:#g" | \
        # 修复端口映射，移除IP前缀
        sed "s#\"$server_ip:5001:5001#\"#\"5001:5001\"#g" | \
        sed "s#\"$server_ip:3000:3000#\"#\"3000:3000\"#g" > "$COMPOSE_FILE"

        rm "$temp_file"
        log_success "Docker Compose配置文件更新完成: $COMPOSE_FILE"
    else
        log_error "找不到配置文件: $COMPOSE_FILE"
        exit 1
    fi

    # 显示生成的端口配置
    log_info "生成的端口配置:"
    grep -E "(5001:5001|3000:3000)" "$COMPOSE_FILE"
}

# 生成环境配置文件
generate_env_file() {
    local server_ip="$1"

    log_info "生成环境配置文件..."

    if [[ -f "$ENV_FILE" ]]; then
        log_warning "环境配置文件已存在，将备份并重新生成"
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # 创建配置文件
    cat > "$ENV_FILE" << EOF
# Dify AlmaLinux 9 环境配置
# 服务器IP: $server_ip

# 基础配置
SECRET_KEY=sk-9f73s3ljTXVcMT3Blb3ljTqtsKiGHXVcMT3BlbkFJLK7U
DEPLOY_ENV=PRODUCTION
LOG_LEVEL=INFO

# 数据库配置
DATABASE_URL=postgresql://postgres:difyai123@db:5432/dify

# Redis 配置（无密码）
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/1

# 向量数据库配置
VECTOR_STORE=weaviate
WEAVIATE_ENDPOINT=http://weaviate:8080

# 存储配置
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=storage

# 代码执行配置
CODE_EXECUTION_ENDPOINT=http://sandbox:8194
CODE_EXECUTION_API_KEY=dify-sandbox
CODE_EXECUTION_TIMEOUT=15
CODE_EXECUTION_CONNECTION_TIMEOUT=10

# 代码执行限制
CODE_MAX_NUMBER=9223372036854775807
CODE_MIN_NUMBER=-9223372036854775808
CODE_STRING_MAX_LENGTH=80000
CODE_MAX_STRING_ARRAY_LENGTH=1000
CODE_MAX_OBJECT_ARRAY_LENGTH=1000
CODE_MAX_NUMBER_ARRAY_LENGTH=1000
CODE_MAX_STRING_OBJECT_LENGTH=1000
CODE_MAX_NUMBER_OBJECT_LENGTH=1000
CODE_MAX_DEPTH=5

# 模型配置
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=

# 加密配置
ENCRYPTION_KEY=

# CORS 配置
WEB_API_CORS_ALLOW_ORIGINS=*
EOF

    log_success "环境配置文件生成完成: $ENV_FILE"
}

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到 root 用户，建议使用普通用户运行此脚本"
        read -p "是否继续？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统要求
check_system() {
    log_info "检查系统要求..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装"
        exit 1
    fi

    if ! systemctl is-active --quiet docker; then
        log_error "Docker 服务未运行"
        exit 1
    fi

    log_success "系统要求检查通过"
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."

    local dirs=(
        "$PROJECT_DIR/volumes/app/storage"
        "$PROJECT_DIR/volumes/app/logs"
        "$PROJECT_DIR/volumes/db/postgres"
        "$PROJECT_DIR/volumes/redis/data"
        "$PROJECT_DIR/volumes/weaviate"
        "$PROJECT_DIR/volumes/sandbox"
    )

    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chmod 755 "$dir"
    done

    log_success "目录创建完成"
}

# 拉取官方镜像
pull_official_images() {
    log_info "拉取官方服务镜像..."

    local images=(
        "langgenius/dify-api:0.9.0"
        "postgres:15-alpine"
        "redis:7-alpine"
        "semitechnologies/weaviate:1.19.0"
        "langgenius/dify-sandbox:0.2.1"
    )

    for image in "${images[@]}"; do
        log_info "拉取镜像: $image"
        docker pull "$image"
    done

    log_success "官方镜像拉取完成"
}

# 构建品牌前端镜像
build_brand_image() {
    local server_ip="$1"

    log_info "构建品牌前端镜像..."

    cd "$DEPLOY_DIR"

    # 创建临时的Dockerfile用于构建，将IP地址直接写入
    local temp_dockerfile=$(mktemp)
    cat > "$temp_dockerfile" << EOF
# 品牌定制前端 Dockerfile - 动态IP版本
FROM node:22-alpine3.21 AS base

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/\$TZ /etc/localtime && echo \$TZ > /etc/timezone

# Set UTF-8 locale
ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

# Enable corepack
RUN corepack enable

# Set Node.js environment
ENV PNPM_HOME="/pnpm"
ENV PATH="\$PNPM_HOME:\$PATH"
ENV NODE_ENV=production
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://$server_ip:5001
ENV APP_API_URL=http://$server_ip:5001
ENV MARKETPLACE_API_URL=https://marketplace.dify.ai
ENV MARKETPLACE_URL=https://marketplace.dify.ai
ENV NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_API_URL=http://$server_ip:5001
ENV NEXT_PUBLIC_CONSOLE_URL=http://$server_ip:3000

WORKDIR /app/web

# install packages stage
FROM base AS packages

COPY package.json .
COPY pnpm-lock.yaml .

# Use packageManager from package.json
RUN corepack install

RUN pnpm install --frozen-lockfile

# build resources
FROM base AS builder
WORKDIR /app/web

COPY --from=packages /app/web/ ./
COPY . .

# 禁用 Next.js 遥测
ENV NEXT_TELEMETRY_DISABLED=1

# Set Node.js options for build
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN pnpm build:docker

# production stage - 使用构建结果
FROM node:22-alpine3.21 AS production

# Set timezone
ENV TZ=UTC
RUN ln -snf /usr/share/zoneinfo/\$TZ /etc/localtime && echo \$TZ > /etc/timezone

# Set environment variables
ENV NODE_ENV=production
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://$server_ip:5001
ENV APP_API_URL=http://$server_ip:5001
ENV MARKETPLACE_API_URL=https://marketplace.dify.ai
ENV MARKETPLACE_URL=https://marketplace.dify.ai
ENV NEXT_PUBLIC_BASE_PATH=
ENV NEXT_PUBLIC_API_URL=http://$server_ip:5001
ENV NEXT_PUBLIC_CONSOLE_URL=http://$server_ip:3000

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nextjs -u 1001

WORKDIR /app/web

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/web/public ./public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \\
    CMD curl -f http://localhost:3000 || exit 1

# Start the application
CMD ["node", "server.js"]
EOF

    # 使用临时Dockerfile构建
    if docker compose version &> /dev/null; then
        docker build -t dify-web-brand -f "$temp_dockerfile" ../web
    else
        docker build -t dify-web-brand -f "$temp_dockerfile" ../web
    fi

    rm "$temp_dockerfile"
    log_success "品牌前端镜像构建完成"
}

# 停止现有服务
stop_existing_services() {
    log_info "停止现有服务..."

    cd "$DEPLOY_DIR"

    # 停止所有可能相关的服务
    docker compose -f docker-compose-simple.yaml down 2>/dev/null || true
    docker compose -f docker-compose.yaml down 2>/dev/null || true
    docker compose -f docker-compose-brand.yaml down 2>/dev/null || true

    log_success "现有服务已停止"
}

# 启动服务
start_services() {
    log_info "启动 Dify 服务..."

    cd "$DEPLOY_DIR"

    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up -d
    fi

    log_success "Dify 服务启动完成"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    cd "$DEPLOY_DIR"

    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" ps
    else
        docker-compose -f "$COMPOSE_FILE" ps
    fi

    echo
    log_info "测试基本连接..."

    # 测试 Redis
    if docker compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping &>/dev/null; then
        log_success "✓ Redis 连接正常"
    else
        log_error "✗ Redis 连接失败"
    fi

    # 测试 PostgreSQL
    if docker compose -f "$COMPOSE_FILE" exec -T db pg_isready -U postgres &>/dev/null; then
        log_success "✓ PostgreSQL 连接正常"
    else
        log_error "✗ PostgreSQL 连接失败"
    fi

    # 测试 Web
    local server_ip="$1"
    if curl -f "http://$server_ip:3000" &>/dev/null; then
        log_success "✓ Web 服务访问正常"
    else
        log_warning "✗ Web 服务可能还在启动"
    fi

    # 测试 API
    if curl -f "http://$server_ip:5001/health" &>/dev/null; then
        log_success "✓ API 服务访问正常"
    else
        log_warning "✗ API 服务可能还在启动"
    fi
}

# 显示访问信息
show_access_info() {
    local server_ip="$1"

    log_success "最终部署完成！"
    echo
    echo "访问信息:"
    echo "  Web 界面: http://$server_ip:3000"
    echo "  API 服务: http://$server_ip:5001"
    echo "  安装页面: http://$server_ip:3000/install"
    echo
    echo "管理命令:"
    echo "  查看状态: cd $DEPLOY_DIR && docker compose ps"
    echo "  查看日志: cd $DEPLOY_DIR && docker compose logs -f"
    echo "  停止服务: cd $DEPLOY_DIR && docker compose down"
    echo "  重启服务: cd $DEPLOY_DIR && docker compose restart"
    echo
    echo "配置文件位置: $COMPOSE_FILE, $ENV_FILE"
    echo "数据目录: $PROJECT_DIR/volumes"
    echo
    log_warning "如需修改IP地址，请重新运行 ./deploy-final.sh [IP地址]"
    log_warning "请确保已配置 $ENV_FILE 文件中的 OPENAI_API_KEY"
}

# 显示帮助信息
show_help() {
    echo "Dify AlmaLinux 9 最终部署脚本（动态IP替换）"
    echo
    echo "用法: $0 [选项] [服务器IP]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -i, --ip       指定服务器IP地址"
    echo "  -p, --pull     仅拉取镜像"
    echo "  -b, --build    仅构建品牌前端"
    echo "  -e, --env-only 仅生成配置文件"
    echo
    echo "示例:"
    echo "  $0                    # 自动检测IP并完整部署"
    echo "  $0 10.81.97.39        # 使用指定IP部署"
    echo "  $0 -i 192.168.1.100   # 使用指定IP部署"
    echo "  $0 -e                 # 仅生成配置文件"
}

# 主函数
main() {
    local custom_ip=""
    local pull_only=false
    local build_only=false
    local env_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -i|--ip)
                custom_ip="$2"
                shift 2
                ;;
            -p|--pull)
                pull_only=true
                shift
                ;;
            -b|--build)
                build_only=true
                shift
                ;;
            -e|--env-only)
                env_only=true
                shift
                ;;
            -*)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
            *)
                # 如果是IP地址格式，作为自定义IP
                if [[ $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                    custom_ip="$1"
                else
                    log_error "无效的IP地址: $1"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # 显示开始信息
    echo "=========================================================="
    echo "    Dify AlmaLinux 9 最终部署（动态IP替换）"
    echo "=========================================================="
    echo

    # 确定服务器IP
    local server_ip="$custom_ip"
    if [[ -z "$server_ip" ]]; then
        log_info "自动检测服务器IP地址..."
        server_ip=$(detect_server_ip)
        if [[ "$server_ip" == "localhost" ]]; then
            log_warning "无法自动检测IP地址，使用localhost"
        fi
    fi

    log_info "使用服务器IP: $server_ip"

    # 仅拉取镜像
    if [[ "$pull_only" == true ]]; then
        check_root
        check_system
        pull_official_images
        exit 0
    fi

    # 仅构建前端
    if [[ "$build_only" == true ]]; then
        check_root
        check_system
        generate_compose_file "$server_ip" "$COMPOSE_FILE"
        generate_env_file "$server_ip"
        build_brand_image "$server_ip"
        exit 0
    fi

    # 仅生成配置文件
    if [[ "$env_only" == true ]]; then
        check_root
        create_directories
        generate_compose_file "$server_ip" "$COMPOSE_FILE"
        generate_env_file "$server_ip"
        log_success "配置文件已生成: $COMPOSE_FILE, $ENV_FILE"
        exit 0
    fi

    # 完整部署流程
    check_root
    check_system
    create_directories
    generate_compose_file "$server_ip" "$COMPOSE_FILE"
    generate_env_file "$server_ip"
    stop_existing_services
    pull_official_images
    build_brand_image "$server_ip"
    start_services
    check_services "$server_ip"
    show_access_info "$server_ip"
}

# 捕获中断信号
trap 'log_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"