import type { PillarDetail } from '../../../packages/core/src/types.js'
import {
  stemColorClass,
  branchColorClass,
  stemSolidBgClass,
  branchSolidBgClass,
  elementSolidBgClass,
  stemElement,
} from '../../utils/format.js'
import {
  formatStemMainSub,
  formatBranchMainSub,
  formatGan,
  formatJi,
  formatElementKoreanHanja,
  sipsinToKorean,
  unseongToKorean,
  sinsalToKorean,
} from '../../utils/sajuDisplay.js'

interface Props {
  pillars: PillarDetail[]
  unknownTime?: boolean
  /** 기본 true — 한글(오행) 메인, 한자는 작게 */
  preferKorean?: boolean
}

export default function PillarTable({ pillars, unknownTime, preferKorean = true }: Props) {
  const labels = ['시주', '일주', '월주', '년주']
  const muted = 'text-[var(--text-muted)]'
  const cellMuted = 'text-[var(--text-muted)] opacity-50'

  function StemCell({ stem, i }: { stem: string; i: number }) {
    const unknown = i === 0 && unknownTime
    if (unknown) {
      return (
        <span className="inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] border border-[var(--border-subtle)] bg-[var(--surface-deep)] text-[var(--text-muted)]">
          미입력
        </span>
      )
    }
    if (preferKorean) {
      const { main, sub } = formatStemMainSub(stem)
      return (
        <div
          className={`inline-flex flex-col items-center justify-center min-w-[4.75rem] max-w-[6.5rem] py-1.5 px-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-deep)]/40`}
        >
          <span className={`text-xs sm:text-sm font-medium leading-snug text-center ${stemColorClass(stem)}`}>
            {main}
          </span>
          {sub
            ? (
                <span className="text-[11px] text-[var(--text-muted)] leading-none mt-1">{sub}</span>
              )
            : null}
        </div>
      )
    }
    return (
      <span className={`inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] text-lg ${stemSolidBgClass(stem)}`}>
        {stem}
      </span>
    )
  }

  function BranchCell({ branch, i }: { branch: string; i: number }) {
    const unknown = i === 0 && unknownTime
    if (unknown) {
      return (
        <span className="inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] border border-[var(--border-subtle)] bg-[var(--surface-deep)] text-[var(--text-muted)]">
          미입력
        </span>
      )
    }
    if (preferKorean) {
      const { main, sub } = formatBranchMainSub(branch)
      return (
        <div
          className={`inline-flex flex-col items-center justify-center min-w-[4.75rem] max-w-[6.5rem] py-1.5 px-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-deep)]/40`}
        >
          <span className={`text-xs sm:text-sm font-medium leading-snug text-center ${branchColorClass(branch)}`}>
            {main}
          </span>
          {sub
            ? (
                <span className="text-[11px] text-[var(--text-muted)] leading-none mt-1">{sub}</span>
              )
            : null}
        </div>
      )
    }
    return (
      <span className={`inline-flex items-center justify-center w-10 h-10 leading-none rounded-lg pb-[3px] text-lg ${branchSolidBgClass(branch)}`}>
        {branch}
      </span>
    )
  }

  function sipsinLabel(hanja: string): string {
    return sipsinToKorean(hanja)
  }

  function unseongLabel(hanja: string): string {
    return unseongToKorean(hanja)
  }

  function sinsalLabel(hanja: string): string {
    return sinsalToKorean(hanja)
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center text-base">
        <thead>
          <tr className={`text-sm ${muted}`}>
            <td className="py-1 pr-2 text-right w-12" />
            {labels.map(label => (
              <th key={label} className="py-1 px-1 sm:px-2 font-normal text-[var(--neon-cyan)]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>십신</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-2 ${i === 0 && unknownTime ? cellMuted : stemColorClass(p.pillar.stem)}`}>
                {i === 0 && unknownTime ? '미입력' : sipsinLabel(p.stemSipsin)}
              </td>
            ))}
          </tr>

          <tr className={preferKorean ? 'text-sm' : 'text-2xl'}>
            <td className={`pr-2 text-right text-sm ${muted} whitespace-nowrap align-middle`}>천간</td>
            {pillars.map((p, i) => (
              <td key={i} className="py-1 px-1 sm:px-2 align-middle">
                <StemCell stem={p.pillar.stem} i={i} />
              </td>
            ))}
          </tr>

          <tr className={preferKorean ? 'text-sm' : 'text-2xl'}>
            <td className={`pr-2 text-right text-sm ${muted} whitespace-nowrap align-middle`}>지지</td>
            {pillars.map((p, i) => (
              <td key={i} className="py-1 px-1 sm:px-2 align-middle">
                <BranchCell branch={p.pillar.branch} i={i} />
              </td>
            ))}
          </tr>

          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>십신</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-2 ${i === 0 && unknownTime ? cellMuted : branchColorClass(p.pillar.branch)}`}>
                {i === 0 && unknownTime ? '미입력' : sipsinLabel(p.branchSipsin)}
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
              <td key={i} className={`py-0.5 px-1 sm:px-2 ${i === 0 && unknownTime ? cellMuted : ''}`}>
                {i === 0 && unknownTime ? '미입력' : unseongLabel(p.unseong)}
              </td>
            ))}
          </tr>

          <tr className={`text-sm text-[var(--text-secondary)]`}>
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>신살</td>
            {pillars.map((p, i) => (
              <td key={i} className={`py-0.5 px-1 sm:px-2 ${i === 0 && unknownTime ? cellMuted : ''}`}>
                {i === 0 && unknownTime ? '미입력' : sinsalLabel(p.sinsal)}
              </td>
            ))}
          </tr>

          <tr className="text-sm">
            <td className={`pr-2 text-right ${muted} whitespace-nowrap`}>장간</td>
            {pillars.map((p, i) => (
              <td key={i} className="py-0.5 px-1 sm:px-2">
                {i === 0 && unknownTime
                  ? <span className={cellMuted}>미입력</span>
                  : (
                      <span className="inline-flex flex-wrap gap-1 justify-center">
                        {[...p.jigang]
                          .filter(ch => ch !== ' ')
                          .map((ch, j) => (
                            <span
                              key={j}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs ${elementSolidBgClass(stemElement(ch))}`}
                            >
                              <span>{formatGan(ch)}</span>
                              <span className="opacity-80">{formatElementKoreanHanja(stemElement(ch))}</span>
                            </span>
                          ))}
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
