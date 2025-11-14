#!/bin/bash

# ============================================================================
# 快速修复部署问题
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$SCRIPT_DIR"

# 停止并清理容器
cleanup_containers() {
    log_info "停止并清理现有容器..."

    cd "$DEPLOY_DIR"

    # 停止服务
    docker compose -f docker-compose-brand.yaml down

    # 删除相关容器
    docker rm -f dify-api dify-worker dify-web dify-nginx dify-db dify-redis dify-weaviate dify-sandbox 2>/dev/null || true

    log_success "容器清理完成"
}

# 清理网络和镜像
cleanup_networks() {
    log_info "清理 Docker 网络..."

    # 删除相关网络
    docker network rm dify_almalinux9_dify-network 2>/dev/null || true

    # 清理未使用的网络
    docker network prune -f

    log_success "网络清理完成"
}

# 重新启动服务
restart_services() {
    log_info "重新启动服务..."

    cd "$DEPLOY_DIR"

    # 重新创建并启动服务
    docker compose -f docker-compose-brand.yaml up -d

    log_success "服务重新启动完成"
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."

    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        if docker compose -f docker-compose-brand.yaml ps | grep -q "Up.*healthy\|Up.*running"; then
            log_success "服务已启动"
            return 0
        fi

        attempt=$((attempt + 1))
        echo -n "."
        sleep 5
    done

    log_warning "服务可能还在启动中"
}

# 检查服务状态
check_services() {
    log_info "检查服务状态..."

    cd "$DEPLOY_DIR"

    echo "=== 容器状态 ==="
    docker compose -f docker-compose-brand.yaml ps

    echo -e "\n=== 最近日志 ==="
    docker compose -f docker-compose-brand.yaml logs --tail=20
}

# 测试连接
test_connections() {
    log_info "测试服务连接..."

    # 测试 Redis
    log_info "测试 Redis 连接..."
    if docker compose -f docker-compose-brand.yaml exec -T redis redis-cli ping 2>/dev/null | grep -q "PONG"; then
        log_success "Redis 连接正常"
    else
        log_error "Redis 连接失败"
    fi

    # 测试 PostgreSQL
    log_info "测试 PostgreSQL 连接..."
    if docker compose -f docker-compose-brand.yaml exec -T db pg_isready -U postgres 2>/dev/null; then
        log_success "PostgreSQL 连接正常"
    else
        log_error "PostgreSQL 连接失败"
    fi

    # 测试 Web 服务
    log_info "测试 Web 服务..."
    if curl -f http://localhost &>/dev/null; then
        log_success "Web 服务访问正常"
    else
        log_warning "Web 服务可能还在启动"
    fi
}

# 显示帮助信息
show_help() {
    echo "Dify 快速修复脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -c, --cleanup  仅清理容器"
    echo "  -r, --restart  仅重启服务"
    echo "  -s, --status   仅检查状态"
    echo "  -t, --test     仅测试连接"
    echo
    echo "示例:"
    echo "  $0              # 完整修复流程"
    echo "  $0 -s           # 检查服务状态"
    echo "  $0 -t           # 测试连接"
}

# 主函数
main() {
    local cleanup_only=false
    local restart_only=false
    local status_only=false
    local test_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -c|--cleanup)
                cleanup_only=true
                shift
                ;;
            -r|--restart)
                restart_only=true
                shift
                ;;
            -s|--status)
                status_only=true
                shift
                ;;
            -t|--test)
                test_only=true
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
    echo "    Dify 快速修复脚本"
    echo "=========================================================="
    echo

    # 仅清理
    if [[ "$cleanup_only" == true ]]; then
        cleanup_containers
        cleanup_networks
        exit 0
    fi

    # 仅重启
    if [[ "$restart_only" == true ]]; then
        restart_services
        wait_for_services
        exit 0
    fi

    # 仅检查状态
    if [[ "$status_only" == true ]]; then
        check_services
        exit 0
    fi

    # 仅测试连接
    if [[ "$test_only" == true ]]; then
        test_connections
        exit 0
    fi

    # 完整修复流程
    log_info "开始完整修复流程..."

    cleanup_containers
    cleanup_networks
    restart_services
    wait_for_services
    check_services
    test_connections

    log_success "修复完成！"
    echo
    echo "如果问题仍然存在，请查看详细日志："
    echo "docker compose -f docker-compose-brand.yaml logs -f"
}

# 执行主函数
main "$@"