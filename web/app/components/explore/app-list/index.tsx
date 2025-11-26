'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useDebounceFn } from 'ahooks'
import { useHover } from 'ahooks'
import { useRouter } from 'next/navigation'
import s from './style.module.css'
import cn from '@/utils/classnames'
import type { App as ExploreApp } from '@/models/explore'
import TagCategory from './tag-category'
import AppCard from '@/app/components/explore/app-card'
import { fetchAppDetail } from '@/service/explore'
import { fetchAppDetailDirect } from '@/service/apps'
import { fetchTagList } from '@/service/tag'
import { useGetInstalledApps, useUpdateAppPinStatus } from '@/service/use-explore'
import { useTabSearchParams } from '@/hooks/use-tab-searchparams'
import CreateAppModal from '@/app/components/explore/create-app-modal'
import type { CreateAppModalProps } from '@/app/components/explore/create-app-modal'
import Loading from '@/app/components/base/loading'
import Input from '@/app/components/base/input'
import ItemOperation from '@/app/components/explore/item-operation'
import Toast from '@/app/components/base/toast'
import Confirm from '@/app/components/base/confirm'
import {
  DSLImportMode,
} from '@/models/app'
import { useImportDSL } from '@/hooks/use-import-dsl'
import DSLConfirmModal from '@/app/components/app/create-from-dsl-modal/dsl-confirm-modal'
import type { Tag } from '@/app/components/base/tag-management/constant'
import { useAppContext } from '@/context/app-context'

// 应用卡片组件，处理应用模板的点击和操作
interface IAppCardItemProps {
  app: any
  handleUpdatePinStatus: (variables: { appId: string; isPinned: boolean }) => Promise<any>
  id: string
  isPinned: boolean
  uninstallable: boolean
  onRecordAccess: () => void
  onDelete: (id: string) => void
}

