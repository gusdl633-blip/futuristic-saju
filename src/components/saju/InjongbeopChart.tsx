import type { InjongEntry, PillarDetail } from '@orrery/core/types'
import { ELEMENT_HANJA, STEM_INFO } from '@orrery/core/constants'
import { stemColorClass } from '../../utils/format.ts'

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
    const el = info ? ELEMENT_HANJA[info.element] : '?'
    return `${stem}${el}`
  }).join(' ')

  return (
    <section>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1 font-hanja">引從法</h3>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        日支 <span className="font-hanja text-[var(--text-secondary)]">{dayBranch}</span> 지장간{' '}
        <span className="font-hanja text-[var(--text-secondary)]">{jigangSummary}</span>
        — 누락 십성의 양간 인종
      </p>
      <div className="flex flex-wrap gap-2">
        {injongbeop.map(entry => (
          <div
            key={entry.category}
            className="flex items-center gap-1.5 text-sm border border-[var(--border-glow)] rounded-xl px-3 py-2 bg-[var(--surface-deep)]/60"
          >
            <span className={`font-hanja ${stemColorClass(entry.yangStem)}`}>
              {entry.yangStem}{ELEMENT_HANJA[STEM_INFO[entry.yangStem]?.element ?? ''] ?? ''}
            </span>
            <span className="text-[var(--text-muted)] font-hanja">{entry.category}</span>
            <span className="text-[var(--neon-cyan)]">→</span>
            <span className="font-hanja text-[var(--text-secondary)]">{entry.unseong}從</span>
          </div>
        ))}
      </div>
    </section>
  )
}
