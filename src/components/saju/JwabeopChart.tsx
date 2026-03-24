import type { JwaEntry, PillarDetail } from '@orrery/core/types'
import { stemColorClass } from '../../utils/format.ts'

interface Props {
  jwabeop: JwaEntry[][]   // [시, 일, 월, 년]
  pillars: PillarDetail[]
  unknownTime?: boolean
}

const LABELS = ['時柱', '日柱', '月柱', '年柱']

export default function JwabeopChart({ jwabeop, pillars, unknownTime }: Props) {
  // 최대 지장간 수 (행 수)
  const maxRows = Math.max(...jwabeop.map(entries => entries.length))
  if (maxRows === 0) return null

  return (
    <section>
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2">坐法</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">각 주 지장간이 일지에서 어떤 운성에 좌(坐)하는지</p>
      <div className="overflow-x-auto">
        <table className="w-full text-center text-base font-hanja">
          <thead>
            <tr className="text-sm text-gray-500 dark:text-gray-400">
              {LABELS.map((label, i) => (
                <th key={label} className="py-1 px-2 font-normal">
                  {i === 0 && unknownTime ? '' : `${label} ${pillars[i].pillar.branch}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }, (_, row) => (
              <tr key={row}>
                {jwabeop.map((entries, col) => {
                  if (col === 0 && unknownTime) {
                    return <td key={col} className="py-0.5 px-2 text-gray-300 dark:text-gray-600">?</td>
                  }
                  const entry = entries[row]
                  if (!entry) return <td key={col} className="py-0.5 px-2" />
                  return (
                    <td key={col} className="py-0.5 px-2">
                      <span className={`${stemColorClass(entry.stem)}`}>{entry.stem}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">{entry.sipsin}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-sm ml-1">{entry.unseong}坐</span>
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
