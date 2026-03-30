import { useRef, useEffect } from 'react'
import type { ZiweiChart } from '../../../packages/core/src/types.js'
import { getDaxianList } from '../../../packages/core/src/ziwei.js'
import { stemSolidBgClass, branchSolidBgClass } from '../../utils/format.js'
import { formatGan, formatJi, formatPalaceName, formatStarName } from '../../utils/ziweiDisplay.js'

interface Props {
  chart: ZiweiChart
}

function findActiveDaxianIndex(
  daxianList: Array<{ ageStart: number; ageEnd: number }>,
  birthYear: number,
): number {
  const currentAge = new Date().getFullYear() - birthYear
  for (let i = daxianList.length - 1; i >= 0; i--) {
    if (currentAge >= daxianList[i].ageStart) return i
  }
  return -1
}

export default function DaxianTable({ chart }: Props) {
  const daxianList = getDaxianList(chart)
  const activeIdx = findActiveDaxianIndex(daxianList, chart.solarYear)
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
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2">대한(大限)</h3>
      <div ref={scrollRef} className="overflow-x-auto py-1">
        <div className="flex flex-row-reverse gap-1 w-fit">
          {daxianList.map((dx, i) => {
            const isActive = i === activeIdx
            const gan = dx.ganZhi[0]
            const zhi = dx.ganZhi[1]
            return (
              <div
                key={i}
                ref={isActive ? activeRef : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-lg px-0.5 py-1 ${isActive ? 'ring-2 ring-amber-400 dark:ring-amber-500 bg-amber-50 dark:bg-amber-950' : ''}`}
              >
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {dx.ageStart}-{dx.ageEnd}세(歲)
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">{formatPalaceName(dx.palaceName)}</span>
                <span className={`inline-flex items-center justify-center w-8 h-8 leading-none text-base rounded pb-[2px] ${stemSolidBgClass(gan)}`}>
                  {formatGan(gan)}
                </span>
                <span className={`inline-flex items-center justify-center w-8 h-8 leading-none text-base rounded pb-[2px] ${branchSolidBgClass(zhi)}`}>
                  {formatJi(zhi)}
                </span>
                {dx.mainStars.length > 0 ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center leading-tight mt-0.5">
                    {dx.mainStars.map(s => (
                      <div key={s}>{formatStarName(s)}</div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">공궁(空宮)</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
