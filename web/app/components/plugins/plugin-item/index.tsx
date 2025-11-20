'use client'
import Tooltip from '@/app/components/base/tooltip'
import useRefreshPluginList from '@/app/components/plugins/install-plugin/hooks/use-refresh-plugin-list'
import { API_PREFIX } from '@/config'
import { useAppContext } from '@/context/app-context'
import { useRenderI18nObject } from '@/hooks/use-i18n'
import cn from '@/utils/classnames'
import {
  RiErrorWarningLine,
  RiVerifiedBadgeLine,
} from '@remixicon/react'
import type { FC } from 'react'
import React, { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { gte } from 'semver'
import Badge from '../../base/badge'
import CornerMark from '../card/base/corner-mark'
import Description from '../card/base/description'
import Title from '../card/base/title'
import { useCategories } from '../hooks'
import { usePluginPageContext } from '../plugin-page/context'
import { PluginCategoryEnum, type PluginDetail } from '../types'
import Action from './action'

type Props = {
  className?: string
  plugin: PluginDetail
}

const PluginItem: FC<Props> = ({
  className,
  plugin,
}) => {
  const { t } = useTranslation()
  const { categoriesMap } = useCategories(t, true)
  const currentPluginID = usePluginPageContext(v => v.currentPluginID)
  const setCurrentPluginID = usePluginPageContext(v => v.setCurrentPluginID)
  const { refreshPluginList } = useRefreshPluginList()

  const {
    tenant_id,
    installation_id,
    plugin_unique_identifier,
    meta,
    plugin_id,
  } = plugin
  const { category, name, label, description, icon, verified, meta: declarationMeta } = plugin.declaration

  const { langGeniusVersionInfo } = useAppContext()

  const isDifyVersionCompatible = useMemo(() => {
    if (!langGeniusVersionInfo.current_version)
      return true
    return gte(langGeniusVersionInfo.current_version, declarationMeta.minimum_dify_version ?? '0.0.0')
  }, [declarationMeta.minimum_dify_version, langGeniusVersionInfo.current_version])

  
  const handleDelete = useCallback(() => {
    refreshPluginList({ category } as any)
  }, [category, refreshPluginList])

  const getValueFromI18nObject = useRenderI18nObject()
  const title = getValueFromI18nObject(label)
  const descriptionText = getValueFromI18nObject(description)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border-[1.5px] border-background-section-burn p-1',
        currentPluginID === plugin_id && 'border-components-option-card-option-selected-border',
        'bg-background-section-burn',
      )}
      onClick={() => {
        setCurrentPluginID(plugin.plugin_id)
      }}
    >
      <div className={cn('hover-bg-components-panel-on-panel-item-bg relative z-10 rounded-xl border-[0.5px] border-components-panel-border bg-components-panel-on-panel-item-bg p-4 pb-3 shadow-xs', className)}>
        <CornerMark text={categoriesMap[category].label} />
        {/* Header */}
        <div className='flex'>
          <div className='flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border-[1px] border-components-panel-border-subtle'>
            <img
              className='h-full w-full'
              src={`${API_PREFIX}/workspaces/current/plugin/icon?tenant_id=${tenant_id}&filename=${icon}`}
              alt={`plugin-${plugin_unique_identifier}-logo`}
            />
          </div>
          <div className='ml-3 w-0 grow'>
            <div className='flex h-5 items-center'>
              <Title title={title} />
              {verified && <RiVerifiedBadgeLine className='ml-0.5 h-4 w-4 shrink-0 text-text-accent' />}
              {!isDifyVersionCompatible && <Tooltip popupContent={
                t('plugin.difyVersionNotCompatible', { minimalDifyVersion: declarationMeta.minimum_dify_version })
              }><RiErrorWarningLine color='red' className='ml-0.5 h-4 w-4 shrink-0 text-text-accent' /></Tooltip>}
              <Badge className='ml-1 shrink-0'
                text={plugin.version}
              />
            </div>
            <div className='flex items-center justify-between'>
              <Description text={descriptionText} descriptionLineRows={1}></Description>
              <div onClick={e => e.stopPropagation()}>
                <Action
                  pluginUniqueIdentifier={plugin_unique_identifier}
                  installationId={installation_id}
                  pluginName={name}
                  usedInApps={5}
                  isShowDelete
                  meta={meta}
                  onDelete={handleDelete}
                  category={category}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
  )
}

export default React.memo(PluginItem)
