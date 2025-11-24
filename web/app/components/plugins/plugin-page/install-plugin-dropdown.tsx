'use client'

import { useEffect, useRef, useState } from 'react'
import { RiAddLine, RiArrowDownSLine } from '@remixicon/react'
import Button from '@/app/components/base/button'
import { FileZip } from '@/app/components/base/icons/src/vender/solid/files'
import InstallFromLocalPackage from '@/app/components/plugins/install-plugin/install-from-local-package'
import cn from '@/utils/classnames'
import {
  PortalToFollowElem,
  PortalToFollowElemContent,
  PortalToFollowElemTrigger,
} from '@/app/components/base/portal-to-follow-elem'
import { useTranslation } from 'react-i18next'
import { SUPPORT_INSTALL_LOCAL_FILE_EXTENSIONS } from '@/config'
import { noop } from 'lodash-es'

type Props = {}

type InstallMethod = {
  icon: React.FC<{ className?: string }>
  text: string
  action: string
}

const InstallPluginDropdown = (_: Props) => {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsMenuOpen(false)
    }
  }

  // TODO TEST INSTALL : uninstall
  // const [pluginLists, setPluginLists] = useState<any>([])
  // useEffect(() => {
  //   (async () => {
  //     const list: any = await get('workspaces/current/plugin/list')
  //   })()
  // })

  // const handleUninstall = async (id: string) => {
  //   const res = await post('workspaces/current/plugin/uninstall', { body: { plugin_installation_id: id } })
  //   console.log(res)
  // }

  const [installMethods, setInstallMethods] = useState<InstallMethod[]>([])
  useEffect(() => {
    const methods = []
    // 只保留本地插件安装选项
    methods.push({ icon: FileZip, text: t('plugin.source.local'), action: 'local' })
    setInstallMethods(methods)
  }, [t])

  return (
    <PortalToFollowElem
      open={isMenuOpen}
      onOpenChange={setIsMenuOpen}
      placement='bottom-start'
      offset={4}
    >
      <div className="relative">
        <PortalToFollowElemTrigger onClick={() => setIsMenuOpen(v => !v)}>
          <Button
            className={cn('h-full w-full p-2 text-components-button-secondary-text', isMenuOpen && 'bg-state-base-hover')}
          >
            <RiAddLine className='h-4 w-4' />
            <span className='pl-1'>{t('plugin.installPlugin')}</span>
            <RiArrowDownSLine className='ml-1 h-4 w-4' />
          </Button>
        </PortalToFollowElemTrigger>
        <PortalToFollowElemContent className='z-[1002]'>
          <div className='shadows-shadow-lg flex w-[200px] flex-col items-start rounded-xl border border-components-panel-border bg-components-panel-bg-blur p-1 pb-2'>
            <span className='system-xs-medium-uppercase flex items-start self-stretch pb-0.5 pl-2 pr-3 pt-1 text-text-tertiary'>
              {t('plugin.installFrom')}
            </span>
            <input
              type='file'
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept={SUPPORT_INSTALL_LOCAL_FILE_EXTENSIONS}
            />
            <div className='w-full'>
              {installMethods.map(({ icon: Icon, text, action }) => (
                <div
                  key={action}
                  className='flex w-full !cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-state-base-hover'
                  onClick={() => {
                    if (action === 'local')
                      fileInputRef.current?.click()
                  }}
                >
                  <Icon className="h-4 w-4 text-text-tertiary" />
                  <span className='system-md-regular px-1 text-text-secondary'>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </PortalToFollowElemContent>
      </div>
      {selectedFile && (<InstallFromLocalPackage
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onSuccess={noop}
      />
      )
      }
      {/* {pluginLists.map((item: any) => (
        <div key={item.id} onClick={() => handleUninstall(item.id)}>{item.name} 卸载</div>
      ))} */}
    </PortalToFollowElem>
  )
}

export default InstallPluginDropdown
