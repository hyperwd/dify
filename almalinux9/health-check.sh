#!/bin/bash

# ============================================================================
# Dify 健康检查和监控脚本
# ============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yaml"
LOG_FILE="$SCRIPT_DIR/health-check.log"
ALERT_EMAIL=""  # 可选：设置警报邮件地址
WEBHOOK_URL=""  # 可选：设置 webhook 地址

# 服务配置
declare -A SERVICES=(
    ["nginx"]="80"
    ["api"]="5001"
    ["web"]="3000"
    ["db"]="5432"
    ["redis"]="6379"
    ["weaviate"]="8080"
    ["sandbox"]="8194"
)

# 健康检查端点
declare -A HEALTH_ENDPOINTS=(
    ["nginx"]="/health"
    ["api"]="/health"
    ["web"]="/"
)

# 日志函数
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
    log_message "INFO" "$1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    log_message "SUCCESS" "$1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    log_message "WARNING" "$1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    log_message "ERROR" "$1"
}

# 发送警报
send_alert() {
    local subject=$1
    local message=$2

    # 发送邮件（如果配置了邮件地址）
    if [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi

    # 发送 webhook（如果配置了 webhook）
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\":\"$subject: $message\"}" \
            &>/dev/null || true
    fi
}

# 检查 Docker 服务状态
check_docker_services() {
    log_info "检查 Docker 服务状态..."

    local failed_services=()

    cd "$SCRIPT_DIR"

    # 获取所有容器状态
    local containers=$(docker compose ps --format json | jq -r '.Service' 2>/dev/null || docker compose ps --format '{{.Service}}')

    for service in $containers; do
        local status=$(docker compose ps --format json | jq -r ". | select(.Service==\"$service\") | .State" 2>/dev/null || echo "unknown")

        if [[ "$status" == "running" ]]; then
            log_success "$service: 运行中"
        else
            log_error "$service: $status"
            failed_services+=("$service")
        fi
    done

    if [[ ${#failed_services[@]} -gt 0 ]]; then
        local alert_msg="以下服务异常: ${failed_services[*]}"
        send_alert "Dify 服务异常" "$alert_msg"
        return 1
    fi

    return 0
}

# 检查端口连通性
check_port_connectivity() {
    log_info "检查端口连通性..."

    local failed_ports=()

    for service in "${!SERVICES[@]}"; do
        local port=${SERVICES[$service]}

        if nc -z localhost "$port" 2>/dev/null; then
            log_success "$service (端口 $port): 连接正常"
        else
            log_error "$service (端口 $port): 连接失败"
            failed_ports+=("$service:$port")
        fi
    done

    if [[ ${#failed_ports[@]} -gt 0 ]]; then
        local alert_msg="以下端口无法连接: ${failed_ports[*]}"
        send_alert "Dify 端口连接异常" "$alert_msg"
        return 1
    fi

    return 0
}

# 检查 HTTP 端点
check_http_endpoints() {
    log_info "检查 HTTP 健康端点..."

    local failed_endpoints=()

    for service in "${!HEALTH_ENDPOINTS[@]}"; do
        local endpoint=${HEALTH_ENDPOINTS[$service]}
        local port=${SERVICES[$service]}
        local url="http://localhost:$port$endpoint"

        if curl -f -s --max-time 10 "$url" &>/dev/null; then
            log_success "$service$endpoint: HTTP 响应正常"
        else
            log_error "$service$endpoint: HTTP 响应异常"
            failed_endpoints+=("$service$endpoint")
        fi
    done

    if [[ ${#failed_endpoints[@]} -gt 0 ]]; then
        local alert_msg="以下 HTTP 端点异常: ${failed_endpoints[*]}"
        send_alert "Dify HTTP 端点异常" "$alert_msg"
        return 1
    fi

    return 0
}

# 检查系统资源
check_system_resources() {
    log_info "检查系统资源..."

    # CPU 使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local cpu_num=$(echo "$cpu_usage" | bc -l 2>/dev/null || echo "0")

    if (( $(echo "$cpu_num > 80" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "CPU 使用率过高: ${cpu_usage}%"
    else
        log_success "CPU 使用率: ${cpu_usage}%"
    fi

    # 内存使用率
    local mem_info=$(free | grep Mem)
    local mem_total=$(echo $mem_info | awk '{print $2}')
    local mem_used=$(echo $mem_info | awk '{print $3}')
    local mem_usage=$(echo "scale=1; $mem_used * 100 / $mem_total" | bc 2>/dev/null || echo "0")

    if (( $(echo "$mem_usage > 85" | bc -l 2>/dev/null || echo "0") )); then
        log_warning "内存使用率过高: ${mem_usage}%"
    else
        log_success "内存使用率: ${mem_usage}%"
    fi

    # 磁盘使用率
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)

    if [[ $disk_usage -gt 85 ]]; then
        log_warning "磁盘使用率过高: ${disk_usage}%"
        send_alert "Dify 磁盘空间不足" "磁盘使用率: ${disk_usage}%"
    else
        log_success "磁盘使用率: ${disk_usage}%"
    fi

    # Docker 磁盘使用
    local docker_usage=$(docker system df --format "{{.Size}}" | head -1 | numfmt --from=iec 2>/dev/null || echo "0")
    log_info "Docker 磁盘使用: $(numfmt --to=iec $docker_usage 2>/dev/null || echo "未知")"
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."

    cd "$SCRIPT_DIR"

    # 检查 PostgreSQL
    if docker compose exec -T db pg_isready -U postgres &>/dev/null; then
        log_success "PostgreSQL: 连接正常"
    else
        log_error "PostgreSQL: 连接失败"
        return 1
    fi

    # 检查 Redis
    if docker compose exec -T redis redis-cli ping | grep -q "PONG"; then
        log_success "Redis: 连接正常"
    else
        log_error "Redis: 连接失败"
        return 1
    fi

    return 0
}

# 检查容器资源使用
check_container_resources() {
    log_info "检查容器资源使用..."

    cd "$SCRIPT_DIR"

    # 获取容器统计信息
    local stats=$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}")

    echo "$stats" | while IFS= read -r line; do
        if [[ "$line" != *"CONTAINER"* ]]; then
            local container=$(echo "$line" | awk '{print $1}')
            local cpu_perc=$(echo "$line" | awk '{print $2}')
            local mem_perc=$(echo "$line" | awk '{print $4}' | cut -d'%' -f1)

            # 移除百分号并转换为数字
            local cpu_num=$(echo "$cpu_perc" | cut -d'%' -f1)

            if [[ ${cpu_num%.*} -gt 80 ]]; then
                log_warning "$container: CPU 使用率过高 ${cpu_perc}"
            fi

            if [[ ${mem_perc%.*} -gt 85 ]]; then
                log_warning "$container: 内存使用率过高 ${mem_perc}%"
            fi
        fi
    done

    log_success "容器资源检查完成"
}

# 检查日志错误
check_log_errors() {
    log_info "检查最近的错误日志..."

    cd "$SCRIPT_DIR"

    # 检查各服务的错误日志（最近 10 分钟）
    local since_time="10m"
    local error_count=0

    for service in "${!SERVICES[@]}"; do
        local errors=$(docker compose logs --since="$since_time" "$service" 2>&1 | grep -i "error\|exception\|failed" | wc -l)

        if [[ $errors -gt 0 ]]; then
            log_warning "$service: 发现 $errors 个错误日志"
            error_count=$((error_count + errors))
        fi
    done

    if [[ $error_count -gt 10 ]]; then
        log_error "检测到大量错误日志 ($error_count)，建议检查"
        send_alert "Dify 错误日志异常" "最近 10 分钟内发现 $error_count 个错误日志"
    else
        log_success "错误日志检查完成 ($error_count 个错误)"
    fi
}

# 生成健康报告
generate_health_report() {
    log_info "生成健康报告..."

    local report_file="$SCRIPT_DIR/health-report-$(date +%Y%m%d-%H%M%S).txt"

    {
        echo "=========================================================="
        echo "    Dify 健康检查报告"
        echo "=========================================================="
        echo "检查时间: $(date)"
        echo "主机名: $(hostname)"
        echo ""

        echo "=== 系统信息 ==="
        echo "操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '"')"
        echo "内核版本: $(uname -r)"
        echo "运行时间: $(uptime -p)"
        echo ""

        echo "=== 系统资源 ==="
        echo "CPU 使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo "内存使用: $(free -h | awk '/^Mem:/ {print $3 "/" $2 " (" int($3/$2 * 100) "%)"}')"
        echo "磁盘使用: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 ")"}')"
        echo ""

        echo "=== Docker 服务状态 ==="
        cd "$SCRIPT_DIR"
        docker compose ps
        echo ""

        echo "=== 容器资源使用 ==="
        docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
        echo ""

        echo "=== 最近的错误日志 ==="
        docker compose logs --since=1h 2>&1 | grep -i "error\|exception\|failed" | tail -10

    } > "$report_file"

    log_success "健康报告已生成: $report_file"
}

# 清理旧日志
cleanup_old_logs() {
    log_info "清理旧的检查日志..."

    # 保留最近 7 天的日志
    find "$SCRIPT_DIR" -name "health-check.log" -mtime +7 -delete 2>/dev/null || true
    find "$SCRIPT_DIR" -name "health-report-*.txt" -mtime +7 -delete 2>/dev/null || true

    log_success "日志清理完成"
}

# 显示帮助信息
show_help() {
    echo "Dify 健康检查和监控脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "检查选项:"
    echo "  --services        仅检查 Docker 服务状态"
    echo "  --ports           仅检查端口连通性"
    echo "  --http            仅检查 HTTP 端点"
    echo "  --resources       仅检查系统资源"
    echo "  --database        仅检查数据库连接"
    echo "  --containers      仅检查容器资源"
    echo "  --logs            仅检查错误日志"
    echo
    echo "其他选项:"
    echo "  -h, --help        显示帮助信息"
    echo "  --report          生成详细健康报告"
    echo "  --cleanup         清理旧日志文件"
    echo "  --watch           持续监控模式（每5分钟检查一次）"
    echo "  --alert-email     设置警报邮件地址"
    echo "  --webhook         设置警报 webhook 地址"
    echo
    echo "示例:"
    echo "  $0                # 执行完整健康检查"
    echo "  $0 --services     # 仅检查服务状态"
    echo "  $0 --watch        # 持续监控"
    echo "  $0 --report       # 生成健康报告"
}

# 持续监控模式
watch_mode() {
    log_info "启动持续监控模式（每5分钟检查一次）..."

    while true; do
        echo
        log_info "执行健康检查... $(date)"

        if run_all_checks; then
            log_success "所有检查通过"
        else
            log_error "发现问题，请查看日志"
        fi

        echo "等待 5 分钟..."
        sleep 300
    done
}

# 运行所有检查
run_all_checks() {
    local all_passed=true

    check_docker_services || all_passed=false
    check_port_connectivity || all_passed=false
    check_http_endpoints || all_passed=false
    check_database_connection || all_passed=false
    check_system_resources
    check_container_resources
    check_log_errors

    return $([[ "$all_passed" == true ]] && echo 0 || echo 1)
}

# 主函数
main() {
    local check_services=false
    local check_ports=false
    local check_http=false
    local check_resources=false
    local check_database=false
    local check_containers=false
    local check_logs=false
    local generate_report=false
    local cleanup_only=false
    local watch_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --services)
                check_services=true
                shift
                ;;
            --ports)
                check_ports=true
                shift
                ;;
            --http)
                check_http=true
                shift
                ;;
            --resources)
                check_resources=true
                shift
                ;;
            --database)
                check_database=true
                shift
                ;;
            --containers)
                check_containers=true
                shift
                ;;
            --logs)
                check_logs=true
                shift
                ;;
            --report)
                generate_report=true
                shift
                ;;
            --cleanup)
                cleanup_only=true
                shift
                ;;
            --watch)
                watch_only=true
                shift
                ;;
            --alert-email)
                ALERT_EMAIL="$2"
                shift 2
                ;;
            --webhook)
                WEBHOOK_URL="$2"
                shift 2
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
    echo "    Dify 健康检查和监控"
    echo "=========================================================="
    echo

    # 仅清理
    if [[ "$cleanup_only" == true ]]; then
        cleanup_old_logs
        exit 0
    fi

    # 持续监控
    if [[ "$watch_only" == true ]]; then
        watch_mode
        exit 0
    fi

    # 创建日志目录
    mkdir -p "$(dirname "$LOG_FILE")"

    # 执行指定的检查
    local any_check=false

    if [[ "$check_services" == true ]]; then
        check_docker_services
        any_check=true
    fi

    if [[ "$check_ports" == true ]]; then
        check_port_connectivity
        any_check=true
    fi

    if [[ "$check_http" == true ]]; then
        check_http_endpoints
        any_check=true
    fi

    if [[ "$check_resources" == true ]]; then
        check_system_resources
        any_check=true
    fi

    if [[ "$check_database" == true ]]; then
        check_database_connection
        any_check=true
    fi

    if [[ "$check_containers" == true ]]; then
        check_container_resources
        any_check=true
    fi

    if [[ "$check_logs" == true ]]; then
        check_log_errors
        any_check=true
    fi

    # 如果没有指定特定检查，运行所有检查
    if [[ "$any_check" == false ]]; then
        if run_all_checks; then
            log_success "所有健康检查通过"
        else
            log_error "健康检查发现问题"
        fi
    fi

    # 生成报告
    if [[ "$generate_report" == true ]]; then
        generate_health_report
    fi

    # 清理
    cleanup_old_logs

    echo
    log_info "健康检查完成，日志保存在: $LOG_FILE"
}

# 捕获中断信号
trap 'log_error "检查被中断"; exit 1' INT TERM

# 执行主函数
main "$@"