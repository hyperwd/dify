import {
  memo,
} from 'react'
import { useTranslation } from 'react-i18next'
import { useEdges } from 'reactflow'
import ChangeBlock from './change-block'
import {
  canRunBySingle,
} from '@/app/components/workflow/utils'
import {
  useNodeDataUpdate,
  useNodeMetaData,
  useNodesInteractions,
  useNodesReadOnly,
  useNodesSyncDraft,
} from '@/app/components/workflow/hooks'
import ShortcutsName from '@/app/components/workflow/shortcuts-name'
import type { Node } from '@/app/components/workflow/types'

type PanelOperatorPopupProps = {
  id: string
  data: Node['data']
  onClosePopup: () => void
}
const PanelOperatorPopup = ({
  id,
  data,
  onClosePopup,
}: PanelOperatorPopupProps) => {
  const { t } = useTranslation()
  const edges = useEdges()
  const {
    handleNodeDelete,
    handleNodesDuplicate,
    handleNodeSelect,
    handleNodesCopy,
  } = useNodesInteractions()
  const { handleNodeDataUpdate } = useNodeDataUpdate()
  const { handleSyncWorkflowDraft } = useNodesSyncDraft()
  const { nodesReadOnly } = useNodesReadOnly()
  const edge = edges.find(edge => edge.target === id)
  const nodeMetaData = useNodeMetaData({ id, data } as Node)
  const showChangeBlock = !nodeMetaData.isTypeFixed && !nodesReadOnly
  const isChildNode = !!(data.isInIteration || data.isInLoop)

  return (
    <div className='w-[240px] rounded-lg border-[0.5px] border-components-panel-border bg-components-panel-bg shadow-xl'>
      {
        (showChangeBlock || canRunBySingle(data.type, isChildNode)) && (
          <>
            <div className='p-1'>
              {
                canRunBySingle(data.type, isChildNode) && (
                  <div
                    className={`
                      flex h-8 cursor-pointer items-center rounded-lg px-3 text-sm text-text-secondary
                      hover:bg-state-base-hover
                    `}
                    onClick={() => {
                      handleNodeSelect(id)
                      handleNodeDataUpdate({ id, data: { _isSingleRun: true } })
                      handleSyncWorkflowDraft(true)
                      onClosePopup()
                    }}
                  >
                    {t('workflow.panel.runThisStep')}
                  </div>
                )
              }
              {
                showChangeBlock && (
                  <ChangeBlock
                    nodeId={id}
                    nodeData={data}
                    sourceHandle={edge?.sourceHandle || 'source'}
                  />
                )
              }
            </div>
            <div className='h-px bg-divider-regular'></div>
          </>
        )
      }
      {
        !nodesReadOnly && (
          <>
            {
              !nodeMetaData.isSingleton && (
                <>
                  <div className='p-1'>
                    <div
                      className='flex h-8 cursor-pointer items-center justify-between rounded-lg px-3 text-sm text-text-secondary hover:bg-state-base-hover'
                      onClick={() => {
                        onClosePopup()
                        handleNodesCopy(id)
                      }}
                    >
                      {t('workflow.common.copy')}
                      <ShortcutsName keys={['ctrl', 'c']} />
                    </div>
                    <div
                      className='flex h-8 cursor-pointer items-center justify-between rounded-lg px-3 text-sm text-text-secondary hover:bg-state-base-hover'
                      onClick={() => {
                        onClosePopup()
                        handleNodesDuplicate(id)
                      }}
                    >
                      {t('workflow.common.duplicate')}
                      <ShortcutsName keys={['ctrl', 'd']} />
                    </div>
                  </div>
                  <div className='h-px bg-divider-regular'></div>
                </>
              )
            }
            {
              !nodeMetaData.isUndeletable && (
                <>
                  <div className='p-1'>
                    <div
                      className={`
                      flex h-8 cursor-pointer items-center justify-between rounded-lg px-3 text-sm text-text-secondary
                      hover:bg-state-destructive-hover hover:text-text-destructive
                      `}
                      onClick={() => handleNodeDelete(id)}
                    >
                      {t('common.operation.delete')}
                      <ShortcutsName keys={['del']} />
                    </div>
                  </div>
                  <div className='h-px bg-divider-regular'></div>
                </>
              )
            }
          </>
        )
      }
    </div>
  )
}

export default memo(PanelOperatorPopup)
