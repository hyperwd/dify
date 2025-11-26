'use client'
import type { FC } from 'react'
import React from 'react'
import cn from '@/utils/classnames'
import { Tag01 } from '@/app/components/base/icons/src/vender/line/financeAndECommerce'

export type ITagCategoryProps = {
  className?: string
  tags: string[]
  value: string
  onChange: (value: string) => void
  allTagsText: string
}

const TagCategory: FC<ITagCategoryProps> = ({
  className,
  tags,
  value,
  onChange,
  allTagsText,
}) => {
  const allTagsList = [allTagsText, ...tags]

  const itemClassName = (isSelected: boolean) => cn(
    'flex h-[32px] cursor-pointer items-center rounded-lg border-[0.5px] border-transparent px-3 py-[7px] font-medium leading-[18px] text-text-tertiary hover:bg-components-main-nav-nav-button-bg-active',
    isSelected && 'border-components-main-nav-nav-button-border bg-components-main-nav-nav-button-bg-active text-components-main-nav-nav-button-text-active shadow-xs',
  )

  return (
    <div className={cn(className, 'flex flex-wrap gap-1 text-[13px]')}>
      {allTagsList.map(tagName => (
        <div
          key={tagName}
          className={itemClassName(tagName === value)}
          onClick={() => onChange(tagName)}
        >
          {tagName === allTagsText && <Tag01 className='mr-1 h-3.5 w-3.5' />}
          {tagName}
        </div>
      ))}
    </div>
  )
}

export default React.memo(TagCategory)
