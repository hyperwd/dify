#!/bin/bash

# ============================================================================
# Dify 快速 Git 提交脚本
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 获取当前分支名
get_current_branch() {
    git branch --show-current
}

# 检查是否有未提交的更改
check_changes() {
    if [[ -z $(git status --porcelain) ]]; then
        log_warning "没有检测到任何更改，无需提交"
        exit 0
    fi
}

# 生成提交信息
generate_commit_message() {
    local branch=$(get_current_branch)
    local changes=$(git status --porcelain)

    # 基于分支名和更改内容生成提交信息
    case $branch in
        feature/*|feat/*)
            echo "feat$(echo "$branch" | sed 's/[^a-z0-9-]//g'): Add $(get_change_summary "$changes")"
            ;;
        fix/*|bugfix/*)
            echo "fix$(echo "$branch" | sed 's/[^a-z0-9-]//g'): Fix $(get_change_summary "$changes")"
            ;;
        hotfix/*)
            echo "hotfix$(echo "$branch" | sed 's/[^a-z0-9-]//g'): Fix $(get_change_summary "$changes")"
            ;;
        docs/*)
            echo "docs$(echo "$branch" | sed 's/[^a-z0-9-]//g'): Update $(get_change_summary "$changes")"
            ;;
        *)
            echo "chore$(echo "$branch" | sed 's/[^a-z0-9-]//g'): $(get_change_summary "$changes")"
            ;;
    esac
}

# 获取更改摘要
get_change_summary() {
    local changes="$1"
    local summary=""

    # 分析更改类型
    if echo "$changes" | grep -q "Dockerfile\|docker-compose\|\.sh$"; then
        summary="$summary deployment configuration"
    fi

    if echo "$changes" | grep -q "\.md$|README\|\.yaml$|\.yml$"; then
        [[ -n "$summary" ]] && summary="$summary and documentation" || summary="documentation"
    fi

    if echo "$changes" | grep -q "\.env\|nginx\|config"; then
        [[ -n "$summary" ]] && summary="$summary and configuration" || summary="configuration"
    fi

    if [[ -z "$summary" ]]; then
        summary="files"
    fi

    echo "$summary"
}

# 快速提交函数
quick_commit() {
    local custom_message="$1"

    log_info "执行快速 Git 提交..."

    # 检查是否在 Git 仓库中
    if ! git rev-parse --git-head > /dev/null 2>&1; then
        log_error "当前目录不是 Git 仓库"
        exit 1
    fi

    # 检查更改
    check_changes

    # 获取当前状态
    local branch=$(get_current_branch)
    log_info "当前分支: $branch"

    # 显示更改概览
    log_info "即将提交的更改:"
    git status --short

    # 生成或使用自定义提交信息
    local commit_message
    if [[ -n "$custom_message" ]]; then
        commit_message="$custom_message"
    else
        commit_message=$(generate_commit_message)
    fi

    echo
    log_info "提交信息: $commit_message"

    # 确认提交
    read -p "确认提交? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        # 添加所有更改
        log_info "添加所有更改到暂存区..."
        git add .

        # 提交
        log_info "创建提交..."
        git commit -m "$commit_message"

        log_success "提交成功!"

        # 询问是否推送
        read -p "是否推送到远程仓库? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "推送到远程仓库..."
            git push origin "$branch"
            log_success "推送成功!"
        fi
    else
        log_info "取消提交"
        exit 0
    fi
}

# 显示帮助信息
show_help() {
    echo "Dify 快速 Git 提交脚本"
    echo
    echo "用法: $0 [选项] [提交信息]"
    echo
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -s, --status   仅显示当前状态"
    echo "  -l, --log      显示最近提交"
    echo "  -a, --all      提交所有更改（默认）"
    echo
    echo "示例:"
    echo "  $0                          # 自动生成提交信息并提交"
    echo "  $0 \"Add new feature\"       # 使用自定义提交信息"
    echo "  $0 -s                       # 仅显示状态"
    echo "  $0 -l                       # 显示提交历史"
    echo
}

# 显示 Git 状态
show_status() {
    log_info "Git 状态:"
    echo "------------------------------------------------"
    git status
    echo "------------------------------------------------"

    if [[ -n $(git status --porcelain) ]]; then
        log_info "文件更改:"
        git status --short
    fi
}

# 显示提交历史
show_log() {
    log_info "最近提交:"
    echo "------------------------------------------------"
    git log --oneline -10
    echo "------------------------------------------------"
}

# 主函数
main() {
    local show_status_only=false
    local show_log_only=false

    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -s|--status)
                show_status_only=true
                shift
                ;;
            -l|--log)
                show_log_only=true
                shift
                ;;
            -a|--all)
                shift  # 默认行为，不需要特殊处理
                ;;
            -*)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
            *)
                # 剩余参数作为提交信息
                break
                ;;
        esac
    done

    # 显示 Git 信息
    echo "=========================================================="
    echo "    Dify 快速 Git 提交"
    echo "=========================================================="
    echo

    # 检查是否在 Git 仓库中
    if ! git rev-parse --git-head > /dev/null 2>&1; then
        log_error "当前目录不是 Git 仓库"
        exit 1
    fi

    # 仅显示状态
    if [[ "$show_status_only" == true ]]; then
        show_status
        exit 0
    fi

    # 仅显示日志
    if [[ "$show_log_only" == true ]]; then
        show_log
        exit 0
    fi

    # 执行快速提交
    quick_message="$*"
    quick_commit "$quick_message"
}

# 执行主函数
main "$@"