'use client'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useRouter } from 'next/navigation'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Loading from '../components/base/loading'
import Input from '../components/base/input'
import Button from '@/app/components/base/button'
import { basePath } from '@/utils/var'

import {
  fetchInitValidateStatus,
  fetchSetupStatus,
  sendForgotPasswordEmail,
} from '@/service/common'
import type { InitValidateStatusResponse } from '@/models/common'

const accountFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'login.error.emailInValid' })
    .email('login.error.emailInValid'),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

const ForgotPasswordForm = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const { register, trigger, getValues, formState: { errors } } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { email: '' },
  })

  const handleSendResetPasswordEmail = async (email: string) => {
    try {
      const res = await sendForgotPasswordEmail({
        url: '/forgot-password',
        body: { email },
      })
      if (res.result === 'success')
        setIsEmailSent(true)

      else console.error('Email verification failed')
    }
    catch (error) {
      console.error('Request failed:', error)
    }
  }

  const handleSendResetPasswordClick = async () => {
    if (isEmailSent) {
      router.push('/signin')
    }
    else {
      const isValid = await trigger('email')
      if (isValid) {
        const email = getValues('email')
        await handleSendResetPasswordEmail(email)
      }
    }
  }

  useEffect(() => {
    fetchSetupStatus().then(() => {
      fetchInitValidateStatus().then((res: InitValidateStatusResponse) => {
        if (res.status === 'not_started')
          window.location.href = `${basePath}/init`
      })

      setLoading(false)
    })
  }, [])

  return (
    loading
      ? <Loading />
      : <>
        {/* Logo Section */}
        <div className="mb-8 text-center">
          <img
            src="/logo-coop.png"
            alt="Coop Logo"
            className="mx-auto mb-4 h-16 w-auto object-contain"
          />
          <h3 className="text-xl font-semibold text-gray-900">重置密码</h3>
          <p className="mt-2 text-sm text-gray-500">
            {isEmailSent ? '重置链接已发送，请查看您的邮箱' : '请输入您的电子邮件地址。我们将向您发送一封电子邮件以重置密码。'}
          </p>
        </div>

        {/* Form Container */}
        <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
          <div className="relative">
            <form>
              {!isEmailSent && (
                <div className='mb-6'>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900">
                    邮箱
                  </label>
                  <div className="mt-1">
                    <Input
                      {...register('email')}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="输入邮箱地址"
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                    {errors.email && <span className='text-sm text-red-400'>{t(`${errors.email?.message}`)}</span>}
                  </div>
                </div>
              )}
              <div>
                <Button
                  variant='primary'
                  className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  onClick={handleSendResetPasswordClick}
                >
                  {isEmailSent ? '返回登录' : '发送验证码'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Link */}
        <div className='mt-6 text-center text-sm text-gray-600'>
          <span>返回</span>
          <a
            className='ml-1 cursor-pointer font-medium text-purple-600 transition-colors hover:text-purple-700'
            onClick={() => router.push('/signin')}
          >
            登录
          </a>
        </div>
      </>
  )
}

export default ForgotPasswordForm