const AppCardItem: React.FC<IAppCardItemProps> = ({ app, handleUpdatePinStatus, id, isPinned, uninstallable, onRecordAccess, onDelete }) => {
  const { t } = useTranslation()
  const appRef = React.useRef(null)
  const router = useRouter()

  // 当前应用就是已安装应用，installedAppId 就是 app.id
  const installedAppId = app.id

  // 获取用户信息用于隔离访问记录
  const { userProfile } = useAppContext()

  // 获取应用详细信息，包括描述
  const { data: appDetail } = useQuery({
    queryKey: ['app-detail', app.app.id],
    queryFn: async () => {
      try {
        const result = await fetchAppDetailDirect({ url: 'apps', id: app.app.id })
        return result
      }
      catch (error) {
        console.error('获取应用详细信息失败:', error)
        return null
      }
    },
    enabled: !!app.app.id,
  })

  // 使用获取到的应用描述，如果没有则使用空字符串
  const appDescription = appDetail?.description || ''

  const handlePinToggle = async () => {
    try {
      await handleUpdatePinStatus({ appId: installedAppId, isPinned: !isPinned })
      Toast.notify({
        type: 'success',
        message: !isPinned ? t('explore.sidebar.action.pin') : t('explore.sidebar.action.unpin'),
      })
    }
    catch (error) {
      console.error('置顶操作失败:', error)
      Toast.notify({
        type: 'error',
        message: '操作失败，请重试',
      })
    }
  }

  const handleAppClick = () => {
    // 记录应用访问时间 - 使用用户ID隔离
    const userId = userProfile?.id || 'anonymous'
    const accessKey = `explore_recent_app_access_${userId}`
    const accessData = JSON.parse(localStorage.getItem(accessKey) || '{}')
    accessData[installedAppId] = new Date().toISOString()

    // 清理超过10天的访问记录
    const now = new Date()
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    Object.keys(accessData).forEach(key => {
      if (new Date(accessData[key]) < tenDaysAgo) {
        delete accessData[key]
      }
    })

    localStorage.setItem(accessKey, JSON.stringify(accessData))

    // 使用 Next.js 客户端路由跳转，避免页面整体刷新，与左侧边栏行为一致
    router.push(`/explore/installed/${installedAppId}`)
  }

  
  return (
    <div
      key={app.id}
      ref={appRef}
      className="group relative cursor-pointer"
      onClick={handleAppClick}
    >
      <AppCard
        isExplore={false} // 这是应用中心，不是探索应用
        app={{
          app: {
            id: app.app.id,
            mode: app.app.mode,
            icon_type: app.app.icon_type,
            icon: app.app.icon,
            icon_background: app.app.icon_background,
            icon_url: app.app.icon_url,
            name: app.app.name,
            description: appDescription,
            use_icon_as_answer_icon: app.app.use_icon_as_answer_icon || false,
          },
          app_id: app.id,
          description: appDescription,
          copyright: '',
          privacy_policy: null,
          custom_disclaimer: null,
          category: 'Assistant', // 默认分类
          position: 0,
          is_listed: true,
          install_count: 0,
          installed: true, // 显示真实的已安装应用
          editable: app.editable,
          is_agent: app.app.mode === 'agent-chat',
        }}
        canCreate={false} // 应用中心不需要创建功能
        onCreate={() => {
          // 禁用点击，因为我们在外层div上处理点击
        }}
      />
      {/* 显示操作菜单 */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <div className="h-6 shrink-0" onClick={e => e.stopPropagation()}>
          <ItemOperation
            isPinned={isPinned}
            isItemHovering={isHovering}
            togglePin={handlePinToggle}
            isShowDelete={false} // 应用中心不允许删除应用
            onDelete={() => { /* 空函数，因为不显示删除按钮 */ }}
            isShowRenameConversation={false} // 不显示重命名功能
            onRenameConversation={() => { /* 空函数 */ }}
          />
        </div>
      </div>
    </div>
  )
}

type AppsProps = {
  onSuccess?: () => void
}

export enum PageType {
  EXPLORE = 'explore',
  CREATE = 'create',
}

const Apps = ({
  onSuccess,
}: AppsProps) => {
  const { t } = useTranslation()
  const allTagsText = t('explore.apps.allTags', 'All Tags')

  // 标签选择和搜索状态
  const [keywords, setKeywords] = useState('')
  const [searchKeywords, setSearchKeywords] = useState('')

  const { run: handleSearch } = useDebounceFn(() => {
    setSearchKeywords(keywords)
  }, { wait: 500 })

  const handleKeywordsChange = (value: string) => {
    setKeywords(value)
    handleSearch()
  }

  const [currTag, setCurrTag] = useTabSearchParams({
    defaultTab: allTagsText,
    disableSearchParams: false,
  })

  // 获取已安装应用数据（包含真实的置顶状态和使用状态）
  const {
    isFetching: isFetchingInstalledApps,
    data: installedAppsData,
    error: installedAppsError,
  } = useGetInstalledApps()

  
  // 置顶状态管理，与左侧置顶状态保持同步
  
  // 标签管理状态
  const [tagList, setTagList] = useState<Tag[]>([])
  const [pinnedApps, setPinnedApps] = useState<Set<string>>(new Set())

  // 获取应用标签数据
  const {
    isFetching: isFetchingAppTags,
    data: appTagsData,
  } = useQuery({
    queryKey: ['app-tags'],
    queryFn: async () => {
      try {
        const response = await fetchTagList('app')
        return response || []
      }
      catch (error) {
        console.error('获取应用标签失败:', error)
        throw error
      }
    },
  })

  // 同步标签数据到状态
  React.useEffect(() => {
    if (appTagsData)
      setTagList(appTagsData)
  }, [appTagsData])

  
  // 当标签改变时，重新获取标签筛选数据
  React.useEffect(() => {
    // 标签筛选的数据会自动重新获取，因为queryKey包含currTag
  }, [currTag])

  // 监听installedApps变化，同步置顶状态
  React.useEffect(() => {
    if (installedAppsData && (installedAppsData as any).installed_apps && (installedAppsData as any).installed_apps.length > 0) {
      const pinnedIds = (installedAppsData as any).installed_apps
        .filter((app: any) => app && app.is_pinned)
        .map((app: any) => app.id)
      setPinnedApps(new Set(pinnedIds))
    }
  }, [installedAppsData])

  // 已安装应用列表
  const installedAppsList = (installedAppsData as any)?.installed_apps || []

  // 获取标签筛选的应用数据
  const {
    isFetching: isFetchingTagFilteredApps,
    data: tagFilteredAppsData,
    error: tagFilteredAppsError,
  } = useQuery({
    queryKey: ['apps-by-tag', currTag, tagList],
    queryFn: async () => {
      // 如果选择了"All Tags"，返回null（不使用标签筛选）
      if (currTag === allTagsText)
        return null

      // 查找当前选择的标签ID
      const selectedTag = tagList?.find(tag => tag.name === currTag)
      if (!selectedTag) {
        console.warn(`标签 "${currTag}" 未找到`)
        return null
      }

      try {
        const { get } = await import('@/service/base')
        const data = await get(`/apps?tag_ids=${selectedTag.id}&limit=100`)
        return data
      }
      catch (error) {
        console.error('获取标签筛选应用失败:', error)
        throw error
      }
    },
    enabled: !!tagList && tagList.length > 0 && currTag !== allTagsText,
  })

  // 筛选逻辑：根据选择的标签显示应用
  const filteredList = useMemo(() => {
    if (!installedAppsList || installedAppsList.length === 0) return []

    // 如果选择了"All Tags"，显示所有已安装应用
    if (currTag === allTagsText)
      return installedAppsList

    // 使用标签筛选的结果
    if (tagFilteredAppsData && (tagFilteredAppsData as any)?.data) {
      // 从标签筛选的结果中提取已安装的应用
      const filteredApps = (tagFilteredAppsData as any).data.filter((app: any) => {
        return installedAppsList.some((installedApp: any) =>
          installedApp.app.id === app.id,
        )
      })

      // 转换为已安装应用的格式
      return filteredApps.map((app: any) => {
        const installedApp = installedAppsList.find((ia: any) => ia.app.id === app.id)
        return installedApp || null
      }).filter(Boolean)
    }

    // 如果正在加载标签筛选结果或出错，返回空数组
    if (isFetchingTagFilteredApps || tagFilteredAppsError)
      return []

    // 其他情况返回空数组
    return []
  }, [installedAppsList, currTag, allTagsText, tagFilteredAppsData, isFetchingTagFilteredApps, tagFilteredAppsError])

  // 综合加载状态
  const isLoading = isFetchingInstalledApps || isFetchingAppTags || isFetchingTagFilteredApps

  // 使用标签管理系统提供的标签列表
  const allTags = useMemo(() => {
    if (!tagList || tagList.length === 0) return []
    return tagList.map(tag => tag.name).sort()
  }, [tagList])

  const searchFilteredList = useMemo(() => {
    if (!searchKeywords || !filteredList || filteredList.length === 0)
      return filteredList

    const lowerCaseSearchKeywords = searchKeywords.toLowerCase()

    return filteredList.filter((installedApp: any) =>
      installedApp.app && (
        (installedApp.app.name && installedApp.app.name.toLowerCase().includes(lowerCaseSearchKeywords))
        || (installedApp.app.description && installedApp.app.description.toLowerCase().includes(lowerCaseSearchKeywords))
      ),
    )
  }, [searchKeywords, filteredList])

  // 处理置顶功能
  const { mutateAsync: handleUpdatePinStatus } = useUpdateAppPinStatus()

  const [currApp] = React.useState<ExploreApp | null>(null)
  const [isShowCreateModal, setIsShowCreateModal] = React.useState(false)
  const [showDSLConfirmModal, setShowDSLConfirmModal] = useState(false)
  const [currId, setCurrId] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  
  const {
    handleImportDSL,
    handleImportDSLConfirm,
    versions,
    isFetching,
  } = useImportDSL()

  const onCreate: CreateAppModalProps['onConfirm'] = async ({
    name,
    icon_type,
    icon,
    icon_background,
    description,
  }) => {
    const { export_data } = await fetchAppDetail(
      currApp?.app.id as string,
    )
    const payload = {
      mode: DSLImportMode.YAML_CONTENT,
      yaml_content: export_data,
      name,
      icon_type,
      icon,
      icon_background,
      description,
    }
    await handleImportDSL(payload, {
      onSuccess: () => {
        setIsShowCreateModal(false)
      },
      onPending: () => {
        setShowDSLConfirmModal(true)
      },
    })
  }

  const onConfirmDSL = useCallback(async () => {
    await handleImportDSLConfirm({
      onSuccess,
    })
  }, [handleImportDSLConfirm, onSuccess])

  const recordAppAccess = (appId: string) => {
    const { userProfile } = useAppContext()
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
  }

  // 处理加载状态
  if (isLoading) {
    return (
      <div className="flex h-full items-center">
        <Loading type="area" />
      </div>
    )
  }

  if (installedAppsError) {
    console.error('应用列表加载错误:', installedAppsError)
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <div className="mb-2 text-text-tertiary">加载应用列表失败</div>
        <div className="text-sm text-text-tertiary">{installedAppsError.message || '未知错误'}</div>
      </div>
    )
  }

  if (!installedAppsData) {
    return (
      <div className="flex h-full items-center">
        <Loading type="area" />
      </div>
    )
  }

  return (
    <div className={cn(
      'flex h-full flex-col border-l-[0.5px] border-divider-regular',
    )}>

      <div className='shrink-0 px-12 pt-6'>
        <div className={`mb-1 ${s.textGradient} text-xl font-semibold`}>{t('explore.apps.title')}</div>
        <div className='text-sm text-text-tertiary'>{t('explore.apps.description')}</div>
      </div>

      <div className={cn(
        'mt-6 flex items-center justify-between px-12',
      )}>
        <TagCategory
          tags={allTags}
          value={currTag}
          onChange={setCurrTag}
          allTagsText={allTagsText}
        />
        <Input
          showLeftIcon
          showClearIcon
          wrapperClassName='w-[200px] self-start'
          value={keywords}
          onChange={e => handleKeywordsChange(e.target.value)}
          onClear={() => handleKeywordsChange('')}
        />
      </div>

      <div className={cn(
        'relative mt-4 flex flex-1 shrink-0 grow flex-col overflow-auto pb-6',
      )}>
        <nav
          className={cn(
            s.appList,
            'grid shrink-0 content-start gap-4 px-6 sm:px-12',
          )}>
          {searchFilteredList.map((app: any) => (
            <AppCardItem
              key={app.id}
              app={app}
              pinnedApps={pinnedApps}
              handleUpdatePinStatus={handleUpdatePinStatus}
              id={app.id}
              isPinned={pinnedApps.has(app.id)}
              uninstallable={app.uninstallable}
              onRecordAccess={() => recordAppAccess(app.id)}
              onDelete={(id) => {
                setCurrId(id)
                setShowConfirm(true)
              }}
            />
          ))}
          {searchFilteredList.length === 0 && (
            <div className="col-span-full py-12 text-center text-text-tertiary">
              {searchKeywords ? '没有找到匹配的应用' : '该标签下暂无应用'}
            </div>
          )}
        </nav>
      </div>
      {showConfirm && (
        <Confirm
          title={t('explore.sidebar.delete.title')}
          content={t('explore.sidebar.delete.content')}
          isShow={showConfirm}
          onConfirm={() => {
            // 应用中心不允许删除，这里只是占位
            setShowConfirm(false)
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      {isShowCreateModal && (
        <CreateAppModal
          appIconType={currApp?.app.icon_type || 'emoji'}
          appIcon={currApp?.app.icon || ''}
          appIconBackground={currApp?.app.icon_background || ''}
          appIconUrl={currApp?.app.icon_url}
          appName={currApp?.app.name || ''}
          appDescription={currApp?.app.description || ''}
          show={isShowCreateModal}
          onConfirm={onCreate}
          confirmDisabled={isFetching}
          onHide={() => setIsShowCreateModal(false)}
        />
      )}
      {
        showDSLConfirmModal && (
          <DSLConfirmModal
            versions={versions}
            onCancel={() => setShowDSLConfirmModal(false)}
            onConfirm={onConfirmDSL}
            confirmDisabled={isFetching}
          />
        )
      }
    </div>
  )
}

export default React.memo(Apps)
