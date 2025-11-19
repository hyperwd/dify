'use client'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  RiAddCircleFill,
} from '@remixicon/react'
import MCPModal from './modal'
import { useAppContext } from '@/context/app-context'
import { useCreateMCP } from '@/service/use-tools'
import type { ToolWithProvider } from '@/app/components/workflow/types'

type Props = {
  handleCreate: (provider: ToolWithProvider) => void
}

const NewMCPCard = ({ handleCreate }: Props) => {
  const { t } = useTranslation()
  const { isCurrentWorkspaceManager } = useAppContext()

  const { mutateAsync: createMCP } = useCreateMCP()

  const create = async (info: any) => {
    const provider = await createMCP(info)
    handleCreate(provider)
  }

  const [showModal, setShowModal] = useState(false)

  return (
    <>
      {isCurrentWorkspaceManager && (
        <div className='col-span-1 flex min-h-[108px] cursor-pointer flex-col rounded-xl bg-background-default-dimmed transition-all duration-200 ease-in-out'>
          <div className='group grow rounded-xl' onClick={() => setShowModal(true)}>
            <div className='flex shrink-0 items-center p-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-divider-deep group-hover:border-solid group-hover:border-state-accent-hover-alt group-hover:bg-state-accent-hover'>
                <RiAddCircleFill className='h-4 w-4 text-text-quaternary group-hover:text-text-accent'/>
              </div>
              <div className='system-md-semibold ml-3 text-text-secondary group-hover:text-text-accent'>{t('tools.mcp.create.cardTitle')}</div>
            </div>
          </div>
        </div>
      )}
      {showModal && (
        <MCPModal
          show={showModal}
          onConfirm={create}
          onHide={() => setShowModal(false)}
        />
      )}
    </>
  )
}
export default NewMCPCard
