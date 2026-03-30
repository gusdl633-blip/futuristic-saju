import type { InjongEntry, PillarDetail } from '../../../packages/core/src/types.js'
import { STEM_INFO } from '../../../packages/core/src/constants.js'
import { stemColorClass } from '../../utils/format.js'
import { formatGan, formatJi, formatElementKoreanHanja, sipsinToKorean, unseongToKorean } from '../../utils/sajuDisplay.js'

interface Props {
  injongbeop: InjongEntry[]
  pillars: PillarDetail[]
}

export default function InjongbeopChart({ injongbeop, pillars }: Props) {
  if (injongbeop.length === 0) return null

  const dayBranch = pillars[1].pillar.branch
  const jigang = pillars[1].jigang.replace(/ /g, '')

  const jigangSummary = [...jigang].map(stem => {
    const info = STEM_INFO[stem]
    const el = info ? formatElementKoreanHanja(info.element) : '알 수 없음'
    return `${formatGan(stem)} ${el}`
  }).join(' ')

  return (
    <section>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">인종법(引從法)</h3>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        일지(日支) <span className="text-[var(--text-secondary)]">{formatJi(dayBranch)}</span> 지장간(地藏干){' '}
        <span className="text-[var(--text-secondary)]">{jigangSummary}</span>
        — 누락 십성의 양간 인종
      </p>
      <div className="flex flex-wrap gap-2">
        {injongbeop.map(entry => (
          <div
            key={entry.category}
            className="flex items-center gap-1.5 text-sm border border-[var(--border-glow)] rounded-xl px-3 py-2 bg-[var(--surface-deep)]/60"
          >
            <span className={`${stemColorClass(entry.yangStem)}`}>
              {formatGan(entry.yangStem)} {formatElementKoreanHanja(STEM_INFO[entry.yangStem]?.element)}
            </span>
            <span className="text-[var(--text-muted)]">{sipsinToKorean(entry.category)}</span>
            <span className="text-[var(--neon-cyan)]">→</span>
            <span className="text-[var(--text-secondary)]">{unseongToKorean(entry.unseong)} 종(從)</span>
          </div>
        ))}
      </div>
    </section>
  )
}
