'use client'
import React, { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebounceFn } from 'ahooks'

import { useRouter } from 'next/navigation'

import type { SubmitHandler } from 'react-hook-form'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Loading from '../components/base/loading'
import classNames from '@/utils/classnames'
import Button from '@/app/components/base/button'

import { fetchInitValidateStatus, fetchSetupStatus, login, setup } from '@/service/common'
import type { InitValidateStatusResponse, SetupStatusResponse } from '@/models/common'
import useDocumentTitle from '@/hooks/use-document-title'
import { validPassword } from '@/config'

const accountFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'login.error.emailInValid' })
    .email('login.error.emailInValid'),
  name: z.string().min(1, { message: 'login.error.nameEmpty' }),
  password: z.string().min(8, {
    message: 'login.error.passwordLengthInValid',
  }).regex(validPassword, 'login.error.passwordInvalid'),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

const InstallForm = () => {
  useDocumentTitle('')
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const [showPassword, setShowPassword] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      password: '',
      email: '',
    },
  })

  const onSubmit: SubmitHandler<AccountFormValues> = async (data) => {
    // First, setup the admin account
    await setup({
      body: {
        ...data,
        language: i18n.language,
      },
    })

    // Then, automatically login with the same credentials
    const loginRes = await login({
      url: '/login',
      body: {
        email: data.email,
        password: data.password,
      },
    })

    // Store tokens and redirect to apps if login successful
    if (loginRes.result === 'success') {
      router.replace('/apps')
    }
    else {
      // Fallback to signin page if auto-login fails
      router.replace('/signin')
    }
  }

  const handleSetting = async () => {
    if (isSubmitting) return
    handleSubmit(onSubmit)()
  }

  const { run: debouncedHandleKeyDown } = useDebounceFn(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSetting()
      }
    },
    { wait: 200 },
  )

  const handleKeyDown = useCallback(debouncedHandleKeyDown, [debouncedHandleKeyDown])

  useEffect(() => {
    fetchSetupStatus().then((res: SetupStatusResponse) => {
      if (res.step === 'finished') {
        localStorage.setItem('setup_status', 'finished')
        router.push('/signin')
      }
      else {
        fetchInitValidateStatus().then((res: InitValidateStatusResponse) => {
          if (res.status === 'not_started')
            router.push('/init')
        })
      }
      setLoading(false)
    })
  }, [])

  return (
    loading
      ? <Loading />
      : <>
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-5">
          {/* 邮箱输入 */}
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900">
              邮箱
            </label>
            <input
              {...register('email')}
              placeholder="输入邮箱地址"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            {errors.email && (
              <span className='mt-1 block text-sm text-red-500'>{t(`${errors.email?.message}`)}</span>
            )}
          </div>

          {/* 用户名输入 */}
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-900">
              用户名
            </label>
            <input
              {...register('name')}
              placeholder="设置用户名"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
            {errors.name && (
              <span className='mt-1 block text-sm text-red-500'>{t(`${errors.name.message}`)}</span>
            )}
          </div>

          {/* 密码输入 */}
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-900">
              密码
            </label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="设置密码"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition-colors duration-200 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                )}
              </button>
            </div>

            <div className={classNames('mt-2 text-xs text-gray-500', {
              'text-red-500': errors.password,
            })}>
              密码提示 (最少 8 位)
            </div>

            {/* 密码安全要求 */}
            <div className="mt-2 text-xs text-gray-400">
              必须包含大小写字母、数字和特殊字符
            </div>
          </div>

          {/* 提交按钮 */}
          <div className="pt-4">
            <Button
              variant='primary'
              className='w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20'
              onClick={handleSetting}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  设置中...
                </div>
              ) : (
                '完成设置'
              )}
            </Button>
          </div>
        </form>
      </>
  )
}

export default InstallForm
