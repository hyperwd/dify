#!/bin/bash

# ============================================================================
# Dify AlmaLinux 9 快速部署脚本
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
DEPLOY_DIR="$PROJECT_DIR/almalinux9"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yaml"
ENV_FILE="$DEPLOY_DIR/.env"

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

    # 检查操作系统
    if ! grep -q "AlmaLinux" /etc/os-release 2>/dev/null; then
        log_warning "此脚本专为 AlmaLinux 9 优化，在其他系统上可能无法正常工作"
    fi

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    # 检查 Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    # 检查 Docker 服务状态
    if ! systemctl is-active --quiet docker; then
        log_error "Docker 服务未运行，请启动 Docker 服务"
        exit 1
    fi

    log_success "系统要求检查通过"
}

# 安装系统依赖
install_dependencies() {
    log_info "检查系统依赖..."

    # 安装必要的系统包
    if command -v dnf &> /dev/null; then
        sudo dnf update -y
        sudo dnf install -y curl wget git unzip
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum install -y curl wget git unzip
    fi

    log_success "系统依赖检查完成"
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
        "$PROJECT_DIR/volumes/web/nginx/logs"
    )

    for dir in "${dirs[@]}"; do
        mkdir -p "$dir"
        chmod 755 "$dir"
    done

    log_success "目录创建完成"
}

# 设置环境配置
setup_environment() {
    log_info "设置环境配置..."

    if [[ ! -f "$ENV_FILE" ]]; then
        log_info "复制环境配置文件..."
        cp "$DEPLOY_DIR/.env.example" "$ENV_FILE"
        log_success "环境配置文件已创建: $ENV_FILE"
        log_warning "请根据需要修改 $ENV_FILE 中的配置"
    else
        log_info "环境配置文件已存在，跳过创建"
    fi
}

# 生成随机密钥
generate_secrets() {
    log_info "生成安全密钥..."

    # 生成随机密钥
    local secret_key=$(openssl rand -hex 32)
    local encryption_key=$(openssl rand -hex 32)

    # 更新 .env 文件中的密钥
    if [[ -f "$ENV_FILE" ]]; then
        sed -i "s/^SECRET_KEY=.*/SECRET_KEY=$secret_key/" "$ENV_FILE"
        sed -i "s/^ENCRYPTION_KEY=.*/ENCRYPTION_KEY=$encryption_key/" "$ENV_FILE"
        log_success "安全密钥已更新"
    fi
}

# 构建镜像
build_images() {
    log_info "构建 Docker 镜像..."

    cd "$DEPLOY_DIR"

    # 使用 docker compose 或 docker-compose
    if docker compose version &> /dev/null; then
        docker compose build --no-cache
    else
        docker-compose build --no-cache
    fi

    log_success "Docker 镜像构建完成"
}

# 启动服务
start_services() {
    log_info "启动 Dify 服务..."

    cd "$DEPLOY_DIR"

    # 使用 docker compose 或 docker-compose
    if docker compose version &> /dev/null; then
        docker compose up -d
    else
        docker-compose up -d
    fi

    log_success "Dify 服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."

    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f http://localhost/health &> /dev/null; then
            log_success "服务已就绪"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done

    log_error "服务启动超时"
    return 1
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    cd "$DEPLOY_DIR"

    # 使用 docker compose 或 docker-compose
    if docker compose version &> /dev/null; then
        docker compose ps
    else
        docker-compose ps
    fi
}

# 显示访问信息
show_access_info() {
    log_success "部署完成！"
    echo
    echo "访问信息:"
    echo "  Web 界面: http://localhost"
    echo "  API 文档: http://localhost/docs"
    echo "  健康检查: http://localhost/health"
    echo
    echo "管理命令:"
    echo "  查看日志: cd $DEPLOY_DIR && docker compose logs -f"
    echo "  停止服务: cd $DEPLOY_DIR && docker compose down"
    echo "  重启服务: cd $DEPLOY_DIR && docker compose restart"
    echo "  更新服务: cd $DEPLOY_DIR && docker compose pull && docker compose up -d"
    echo
    echo "配置文件位置: $ENV_FILE"
    echo "数据目录: $PROJECT_DIR/volumes"
    echo
    log_warning "请确保已配置 .env 文件中的 API 密钥和其他必要设置"
}

# 清理函数
cleanup() {
    log_info "清理资源..."
    cd "$DEPLOY_DIR"

    # 使用 docker compose 或 docker-compose
    if docker compose version &> /dev/null; then
        docker compose down --remove-orphans
    else
        docker-compose down --remove-orphans
    fi

    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "Dify AlmaLinux 9 部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --clean    清理现有服务"
    echo "  -b, --build    强制重新构建镜像"
    echo "  -s, --skip-build 跳过镜像构建"
    echo "  -e, --env-only 仅设置环境配置"
    echo
    echo "示例:"
    echo "  $0                # 完整部署"
    echo "  $0 -c             # 清理服务"
    echo "  $0 -b             # 重新构建并部署"
    echo "  $0 -e             # 仅设置环境"
}

# 主函数
main() {
    local clean_only=false
    local force_build=false
    local skip_build=false
    local env_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--clean)
                clean_only=true
                shift
                ;;
            -b|--build)
                force_build=true
                shift
                ;;
            -s|--skip-build)
                skip_build=true
                shift
                ;;
            -e|--env-only)
                env_only=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 显示开始信息
    echo "=========================================================="
    echo "    Dify AlmaLinux 9 快速部署脚本"
    echo "=========================================================="
    echo

    # 执行清理
    if [[ "$clean_only" == true ]]; then
        cleanup
        exit 0
    fi

    # 仅设置环境
    if [[ "$env_only" == true ]]; then
        check_root
        create_directories
        setup_environment
        generate_secrets
        show_access_info
        exit 0
    fi

    # 完整部署流程
    check_root
    check_system
    install_dependencies
    create_directories
    setup_environment
    generate_secrets

    if [[ "$skip_build" != true ]]; then
        if [[ "$force_build" == true ]]; then
            build_images
        else
            # 检查镜像是否存在
            if ! docker images | grep -q "almalinux9"; then
                build_images
            else
                log_info "Docker 镜像已存在，跳过构建 (使用 -b 强制重新构建)"
            fi
        fi
    fi

    start_services

    # 等待服务就绪
    if wait_for_services; then
        check_services
        show_access_info
    else
        log_error "部署失败，请检查日志"
        cd "$DEPLOY_DIR"
        if docker compose version &> /dev/null; then
            docker compose logs
        else
            docker-compose logs
        fi
        exit 1
    fi
}

# 捕获中断信号
trap 'log_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"