'use client'

import { memo, useMemo } from 'react'

/** 카드 요약 곡선은 SVG만 사용하고 상세 차트 라이브러리는 시트를 열 때 받는다. */
export const TemplateSparkline = memo(function TemplateSparkline({ values, color, id }: {
  values: readonly number[]; color: string; id: string
}) {
  const line = useMemo(() => {
    const max = values.reduce((largest, value) => Math.max(largest, value), 1)
    return values.map((value, index) => `${index === 0 ? 'M' : 'L'}${values.length > 1 ? index / (values.length - 1) * 100 : 0},${38 - Math.max(0, value) / max * 36}`).join(' ')
  }, [values])
  const gradientId = `spark-${id}`
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.3} /><stop offset="100%" stopColor={color} stopOpacity={0.02} /></linearGradient></defs>
      {line && <><path d={`${line} L100,40 L0,40 Z`} fill={`url(#${gradientId})`} /><path d={line} fill="none" stroke={color} strokeWidth={1.5} vectorEffect="non-scaling-stroke" /></>}
    </svg>
  )
})
