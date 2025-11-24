'use client'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { RiContractLine, RiDoorLockLine, RiErrorWarningFill } from '@remixicon/react'
import Loading from '../components/base/loading'
import MailAndCodeAuth from './components/mail-and-code-auth'
import MailAndPasswordAuth from './components/mail-and-password-auth'
import SocialAuth from './components/social-auth'
import SSOAuth from './components/sso-auth'
import cn from '@/utils/classnames'
import { LicenseStatus } from '@/types/feature'
import Toast from '@/app/components/base/toast'
import { useGlobalPublicStore } from '@/context/global-public-context'
import { resolvePostLoginRedirect } from './utils/post-login-redirect'
import Split from './split'
import { useIsLogin } from '@/service/use-common'

const NormalForm = () => {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoading: isCheckLoading, data: loginData } = useIsLogin()
  const isLoggedIn = loginData?.logged_in
  const message = decodeURIComponent(searchParams.get('message') || '')
  const [isInitCheckLoading, setInitCheckLoading] = useState(true)
  const isLoading = isCheckLoading || loginData?.logged_in || isInitCheckLoading
  const { systemFeatures } = useGlobalPublicStore()
  const [authType, updateAuthType] = useState<'code' | 'password'>('password')
  const [showORLine, setShowORLine] = useState(false)
  const [allMethodsAreDisabled, setAllMethodsAreDisabled] = useState(false)

  const init = useCallback(async () => {
    try {
      if (isLoggedIn) {
        const redirectUrl = resolvePostLoginRedirect(searchParams)
        router.replace(redirectUrl || '/apps')
        return
      }

      if (message) {
        Toast.notify({
          type: 'error',
          message,
        })
      }
      setAllMethodsAreDisabled(!systemFeatures.enable_social_oauth_login && !systemFeatures.enable_email_code_login && !systemFeatures.enable_email_password_login && !systemFeatures.sso_enforced_for_signin)
      setShowORLine((systemFeatures.enable_social_oauth_login || systemFeatures.sso_enforced_for_signin) && (systemFeatures.enable_email_code_login || systemFeatures.enable_email_password_login))
      updateAuthType(systemFeatures.enable_email_password_login ? 'password' : 'code')
    }
    catch (error) {
      console.error(error)
      setAllMethodsAreDisabled(true)
    }
    finally { setInitCheckLoading(false) }
  }, [isLoggedIn, message, router, systemFeatures])
  useEffect(() => {
    init()
  }, [init])
  if (isLoading) {
    return <div className={
      cn(
        'flex w-full grow flex-col items-center justify-center',
        'px-6',
        'md:px-[108px]',
      )
    }>
      <Loading type='area' />
    </div>
  }
  if (systemFeatures.license?.status === LicenseStatus.LOST) {
    return <div className='relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12'>
      {/* 装饰性背景元素 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-blue-200/30 mix-blend-multiply blur-xl"></div>
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-purple-200/30 mix-blend-multiply blur-xl"></div>
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/20 mix-blend-multiply blur-xl"></div>
      </div>
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          <div className='relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-200 bg-white shadow-lg'>
            <RiContractLine className='h-6 w-6 text-orange-600' />
            <RiErrorWarningFill className='absolute -right-1 -top-1 h-5 w-5 text-red-500' />
          </div>
          <h3 className='mb-2 text-center text-lg font-semibold text-gray-900'>{t('login.licenseLost')}</h3>
          <p className='text-center text-sm leading-relaxed text-gray-600'>{t('login.licenseLostTip')}</p>
        </div>
      </div>
    </div>
  }
  if (systemFeatures.license?.status === LicenseStatus.EXPIRED) {
    return <div className='relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12'>
      {/* 装饰性背景元素 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-blue-200/30 mix-blend-multiply blur-xl"></div>
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-purple-200/30 mix-blend-multiply blur-xl"></div>
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/20 mix-blend-multiply blur-xl"></div>
      </div>
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          <div className='relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-200 bg-white shadow-lg'>
            <RiContractLine className='h-6 w-6 text-orange-600' />
            <RiErrorWarningFill className='absolute -right-1 -top-1 h-5 w-5 text-red-500' />
          </div>
          <h3 className='mb-2 text-center text-lg font-semibold text-gray-900'>{t('login.licenseExpired')}</h3>
          <p className='text-center text-sm leading-relaxed text-gray-600'>{t('login.licenseExpiredTip')}</p>
        </div>
      </div>
    </div>
  }
  if (systemFeatures.license?.status === LicenseStatus.INACTIVE) {
    return <div className='relative flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 px-6 py-12'>
      {/* 装饰性背景元素 */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-20 top-20 h-72 w-72 rounded-full bg-blue-200/30 mix-blend-multiply blur-xl"></div>
        <div className="absolute bottom-20 left-20 h-72 w-72 rounded-full bg-purple-200/30 mix-blend-multiply blur-xl"></div>
        <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-200/20 mix-blend-multiply blur-xl"></div>
      </div>
      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/50 bg-white/80 p-8 shadow-xl backdrop-blur-xl">
          <div className='relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-orange-200 bg-white shadow-lg'>
            <RiContractLine className='h-6 w-6 text-orange-600' />
            <RiErrorWarningFill className='absolute -right-1 -top-1 h-5 w-5 text-red-500' />
          </div>
          <h3 className='mb-2 text-center text-lg font-semibold text-gray-900'>{t('login.licenseInactive')}</h3>
          <p className='text-center text-sm leading-relaxed text-gray-600'>{t('login.licenseInactiveTip')}</p>
        </div>
      </div>
    </div>
  }

  return (
    <>
      {/* Logo Section */}
      <div className="mb-8 text-center">
        <img
          src="/logo-coop.png"
          alt="Coop Logo"
          className="mx-auto mb-4 h-16 w-auto object-contain"
        />
        <h3 className="text-xl font-semibold text-gray-900">密码登录</h3>
        <p className="mt-2 text-sm text-gray-500">欢迎回来！请登录您的账户</p>
      </div>

      {/* Auth Methods Container */}
      <div className="rounded-2xl border border-gray-200/50 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
        <div className="space-y-4">
          {systemFeatures.enable_social_oauth_login && <SocialAuth />}
          {systemFeatures.sso_enforced_for_signin && <div className='w-full'>
            <SSOAuth protocol={systemFeatures.sso_enforced_for_signin_protocol} />
          </div>}
        </div>

        {showORLine && <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white/80 px-4 text-slate-500">{t('login.or')}</span>
          </div>
        </div>}

        {
          (systemFeatures.enable_email_code_login || systemFeatures.enable_email_password_login) && <>
            {systemFeatures.enable_email_code_login && authType === 'code' && <>
              <MailAndCodeAuth isInvite={false} />
              {systemFeatures.enable_email_password_login && <div className='mt-4 text-center'>
                <button
                  onClick={() => { updateAuthType('password') }}
                  className='text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700'
                >
                  {t('login.usePassword')}
                </button>
              </div>}
            </>}
            {systemFeatures.enable_email_password_login && authType === 'password' && <>
              <MailAndPasswordAuth isInvite={false} isEmailSetup={systemFeatures.is_email_setup} allowRegistration={systemFeatures.is_allow_register} />
              {systemFeatures.enable_email_code_login && <div className='mt-4 text-center'>
                <button
                  onClick={() => { updateAuthType('code') }}
                  className='text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700'
                >
                  {t('login.useVerificationCode')}
                </button>
              </div>}
            </>}
            <Split className='my-6' />
          </>
        }

        {systemFeatures.is_allow_register && authType === 'password' && (
          <div className='border-t border-slate-100 pt-4 text-center text-sm text-slate-600'>
            <span>还没有账户？</span>
            <Link
              className='ml-1 font-medium text-purple-600 transition-colors hover:text-purple-700'
              href='/signup'
            >创建账户</Link>
          </div>
        )}

        {allMethodsAreDisabled && <>
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center">
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm'>
              <RiDoorLockLine className='h-6 w-6 text-gray-500' />
            </div>
            <h3 className='mb-2 text-lg font-semibold text-gray-900'>{t('login.noLoginMethod')}</h3>
            <p className='text-sm leading-relaxed text-gray-600'>{t('login.noLoginMethodTip')}</p>
          </div>
        </>}
      </div>
    </>
  )
}

export default NormalForm
