#!/bin/bash

# ============================================================================
# Dify AlmaLinux 9 系统依赖安装脚本
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

# 检查是否为 root 用户
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要 root 权限运行，请使用 sudo"
        exit 1
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    dnf update -y
    log_success "系统更新完成"
}

# 安装基础工具
install_base_tools() {
    log_info "安装基础工具..."
    dnf groupinstall -y "Development Tools"
    dnf install -y \
        curl \
        wget \
        git \
        unzip \
        tar \
        htop \
        vim \
        nano \
        tree \
        lsof \
        net-tools \
        telnet \
        nc \
        jq \
        gnupg
    log_success "基础工具安装完成"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装，跳过..."
        return 0
    fi

    log_info "安装 Docker..."

    # 添加 Docker 仓库
    dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo

    # 安装 Docker
    dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    # 启动并启用 Docker 服务
    systemctl start docker
    systemctl enable docker

    # 添加当前用户到 docker 组（如果不是 root）
    if [[ "$SUDO_USER" != "" ]]; then
        usermod -aG docker "$SUDO_USER"
        log_info "用户 $SUDO_USER 已添加到 docker 组"
        log_warning "请重新登录以使用户组生效"
    fi

    log_success "Docker 安装完成"
}

# 安装 Docker Compose
install_docker_compose() {
    # 检查是否已安装 Docker Compose（通过插件或独立安装）
    if docker compose version &> /dev/null || command -v docker-compose &> /dev/null; then
        log_info "Docker Compose 已安装，跳过..."
        return 0
    fi

    log_info "安装 Docker Compose..."

    # 获取最新版本
    local DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep -Po '"tag_name": "\K.*?(?=")')

    # 下载并安装
    curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

    # 设置执行权限
    chmod +x /usr/local/bin/docker-compose

    # 创建符号链接
    ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose

    log_success "Docker Compose 安装完成: $(docker-compose version)"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."

    # 检查防火墙状态
    if systemctl is-active --quiet firewalld; then
        # 开放必要端口
        firewall-cmd --permanent --add-port=80/tcp
        firewall-cmd --permanent --add-port=443/tcp
        firewall-cmd --permanent --add-port=3000/tcp
        firewall-cmd --permanent --add-port=5001/tcp

        # 重新加载防火墙规则
        firewall-cmd --reload

        log_success "防火墙配置完成"
    else
        log_warning "防火墙未运行，跳过配置"
    fi
}

# 配置系统优化
optimize_system() {
    log_info "配置系统优化..."

    # 增加文件描述符限制
    cat >> /etc/security/limits.conf << EOF
# Docker 容器优化
* soft nofile 65536
* hard nofile 65536
root soft nofile 65536
root hard nofile 65536
EOF

    # 优化内核参数
    cat > /etc/sysctl.d/99-dify-optimization.conf << EOF
# 网络优化
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.ipv4.tcp_congestion_control = bbr

# 内存优化
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5

# 文件系统优化
fs.file-max = 1048576
fs.inotify.max_user_watches = 524288
EOF

    # 应用内核参数
    sysctl --system

    log_success "系统优化配置完成"
}

# 安装监控工具（可选）
install_monitoring_tools() {
    log_info "安装监控工具..."

    # 安装 htop（如果未安装）
    dnf install -y htop iotop

    # 安装 Docker 监控脚本
    cat > /usr/local/bin/dify-monitor << 'EOF'
#!/bin/bash

echo "=== Dify 容器状态 ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo -e "\n=== 系统资源使用 ==="
echo "CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)"
echo "内存: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "磁盘: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" $5 " used)"}')"

echo -e "\n=== Docker 磁盘使用 ==="
docker system df

echo -e "\n=== 容器资源使用 ==="
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
EOF

    chmod +x /usr/local/bin/dify-monitor

    log_success "监控工具安装完成"
}

