#!/bin/bash

# ============================================================================
# Dify AlmaLinux 9 简化部署脚本（无密码版本）
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
COMPOSE_FILE="$DEPLOY_DIR/docker-compose-simple.yaml"
ENV_FILE="$DEPLOY_DIR/.env.simple"

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

# 设置环境配置
setup_environment() {
    log_info "设置环境配置..."

    if [[ ! -f "$ENV_FILE" ]]; then
        log_info "复制简化环境配置文件..."
        cp "$DEPLOY_DIR/.env.simple" "$ENV_FILE"
        log_success "环境配置文件已创建: $ENV_FILE"
    else
        log_info "环境配置文件已存在，跳过创建"
    fi

    # 设置 COMPOSE_FILE 环境变量
    export COMPOSE_FILE="$DEPLOY_DIR/docker-compose-simple.yaml"
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
    log_info "构建品牌前端镜像..."

    cd "$DEPLOY_DIR"

    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" build web
    else
        docker-compose -f "$COMPOSE_FILE" build web
    fi

    log_success "品牌前端镜像构建完成"
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

# 等待服务就绪
wait_for_services() {
    log_info "等待服务启动..."

    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f http://localhost:3000 &> /dev/null; then
            log_success "Web 服务已就绪"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 5
    done

    log_warning "Web 服务启动超时，但其他服务可能正常运行"
    return 1
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
    if curl -f http://localhost:3000 &>/dev/null; then
        log_success "✓ Web 服务访问正常"
    else
        log_warning "✗ Web 服务可能还在启动"
    fi
}

# 显示访问信息
show_access_info() {
    log_success "简化部署完成！"
    echo
    echo "访问信息:"
    echo "  Web 界面: http://localhost:3000"
    echo "  API 服务: http://localhost:3000/api"
    echo
    echo "管理命令:"
    echo "  查看状态: cd $DEPLOY_DIR && docker compose -f $COMPOSE_FILE ps"
    echo "  查看日志: cd $DEPLOY_DIR && docker compose -f $COMPOSE_FILE logs -f"
    echo "  停止服务: cd $DEPLOY_DIR && docker compose -f $COMPOSE_FILE down"
    echo "  重启服务: cd $DEPLOY_DIR && docker compose -f $COMPOSE_FILE restart"
    echo
    echo "配置文件位置: $ENV_FILE"
    echo "数据目录: $PROJECT_DIR/volumes"
    echo
    log_warning "请确保已配置 .env.simple 文件中的 OPENAI_API_KEY"
}

# 显示帮助信息
show_help() {
    echo "Dify AlmaLinux 9 简化部署脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -p, --pull     仅拉取镜像"
    echo "  -b, --build    仅构建品牌前端"
    echo "  -e, --env-only 仅设置环境配置"
    echo
    echo "示例:"
    echo "  $0                # 完整部署"
    echo "  $0 -p             # 仅拉取镜像"
    echo "  $0 -b             # 仅构建前端"
}

# 主函数
main() {
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
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done

    # 显示开始信息
    echo "=========================================================="
    echo "    Dify AlmaLinux 9 简化部署（无密码版本）"
    echo "=========================================================="
    echo

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
        setup_environment
        build_brand_image
        exit 0
    fi

    # 仅设置环境
    if [[ "$env_only" == true ]]; then
        check_root
        create_directories
        setup_environment
        show_access_info
        exit 0
    fi

    # 完整部署流程
    check_root
    check_system
    create_directories
    setup_environment
    pull_official_images
    build_brand_image
    start_services
    wait_for_services
    check_services
    show_access_info
}

# 捕获中断信号
trap 'log_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"