#!/bin/bash

# ============================================================================
# Dify AlmaLinux 9 自动化部署脚本（自动检测IP）
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

# 生成环境配置文件
generate_env_file() {
    local server_ip="$1"

    log_info "生成环境配置文件..."

    if [[ -f "$ENV_FILE" ]]; then
        log_warning "环境配置文件已存在，将备份并重新生成"
        cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # 基于模板生成配置文件
    if [[ -f "$DEPLOY_DIR/.env.template" ]]; then
        sed "s#YOUR_SERVER_IP_HERE#$server_ip#g" "$DEPLOY_DIR/.env.template" > "$ENV_FILE"
        log_success "基于模板生成配置文件: $ENV_FILE"
    else
        # 直接创建配置文件
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

# 前端访问地址
CONSOLE_API_URL=http://$server_ip:5001
CONSOLE_WEB_URL=http://$server_ip:3000
APP_API_URL=http://$server_ip:5001
APP_WEB_URL=http://$server_ip:3000

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
        log_success "直接生成配置文件: $ENV_FILE"
    fi

    # 显示生成的配置
    log_info "生成的IP配置:"
    grep -E "(CONSOLE_API_URL|APP_API_URL)" "$ENV_FILE"
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

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    cd "$DEPLOY_DIR"

    if docker compose version &> /dev/null; then
        docker compose -f "$COMPOSE_FILE" ps
    else
        docker-compose -f "$COMPOSE_FILE" ps
    fi
}

# 显示访问信息
show_access_info() {
    local server_ip="$1"

    log_success "自动化部署完成！"
    echo
    echo "访问信息:"
    echo "  Web 界面: http://$server_ip:3000"
    echo "  API 服务: http://$server_ip:5001"
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
    log_warning "如需修改IP地址，请编辑 $ENV_FILE 文件后重启服务"
    log_warning "请确保已配置 $ENV_FILE 文件中的 OPENAI_API_KEY"
}

# 显示帮助信息
show_help() {
    echo "Dify AlmaLinux 9 自动化部署脚本"
    echo
    echo "用法: $0 [选项] [服务器IP]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -i, --ip       指定服务器IP地址"
    echo "  -p, --pull     仅拉取镜像"
    echo "  -b, --build    仅构建品牌前端"
    echo "  -e, --env-only 仅生成环境配置"
    echo
    echo "示例:"
    echo "  $0                    # 自动检测IP并完整部署"
    echo "  $0 10.81.97.39        # 使用指定IP部署"
    echo "  $0 -i 192.168.1.100   # 使用指定IP部署"
    echo "  $0 -e                 # 仅生成环境配置"
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
    echo "    Dify AlmaLinux 9 自动化部署"
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
        generate_env_file "$server_ip"
        build_brand_image
        exit 0
    fi

    # 仅生成环境配置
    if [[ "$env_only" == true ]]; then
        check_root
        create_directories
        generate_env_file "$server_ip"
        log_success "环境配置已生成: $ENV_FILE"
        exit 0
    fi

    # 完整部署流程
    check_root
    check_system
    create_directories
    generate_env_file "$server_ip"
    pull_official_images
    build_brand_image
    start_services
    check_services
    show_access_info "$server_ip"
}

# 捕获中断信号
trap 'log_error "部署被中断"; exit 1' INT TERM

# 执行主函数
main "$@"