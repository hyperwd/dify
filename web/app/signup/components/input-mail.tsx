'use client'
import { noop } from 'lodash-es'
import Input from '@/app/components/base/input'
import { useTranslation } from 'react-i18next'
import { useCallback, useState } from 'react'
import Button from '@/app/components/base/button'
import { emailRegex } from '@/config'
import Toast from '@/app/components/base/toast'
import type { MailSendResponse } from '@/service/use-common'
import { useSendMail } from '@/service/use-common'

type Props = {
  onSuccess: (email: string, payload: string) => void
}
export default function Form({
  onSuccess,
}: Props) {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')

  const { mutateAsync: submitMail, isPending } = useSendMail()

  const handleSubmit = useCallback(async () => {
    if (!email) {
      Toast.notify({ type: 'error', message: t('login.error.emailEmpty') })
      return
    }
    if (!emailRegex.test(email)) {
      Toast.notify({
        type: 'error',
        message: t('login.error.emailInValid'),
      })
      return
    }
    const res = await submitMail({ email, language: 'zh-Hans' })
    if((res as MailSendResponse).result === 'success')
      onSuccess(email, (res as MailSendResponse).data)
  }, [email, submitMail, t])

  return <form onSubmit={noop}>
    <div className='mb-4'>
      <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-900">
        邮箱
      </label>
      <div className="mt-1">
        <Input
          value={email}
          onChange={e => setEmail(e.target.value)}
          id="email"
          type="email"
          autoComplete="email"
          placeholder="输入邮箱地址"
          tabIndex={1}
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 transition-all duration-200 placeholder:text-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        />
      </div>
      <div className="mt-2 text-xs text-gray-500">
        我们将向此邮箱发送激活链接
      </div>
    </div>
    <div className='mb-4'>
      <Button
        tabIndex={2}
        variant='primary'
        onClick={handleSubmit}
        disabled={isPending || !email}
        className="w-full rounded-xl bg-gradient-to-r from-purple-600 via-purple-700 to-pink-600 px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:from-purple-700 hover:via-purple-800 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
      >
        {isPending ? (
          <div className="flex items-center justify-center">
            <svg className="-ml-1 mr-3 h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            发送中...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            继续
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        )}
      </Button>
    </div>
  </form>
}
