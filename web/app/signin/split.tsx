'use client'
import type { FC } from 'react'
import React from 'react'
import cn from '@/utils/classnames'

type Props = {
  className?: string
}

const Split: FC<Props> = ({
  className,
}) => {
  return (
    <div
      className={cn('h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent', className)}>
    </div>
  )
}
export default React.memo(Split)
