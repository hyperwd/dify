'use client'
import React from 'react'
import InstallForm from './installForm'
import { useGlobalPublicStore } from '@/context/global-public-context'

const Install = () => {
  const { systemFeatures } = useGlobalPublicStore()
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      {/* 背景装饰 - 左上角和右下角的弥散光效果 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 左上角紫色光斑 */}
        <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/30 opacity-60 blur-3xl"></div>
        {/* 右下角蓝色光斑 */}
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-blue-300/25 opacity-50 blur-3xl"></div>
        {/* 右侧粉色光斑 */}
        <div className="absolute right-1/4 top-1/2 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-pink-300/20 opacity-40 blur-3xl"></div>
      </div>

      {/* 主内容区域 - 中心居中布局 */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        {/* 中心卡片 */}
        <div className="w-full max-w-md">
          {/* Logo 区域 */}
          <div className="mb-8 text-center">
            <img
              src="/logo.png"
              alt="Coop Logo"
              className="mx-auto h-16 w-auto object-contain"
            />
          </div>

          {/* 卡片容器 */}
          <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            {/* 标题区域 */}
            <div className="mb-8 text-center">
              <h1 className="mb-2 text-2xl font-bold text-gray-900">设置管理员账户</h1>
              <p className="text-sm text-gray-500">请设计一套密码来保护 Coop。</p>
            </div>

            {/* 安装表单 */}
            <InstallForm />

            {/* 底部链接 */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                已有账户？
                <a href="/signin" className="ml-1 font-medium text-purple-600 transition-colors hover:text-purple-700">
                  直接登录
                </a>
              </p>
            </div>
          </div>

          {/* Footer */}
          {!systemFeatures.branding.enabled && (
            <div className='mt-8 text-center text-xs text-gray-400'>
              <div>© {new Date().getFullYear()} Coop, Inc. All rights reserved.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Install
