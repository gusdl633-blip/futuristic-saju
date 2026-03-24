import type { PillarDetail } from '@orrery/core/types'
import {
  stemColorClass,
  branchColorClass,
  stemSolidBgClass,
  branchSolidBgClass,
  elementSolidBgClass,
  stemElement,
} from '../../utils/format.ts'

interface Props {
  pillars: PillarDetail[]
  unknownTime?: boolean
}

export default function PillarTable({ pillars, unknownTime }: Props) {
  const labels = ['時柱', '日柱', '月柱', '年柱']
  const muted = 'text-[var(--text-muted)]'
  const cellMuted = 'text-[var(--text-muted)] opacity-50'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center text-base">
        <thead>
          <tr className={`text-sm ${muted}`}>
            <td className="py-1 pr-2 text-right w-12" />
            {labels.map(label => (
              <th key={label} className="py-1 px-1 sm:px-3 font-normal text-[var(--neon-cyan)]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-hanja">
          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>십신</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-3 ${i === 0 && unknownTime ? cellMuted : stemColorClass(p.pillar.stem)}`}>
                {i === 0 && unknownTime ? '?' : p.stemSipsin}
              </td>
            ))}
          </tr>

          <tr className="text-2xl">
            <td className={`pr-2 text-right text-sm ${muted} whitespace-nowrap`}>천간</td>
            {pillars.map((p, i) => (
              <td key={i} className="py-1 px-1 sm:px-3">
                {i === 0 && unknownTime
                  ? (
                      <span className="inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] border border-[var(--border-subtle)] bg-[var(--surface-deep)] text-[var(--text-muted)]">
                        ?
                      </span>
                    )
                  : (
                      <span className={`inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] ${stemSolidBgClass(p.pillar.stem)}`}>
                        {p.pillar.stem}
                      </span>
                    )}
              </td>
            ))}
          </tr>

          <tr className="text-2xl">
            <td className={`pr-2 text-right text-sm ${muted} whitespace-nowrap`}>지지</td>
            {pillars.map((p, i) => (
              <td key={i} className="py-1 px-1 sm:px-3">
                {i === 0 && unknownTime
                  ? (
                      <span className="inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] border border-[var(--border-subtle)] bg-[var(--surface-deep)] text-[var(--text-muted)]">
                        ?
                      </span>
                    )
                  : (
                      <span className={`inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] ${branchSolidBgClass(p.pillar.branch)}`}>
                        {p.pillar.branch}
                      </span>
                    )}
              </td>
            ))}
          </tr>

          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>십신</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-3 ${i === 0 && unknownTime ? cellMuted : branchColorClass(p.pillar.branch)}`}>
                {i === 0 && unknownTime ? '?' : p.branchSipsin}
              </td>
            ))}
          </tr>

          <tr>
            <td colSpan={5} className="py-2">
              <div className="border-t border-[var(--border-subtle)]" />
            </td>
          </tr>

          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>운성</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-3 ${i === 0 && unknownTime ? cellMuted : ''}`}>
                {i === 0 && unknownTime ? '?' : p.unseong}
              </td>
            ))}
          </tr>

          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>신살</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-3 ${i === 0 && unknownTime ? cellMuted : ''}`}>
                {i === 0 && unknownTime ? '?' : p.sinsal}
              </td>
            ))}
          </tr>

          <tr className="text-sm">
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>장간</td>
            {pillars.map((p, i) => (
              <td key={i} className="py-0.5 px-1 sm:px-3">
                {i === 0 && unknownTime
                  ? <span className={cellMuted}>?</span>
                  : (
                      <span className="inline-flex gap-0.5 justify-center">
                        {[...p.jigang].map((ch, j) =>
                          ch === ' '
                            ? <span key={j} className="inline-block w-4" />
                            : (
                                <span
                                  key={j}
                                  className={`inline-flex items-center justify-center w-4 h-4 leading-none rounded-sm pb-px ${elementSolidBgClass(stemElement(ch))}`}
                                >
                                  {ch}
                                </span>
                              ),
                        )}
                      </span>
                    )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
