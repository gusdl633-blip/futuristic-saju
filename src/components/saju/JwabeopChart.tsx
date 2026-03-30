import type { JwaEntry, PillarDetail } from '../../../packages/core/src/types.js'
import { stemColorClass } from '../../utils/format.js'
import { formatJi, formatGan, sipsinToKorean, unseongToKorean, pillarLabelToKorean } from '../../utils/sajuDisplay.js'

interface Props {
  jwabeop: JwaEntry[][]
  pillars: PillarDetail[]
  unknownTime?: boolean
}

const LABELS = ['時柱', '日柱', '月柱', '年柱']

export default function JwabeopChart({ jwabeop, pillars, unknownTime }: Props) {
  const maxRows = Math.max(...jwabeop.map(entries => entries.length))
  if (maxRows === 0) return null

  return (
    <section>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">좌법(坐法)</h3>
      <p className="text-xs text-[var(--text-muted)] mb-3">각 주 지장간이 일지에서 맞는 운성(좌(坐))</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-base">
          <thead>
            <tr className="text-xs text-[var(--neon-cyan)]">
              {LABELS.map((label, i) => (
                <th key={label} className="py-2 px-2 font-medium">
                  {i === 0 && unknownTime ? '시주 미입력' : `${pillarLabelToKorean(label)} ${formatJi(pillars[i].pillar.branch)}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[var(--text-secondary)]">
            {Array.from({ length: maxRows }, (_, row) => (
              <tr key={row} className="border-t border-[var(--border-subtle)]">
                {jwabeop.map((entries, col) => {
                  if (col === 0 && unknownTime) {
                    return <td key={col} className="py-1 px-2 text-[var(--text-muted)]">미입력</td>
                  }
                  const entry = entries[row]
                  if (!entry) return <td key={col} className="py-1 px-2" />
                  return (
                    <td key={col} className="py-1.5 px-2">
                      <span className={stemColorClass(entry.stem)}>{formatGan(entry.stem)}</span>
                      <span className="text-[var(--text-muted)] text-sm ml-1">{sipsinToKorean(entry.sipsin)}</span>
                      <span className="text-[var(--text-muted)] text-xs ml-1">{unseongToKorean(entry.unseong)} 좌(坐)</span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
