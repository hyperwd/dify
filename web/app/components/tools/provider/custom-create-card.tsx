'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RiAddCircleFill,
} from '@remixicon/react'
import type { CustomCollectionBackend } from '../types'
import EditCustomToolModal from '@/app/components/tools/edit-custom-collection-modal'
import { createCustomCollection } from '@/service/tools'
import Toast from '@/app/components/base/toast'
import { useAppContext } from '@/context/app-context'

type Props = {
  onRefreshData: () => void
}

const Contribute = ({ onRefreshData }: Props) => {
  const { t } = useTranslation()
  const { isCurrentWorkspaceManager } = useAppContext()

  const [isShowEditCollectionToolModal, setIsShowEditCustomCollectionModal] = useState(false)
  const doCreateCustomToolCollection = async (data: CustomCollectionBackend) => {
    await createCustomCollection(data)
    Toast.notify({
      type: 'success',
      message: t('common.api.actionSuccess'),
    })
    setIsShowEditCustomCollectionModal(false)
    onRefreshData()
  }

  return (
    <>
      {isCurrentWorkspaceManager && (
        <div className='col-span-1 flex min-h-[108px] cursor-pointer flex-col rounded-xl bg-background-default-dimmed transition-all duration-200 ease-in-out'>
          <div className='group grow rounded-xl' onClick={() => setIsShowEditCustomCollectionModal(true)}>
            <div className='flex shrink-0 items-center p-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-divider-deep group-hover:border-solid group-hover:border-state-accent-hover-alt group-hover:bg-state-accent-hover'>
                <RiAddCircleFill className='h-4 w-4 text-text-quaternary group-hover:text-text-accent'/>
              </div>
              <div className='system-md-semibold ml-3 text-text-secondary group-hover:text-text-accent'>{t('tools.createCustomTool')}</div>
            </div>
          </div>
        </div>
      )}
      {isShowEditCollectionToolModal && (
        <EditCustomToolModal
          payload={null}
          onHide={() => setIsShowEditCustomCollectionModal(false)}
          onAdd={doCreateCustomToolCollection}
        />
      )}
    </>
  )
}
export default Contribute
