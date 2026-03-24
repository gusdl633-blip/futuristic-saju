import { useRef, useEffect } from 'react'
import type { DaewoonItem } from '@orrery/core/types'
import { stemColorClass, branchColorClass, stemSolidBgClass, branchSolidBgClass } from '../../utils/format.ts'

interface Props {
  daewoon: DaewoonItem[]
  unknownTime?: boolean
}

function findActiveDaewoonIndex(daewoon: DaewoonItem[]): number {
  const now = new Date()
  let activeIdx = -1
  for (let i = 0; i < daewoon.length; i++) {
    if (daewoon[i].startDate <= now) {
      activeIdx = i
    }
  }
  return activeIdx
}

export default function DaewoonTable({ daewoon, unknownTime }: Props) {
  if (daewoon.length === 0) {
    return (
      <section>
        <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2">大運</h3>
        <p className="text-base text-gray-400 dark:text-gray-500">대운 데이터가 없습니다.</p>
      </section>
    )
  }

  const activeIdx = findActiveDaewoonIndex(daewoon)
  const activeRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = activeRef.current
      container.scrollLeft = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2
    }
  }, [activeIdx])

  return (
    <section>
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2">大運</h3>
      {unknownTime && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
          출생 시간 없이 정오(12:00) 기준으로 계산하여 대운 시작 시기에 수개월 오차가 있을 수 있습니다.
        </p>
      )}
      <div ref={scrollRef} className="overflow-x-auto py-1">
        <div className="flex flex-row-reverse gap-2 w-fit font-hanja">
          {daewoon.map((dw, i) => {
            const isActive = i === activeIdx
            const stem = dw.ganzi[0]
            const branch = dw.ganzi[1]
            return (
              <div
                key={dw.index}
                ref={isActive ? activeRef : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1 ${isActive ? 'ring-2 ring-amber-400 dark:ring-amber-500 bg-amber-50 dark:bg-amber-950' : ''}`}
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">{dw.age}세</span>
                <span className={`text-sm ${stemColorClass(stem)}`}>{dw.stemSipsin}</span>
                <span className={`inline-flex items-center justify-center w-8 h-8 leading-none text-base rounded pb-[2px] ${stemSolidBgClass(stem)}`}>
                  {stem}
                </span>
                <span className={`inline-flex items-center justify-center w-8 h-8 leading-none text-base rounded pb-[2px] ${branchSolidBgClass(branch)}`}>
                  {branch}
                </span>
                <span className={`text-sm ${branchColorClass(branch)}`}>{dw.branchSipsin}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{dw.unseong}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{dw.sinsal}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
