import { useCallback } from 'react'
import { useAppContext } from '@/context/app-context'

const useRecordAppAccess = () => {
  const { userProfile } = useAppContext()

  const recordAppAccess = useCallback((appId: string) => {
    // 使用用户ID创建独立的访问记录键
    const userId = userProfile?.id || 'anonymous'
    const accessKey = `explore_recent_app_access_${userId}`
    const accessData = JSON.parse(localStorage.getItem(accessKey) || '{}')
    accessData[appId] = new Date().toISOString()

    // 清理超过10天的访问记录
    const now = new Date()
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    Object.keys(accessData).forEach(key => {
      if (new Date(accessData[key]) < tenDaysAgo) {
        delete accessData[key]
      }
    })

    localStorage.setItem(accessKey, JSON.stringify(accessData))
  }, [userProfile?.id])

  return recordAppAccess
}

export default useRecordAppAccess