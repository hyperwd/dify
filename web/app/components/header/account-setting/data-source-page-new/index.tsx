import { memo } from 'react'
import Card from './card'
import { useGetDataSourceListAuth } from '@/service/use-datasource'

const DataSourcePage = () => {
  const { data } = useGetDataSourceListAuth()

  return (
    <div>
      <div className='space-y-2'>
        {
          data?.result.map(item => (
            <Card
              key={item.plugin_unique_identifier}
              item={item}
            />
          ))
        }
      </div>
    </div>
  )
}

export default memo(DataSourcePage)
