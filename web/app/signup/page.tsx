'use client'
import { useCallback } from 'react'
import Link from 'next/link'
import MailForm from './components/input-mail'
import { useRouter, useSearchParams } from 'next/navigation'

const Signup = () => {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleInputMailSubmitted = useCallback((email: string, result: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('token', encodeURIComponent(result))
    params.set('email', encodeURIComponent(email))
    router.push(`/signup/check-code?${params.toString()}`)
  }, [router, searchParams])

  return (
    <>
      {/* Logo Section */}
      <div className="mb-8 text-center">
        <img
          src="/logo-coop.png"
          alt="Coop Logo"
          className="mx-auto mb-4 h-16 w-auto object-contain"
        />
        <h3 className="text-xl font-semibold text-gray-900">创建您的账户</h3>
        <p className="mt-2 text-sm text-gray-500">开始您的 Coop 之旅</p>
      </div>

      {/* Form Container */}
      <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
        <MailForm onSuccess={handleInputMailSubmitted} />
      </div>

      {/* Bottom Link */}
      <div className='mt-6 text-center text-sm text-gray-600'>
        <span>已有账户？</span>
        <Link
          className='ml-1 font-medium text-purple-600 transition-colors hover:text-purple-700'
          href='/signin'
        >立即登录</Link>
      </div>
    </>
  )
}

export default Signup
