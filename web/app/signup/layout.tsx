'use client'

import { useGlobalPublicStore } from '@/context/global-public-context'
import useDocumentTitle from '@/hooks/use-document-title'

export default function RegisterLayout({ children }: any) {
  const { systemFeatures } = useGlobalPublicStore()
  useDocumentTitle('')
  return <>
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-purple-50 px-6 py-12">
      {/* 装饰性背景元素 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* 左上角紫色光斑 */}
        <div className="absolute left-0 top-0 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-400/30 opacity-60 blur-3xl"></div>
        {/* 右下角蓝色光斑 */}
        <div className="absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full bg-blue-300/25 opacity-50 blur-3xl"></div>
        {/* 右侧粉色光斑 */}
        <div className="absolute right-1/4 top-1/2 h-64 w-64 -translate-y-1/4 translate-x-1/4 rounded-full bg-pink-300/20 opacity-40 blur-3xl"></div>
      </div>

      {/* 主内容区 */}
      <div className="relative w-full max-w-md">
        {children}

        {/* Footer */}
        {!systemFeatures.branding.enabled && (
          <div className="mt-8 text-center">
            <div className="text-xs text-gray-400">
              <div>© {new Date().getFullYear()} Coop, Inc. All rights reserved.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  </>
}
