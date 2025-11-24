'use client'
import { useCallback, useState } from 'react'
import useSWR from 'swr'
import { useSearchParams } from 'next/navigation'
import { basePath } from '@/utils/var'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import Input from '../components/base/input'
import Button from '@/app/components/base/button'
import { changePasswordWithToken, verifyForgotPasswordToken } from '@/service/common'
import Toast from '@/app/components/base/toast'
import Loading from '@/app/components/base/loading'
import { validPassword } from '@/config'

const ChangePasswordForm = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const verifyTokenParams = {
    url: '/forgot-password/validity',
    body: { token },
  }
  const { data: verifyTokenRes, mutate: revalidateToken } = useSWR(verifyTokenParams, verifyForgotPasswordToken, {
    revalidateOnFocus: false,
  })

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const showErrorMessage = useCallback((message: string) => {
    Toast.notify({
      type: 'error',
      message,
    })
  }, [])

  const valid = useCallback(() => {
    if (!password.trim()) {
      showErrorMessage('密码不能为空')
      return false
    }
    if (!validPassword.test(password)) {
      showErrorMessage('密码格式无效，至少8位包含字母和数字')
      return false
    }
    if (password !== confirmPassword) {
      showErrorMessage('两次输入的密码不一致')
      return false
    }
    return true
  }, [password, confirmPassword, showErrorMessage])

  const handleChangePassword = useCallback(async () => {
    const token = searchParams.get('token') || ''

    if (!valid())
      return
    try {
      await changePasswordWithToken({
        url: '/forgot-password/resets',
        body: {
          token,
          new_password: password,
          password_confirm: confirmPassword,
        },
      })
      setShowSuccess(true)
    }
    catch {
      await revalidateToken()
    }
  }, [confirmPassword, password, revalidateToken, searchParams, valid])

  return (
    <>
      {!verifyTokenRes && <Loading />}
      {verifyTokenRes && !verifyTokenRes.is_valid && (
        <>
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <img
              src="/logo-coop.png"
              alt="Coop Logo"
              className="mx-auto mb-4 h-16 w-auto object-contain"
            />
            <h3 className="text-xl font-semibold text-gray-900">链接无效</h3>
            <p className="mt-2 text-sm text-gray-500">此重置链接已过期或无效</p>
          </div>

          {/* Form Container */}
          <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[20px] border border-divider-regular bg-components-option-card-option-bg p-5 text-[40px] font-bold shadow-lg">🤷‍♂️</div>
            <div className="text-center">
              <Button
                variant='primary'
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <a href="https://coop.io" className="text-white no-underline">探索</a>
              </Button>
            </div>
          </div>
        </>
      )}
      {verifyTokenRes && verifyTokenRes.is_valid && !showSuccess && (
        <>
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <img
              src="/logo-coop.png"
              alt="Coop Logo"
              className="mx-auto mb-4 h-16 w-auto object-contain"
            />
            <h3 className="text-xl font-semibold text-gray-900">设置新密码</h3>
            <p className="mt-2 text-sm text-gray-500">请输入您的新密码</p>
          </div>

          {/* Form Container */}
          <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <div className="relative">
              {/* Password */}
              <div className='mb-6'>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-900">
                  新密码
                </label>
                <div className="mt-1">
                  <Input
                    id="password"
                    type='password'
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="输入新密码"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className='mt-2 text-xs text-gray-500'>密码长度至少8位，包含字母和数字</div>
              </div>
              {/* Confirm Password */}
              <div className='mb-6'>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-gray-900">
                  确认密码
                </label>
                <div className="mt-1">
                  <Input
                    id="confirmPassword"
                    type='password'
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="再次输入密码"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>
              <div>
                <Button
                  variant='primary'
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  onClick={handleChangePassword}
                >
                  重置密码
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom Link */}
          <div className='mt-6 text-center text-sm text-gray-600'>
            <span>返回</span>
            <a
              className='ml-1 font-medium text-purple-600 transition-colors hover:text-purple-700'
              href={`${basePath}/signin`}
            >
              登录
            </a>
          </div>
        </>
      )}
      {verifyTokenRes && verifyTokenRes.is_valid && showSuccess && (
        <>
          {/* Logo Section */}
          <div className="mb-8 text-center">
            <img
              src="/logo-coop.png"
              alt="Coop Logo"
              className="mx-auto mb-4 h-16 w-auto object-contain"
            />
            <h3 className="text-xl font-semibold text-gray-900">密码已重置</h3>
            <p className="mt-2 text-sm text-gray-500">您的密码已成功更新</p>
          </div>

          {/* Form Container */}
          <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
            <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-[20px] border border-divider-regular bg-components-option-card-option-bg p-5 shadow-lg">
              <CheckCircleIcon className='h-10 w-10 text-[#039855]' />
            </div>
            <div className="text-center">
              <Button
                variant='primary'
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <a href={`${basePath}/signin`} className="text-white no-underline">登录</a>
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default ChangePasswordForm
