import type { InjongEntry, PillarDetail } from '@orrery/core/types'
import { ELEMENT_HANJA } from '@orrery/core/constants'
import { STEM_INFO } from '@orrery/core/constants'
import { stemColorClass } from '../../utils/format.ts'

interface Props {
  injongbeop: InjongEntry[]
  pillars: PillarDetail[] // [시, 일, 월, 년]
}

export default function InjongbeopChart({ injongbeop, pillars }: Props) {
  if (injongbeop.length === 0) return null

  const dayBranch = pillars[1].pillar.branch
  const jigang = pillars[1].jigang.replace(/ /g, '')

  // 일지 지장간의 십신 요약
  const jigangSummary = [...jigang].map(stem => {
    const info = STEM_INFO[stem]
    const el = info ? ELEMENT_HANJA[info.element] : '?'
    return `${stem}${el}`
  }).join(' ')

  return (
    <section>
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2">引從法</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">
        日支 <span className="font-hanja">{dayBranch}</span> 지장간:
        <span className="font-hanja ml-1">{jigangSummary}</span>
        — 누락 십성의 양간 인종
      </p>
      <div className="flex flex-wrap gap-3">
        {injongbeop.map(entry => (
          <div
            key={entry.category}
            className="flex items-center gap-1.5 text-base border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1.5"
          >
            <span className={`font-hanja ${stemColorClass(entry.yangStem)}`}>
              {entry.yangStem}{ELEMENT_HANJA[STEM_INFO[entry.yangStem]?.element ?? ''] ?? ''}
            </span>
            <span className="text-gray-500 dark:text-gray-400 font-hanja">{entry.category}</span>
            <span className="text-gray-400 dark:text-gray-500">→</span>
            <span className="font-hanja">{entry.unseong}從</span>
          </div>
        ))}
      </div>
    </section>
  )
}