# 创建服务管理脚本
create_service_scripts() {
    log_info "创建服务管理脚本..."

    # Dify 服务管理脚本
    cat > /usr/local/bin/dify-service << 'EOF'
#!/bin/bash

DIFY_DIR="/opt/dify/almalinux9"

case "$1" in
    start)
        echo "启动 Dify 服务..."
        cd "$DIFY_DIR" && docker compose up -d
        ;;
    stop)
        echo "停止 Dify 服务..."
        cd "$DIFY_DIR" && docker compose down
        ;;
    restart)
        echo "重启 Dify 服务..."
        cd "$DIFY_DIR" && docker compose restart
        ;;
    status)
        echo "Dify 服务状态:"
        cd "$DIFY_DIR" && docker compose ps
        ;;
    logs)
        echo "Dify 服务日志:"
        cd "$DIFY_DIR" && docker compose logs -f
        ;;
    update)
        echo "更新 Dify 服务..."
        cd "$DIFY_DIR" && docker compose pull && docker compose up -d
        ;;
    clean)
        echo "清理 Dify 服务..."
        cd "$DIFY_DIR" && docker compose down --remove-orphans
        docker system prune -f
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs|update|clean}"
        exit 1
        ;;
esac
EOF

    chmod +x /usr/local/bin/dify-service

    log_success "服务管理脚本创建完成"
}

# 验证安装
verify_installation() {
    log_info "验证安装..."

    # 检查 Docker
    if docker --version &> /dev/null; then
        log_success "Docker: $(docker --version)"
    else
        log_error "Docker 安装失败"
        return 1
    fi

    # 检查 Docker Compose
    if docker compose version &> /dev/null; then
        log_success "Docker Compose: $(docker compose version)"
    elif docker-compose --version &> /dev/null; then
        log_success "Docker Compose: $(docker-compose --version)"
    else
        log_error "Docker Compose 安装失败"
        return 1
    fi

    # 测试 Docker
    if docker run --rm hello-world &> /dev/null; then
        log_success "Docker 测试通过"
    else
        log_error "Docker 测试失败"
        return 1
    fi

    log_success "安装验证完成"
}

# 显示安装完成信息
show_completion_info() {
    log_success "系统依赖安装完成！"
    echo
    echo "已安装的组件:"
    echo "  - Docker Engine"
    echo "  - Docker Compose"
    echo "  - 基础开发工具"
    echo "  - 系统优化配置"
    echo "  - 监控工具"
    echo
    echo "可用的管理命令:"
    echo "  dify-monitor    - 查看 Dify 服务状态"
    echo "  dify-service    - 管理 Dify 服务"
    echo
    echo "下一步:"
    echo "  1. 创建项目目录: mkdir -p /opt/dify"
    echo "  2. 复制项目文件到 /opt/dify"
    echo "  3. 运行部署脚本: cd /opt/dify/almalinux9 && ./deploy.sh"
    echo
    if [[ "$SUDO_USER" != "" ]]; then
        log_warning "请重新登录以使用户组设置生效"
    fi
}

# 显示帮助信息
show_help() {
    echo "Dify AlmaLinux 9 系统依赖安装脚本"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  --no-docker    跳过 Docker 安装"
    echo "  --no-firewall  跳过防火墙配置"
    echo "  --minimal      最小化安装（仅基础工具）"
    echo
}

# 主函数
main() {
    local install_docker=true
    local configure_firewall=true
    local minimal_install=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --no-docker)
                install_docker=false
                shift
                ;;
            --no-firewall)
                configure_firewall=false
                shift
                ;;
            --minimal)
                minimal_install=true
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
    echo "    Dify AlmaLinux 9 系统依赖安装脚本"
    echo "=========================================================="
    echo

    # 执行安装流程
    check_root
    update_system
    install_base_tools

    if [[ "$minimal_install" != true ]]; then
        optimize_system
        install_monitoring_tools
        create_service_scripts
    fi

    if [[ "$install_docker" == true ]]; then
        install_docker
        install_docker_compose
    fi

    if [[ "$configure_firewall" == true ]]; then
        configure_firewall
    fi

    verify_installation
    show_completion_info
}

# 捕获中断信号
trap 'log_error "安装被中断"; exit 1' INT TERM

# 执行主函数
main "$@"