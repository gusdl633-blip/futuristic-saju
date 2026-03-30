import { useState, useMemo } from 'react'
import { findTransits } from '../../../packages/core/src/pillars.js'
import { formatRelation } from '../../utils/format.js'
import { formatGanzi } from '../../utils/sajuDisplay.js'

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
  const typeLabel = (t: string) => (t === '月運' ? '월운(月運)' : t === '歲運' ? '세운(歲運)' : t)
  const natalLabel = (v: string) => (v === '年柱' ? '년주(年柱)' : v === '月柱' ? '월주(月柱)' : v === '日柱' ? '일주(日柱)' : v === '時柱' ? '시주(時柱)' : v)

  const selectClass = 'input-neon text-sm px-2 py-1.5 min-h-9'

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">운세(運勢)</h3>
        <select value={months} onChange={e => setMonths(Number(e.target.value))} className={selectClass}>
          <option value={1}>1개월</option>
          <option value={3}>3개월</option>
          <option value={6}>6개월</option>
        </select>
        <button
          type="button"
          onClick={() => setBackward(!backward)}
          className={`tab text-sm px-4 py-2 transition-all ${backward ? 'active' : 'text-[var(--text-muted)]'}`}
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
                  {typeLabel(tr.type)}
                </span>
                <span className="shrink-0 whitespace-nowrap text-[var(--text-primary)]">{formatGanzi(tr.transit)}</span>
                <span className="text-[var(--text-muted)]">↔</span>
                <span className="w-20 shrink-0 text-[var(--text-muted)]">{natalLabel(tr.natalName)}</span>
                <span className="min-w-0">{relStrs.join(', ')}</span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
