'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDebounceFn, useMount } from 'ahooks'
import { useHover } from 'ahooks'
import s from './style.module.css'
import cn from '@/utils/classnames'
import type { App as ExploreApp } from '@/models/explore'
import TagCategory from './tag-category'
import AppCard from '@/app/components/explore/app-card'
import { fetchAppDetail } from '@/service/explore'
import { useGetInstalledApps, useUpdateAppPinStatus } from '@/service/use-explore'
import { useTabSearchParams } from '@/hooks/use-tab-searchparams'
import CreateAppModal from '@/app/components/explore/create-app-modal'
import type { CreateAppModalProps } from '@/app/components/explore/create-app-modal'
import Loading from '@/app/components/base/loading'
import Input from '@/app/components/base/input'
import ItemOperation from '@/app/components/explore/item-operation'
import Toast from '@/app/components/base/toast'
import {
  DSLImportMode,
} from '@/models/app'
import { useImportDSL } from '@/hooks/use-import-dsl'
import DSLConfirmModal from '@/app/components/app/create-from-dsl-modal/dsl-confirm-modal'
import { fetchTagList } from '@/service/tag'
import type { Tag } from '@/app/components/base/tag-management/constant'

// 应用卡片组件，处理应用模板的点击和操作
const AppCardItem: React.FC<{
  app: any
  pinnedApps: Set<string>
  installedApps: any[]
  handleUpdatePinStatus: (appId: string, isPinned: boolean) => Promise<void>
}> = ({ app, pinnedApps, handleUpdatePinStatus }) => {
  const appRef = React.useRef(null)
  const isHovering = useHover(appRef)

  // 当前应用就是已安装应用，installedAppId 就是 app.id
  const installedAppId = app.id
  const isPinned = pinnedApps.has(installedAppId)

  const handleAppClick = () => {
    // 直接跳转到已安装应用的页面
    window.location.href = `/explore/installed/${installedAppId}`
  }

  const handlePinToggle = () => {
    // 直接调用置顶功能，因为这些是已安装应用
    handleUpdatePinStatus(installedAppId, !isPinned)
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
            description: app.app.description,
            use_icon_as_answer_icon: app.app.use_icon_as_answer_icon,
          },
          app_id: app.id,
          description: app.app.description,
          copyright: '',
          privacy_policy: null,
          custom_disclaimer: null,
          category: 'Assistant', // 默认分类
          position: 0,
          is_listed: true,
          install_count: 0,
          installed: true, // 这些都是已安装应用
          editable: false,
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

  // 使用和左侧完全相同的数据源
  const {
    isFetching: isFetchingInstalledApps,
    data: installedAppsData,
    error: installedAppsError,
  } = useGetInstalledApps()
  const { mutateAsync: updatePinStatus } = useUpdateAppPinStatus()

  // 置顶状态管理，与左侧置顶状态保持同步
  const [pinnedApps, setPinnedApps] = React.useState<Set<string>>(new Set())

  // 标签管理状态
  const [tagList, setTagList] = useState<Tag[]>([])
  const [isLoadingTags, setIsLoadingTags] = useState(false)

  // 监听installedApps变化，同步置顶状态
  React.useEffect(() => {
    if (installedAppsData && (installedAppsData as any).installed_apps && (installedAppsData as any).installed_apps.length > 0) {
      const pinnedIds = (installedAppsData as any).installed_apps
        .filter((app: any) => app && app.is_pinned)
        .map((app: any) => app.id)
      setPinnedApps(new Set(pinnedIds))
    }
  }, [installedAppsData])

  // 加载标签列表
  useMount(() => {
    setIsLoadingTags(true)
    fetchTagList('app')
      .then((res) => {
        setTagList(res || [])
      })
      .catch((error) => {
        console.error('加载标签列表失败:', error)
      })
      .finally(() => {
        setIsLoadingTags(false)
      })
  })

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

  // 已安装应用列表
  const installedAppsList = (installedAppsData as any)?.installed_apps || []

  // 使用标签管理系统提供的标签列表
  const allTags = useMemo(() => {
    if (!tagList || tagList.length === 0) return []
    return tagList.map(tag => tag.name).sort()
  }, [tagList])

  // 根据选择的标签过滤已安装应用
  const filteredList = useMemo(() => {
    if (!installedAppsList || installedAppsList.length === 0) return []

    if (currTag === allTagsText) return installedAppsList

    return installedAppsList.filter((installedApp: any) => {
      // 标签数据在 installedApp.app.tags 中
      const tags = installedApp.app?.tags

      if (!tags || !Array.isArray(tags) || tags.length === 0) {
        // 如果没有标签，只有当前选择的是"未分类"时才显示
        return currTag === t('explore.apps.uncategorized', 'Uncategorized')
      }

      // 检查是否有标签匹配当前选择的标签
      return tags.some((tag: any) => {
        if (!tag) return false

        // 情况1: tag是字符串，直接比较名称
        if (typeof tag === 'string' && tag === currTag)
          return true

        // 情况2: tag是对象，有name属性
        if (tag.name && tag.name === currTag)
          return true

        // 情况3: tag是对象，有id属性，需要找到对应的标签名称
        if (tag.id) {
          const currentTag = tagList.find(t => t.id === tag.id)
          if (currentTag && currentTag.name === currTag)
            return true
        }

        return false
      })
    })
  }, [installedAppsList, currTag, allTagsText, t, tagList])

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
  const handleUpdatePinStatus = async (appId: string, isPinned: boolean) => {
    try {
      // 调用真实的置顶API
      await updatePinStatus({ appId, isPinned })

      Toast.notify({
        type: 'success',
        message: isPinned ? t('explore.sidebar.action.pin') : t('explore.sidebar.action.unpin'),
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

  const [currApp] = React.useState<ExploreApp | null>(null)
  const [isShowCreateModal, setIsShowCreateModal] = React.useState(false)

  const {
    handleImportDSL,
    handleImportDSLConfirm,
    versions,
    isFetching,
  } = useImportDSL()
  const [showDSLConfirmModal, setShowDSLConfirmModal] = useState(false)
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

  // 处理加载状态
  if (isFetchingInstalledApps || isLoadingTags) {
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
              installedApps={installedAppsList}
              handleUpdatePinStatus={handleUpdatePinStatus}
            />
          ))}
          {searchFilteredList.length === 0 && (
            <div className="col-span-full py-12 text-center text-text-tertiary">
              {searchKeywords ? '没有找到匹配的应用' : '该标签下暂无应用'}
            </div>
          )}
        </nav>
      </div>
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
