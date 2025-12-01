import {
  RiArrowUpDoubleLine,
} from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import type { useMarketplace } from './hooks'
import List from '@/app/components/plugins/marketplace/list'
import Loading from '@/app/components/base/loading'
import { getLocaleOnClient } from '@/i18n-config'

type MarketplaceProps = {
  _searchPluginText: string
  _filterPluginTags: string[]
  isMarketplaceArrowVisible: boolean
  showMarketplacePanel: () => void
  marketplaceContext: ReturnType<typeof useMarketplace>
}
const Marketplace = ({
  _searchPluginText,
  _filterPluginTags,
  isMarketplaceArrowVisible,
  showMarketplacePanel,
  marketplaceContext,
}: MarketplaceProps) => {
  const locale = getLocaleOnClient()
  const { t } = useTranslation()
  const {
    isLoading,
    marketplaceCollections,
    marketplaceCollectionPluginsMap,
    plugins,
    page,
  } = marketplaceContext

  return (
    <>
      <div className='sticky bottom-0 flex shrink-0 flex-col bg-background-default-subtle px-12 pb-[14px] pt-2'>
        {isMarketplaceArrowVisible && (
          <RiArrowUpDoubleLine
            className='absolute left-1/2 top-2 z-10 h-4 w-4 -translate-x-1/2 cursor-pointer text-text-quaternary'
            onClick={showMarketplacePanel}
          />
        )}
        <div className='pb-3 pt-4'>
          <div className='title-2xl-semi-bold bg-gradient-to-r from-[rgba(11,165,236,0.95)] to-[rgba(21,90,239,0.95)] bg-clip-text text-transparent'>
            {t('plugin.marketplace.more')}
          </div>
          <div className='body-md-regular text-center text-text-tertiary'>
            {t('plugin.marketplace.discover')}
          </div>
        </div>
      </div>
      <div className='mt-[-14px] shrink-0 grow bg-background-default-subtle px-12 pb-2'>
        {
          isLoading && page === 1 && (
            <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'>
              <Loading />
            </div>
          )
        }
        {
          (!isLoading || page > 1) && (
            <List
              marketplaceCollections={marketplaceCollections || []}
              marketplaceCollectionPluginsMap={marketplaceCollectionPluginsMap || {}}
              plugins={plugins}
              showInstallButton
              locale={locale}
            />
          )
        }
      </div>
    </>
  )
}

export default Marketplace
