import { useState, useMemo } from 'react'
import { findTransits } from '@orrery/core/pillars'
import { formatRelation } from '../../utils/format.ts'

interface Props {
  natalPillars: string[]
}

export default function TransitView({ natalPillars }: Props) {
  const [months, setMonths] = useState(1)
  const [backward, setBackward] = useState(false)

  const transits = useMemo(
    () => findTransits(natalPillars, months, backward),
    [natalPillars, months, backward],
  )

  const direction = backward ? '과거' : '향후'

  const selectClass =
    'text-sm rounded-lg border border-[var(--border-glow)] bg-[var(--surface-elevated)] px-2 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--neon-primary-muted)]'

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)] font-hanja">運勢</h3>
        <select value={months} onChange={e => setMonths(Number(e.target.value))} className={selectClass}>
          <option value={1}>1개월</option>
          <option value={3}>3개월</option>
          <option value={6}>6개월</option>
        </select>
        <button
          type="button"
          onClick={() => setBackward(!backward)}
          className={`text-sm px-3 py-1 rounded-lg border transition-all ${
            backward
              ? 'border-[var(--neon-primary-muted)] bg-[var(--neon-primary-dim)] text-[var(--neon-primary)]'
              : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-glow)]'
          }`}
        >
          {backward ? '과거' : '미래'}
        </button>
      </div>

      {transits.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          ({direction} {months}개월간 특별한 관계 없음)
        </p>
      ) : (
        <div className="text-sm space-y-1 max-h-80 overflow-y-auto pr-1">
          {transits.map((tr, i) => {
            const date = tr.date
            const dateStr = `${String(date.getMonth() + 1).padStart(2, ' ')}월 ${String(date.getDate()).padStart(2, ' ')}일`
            const relStrs = tr.relations.map(r => `${r.prefix}${formatRelation(r.relation)}`)

            return (
              <div key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)] w-14 shrink-0 tabular-nums">{dateStr}</span>
                <span
                  className={`w-9 shrink-0 font-medium ${tr.type === '月運' ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-muted)]'}`}
                >
                  {tr.type}
                </span>
                <span className="font-hanja shrink-0 whitespace-nowrap text-[var(--text-primary)]">{tr.transit}</span>
                <span className="text-[var(--text-muted)]">↔</span>
                <span className="w-9 shrink-0 text-[var(--text-muted)]">{tr.natalName}</span>
                <span className="min-w-0">{relStrs.join(', ')}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
