import { useMemo, useState } from 'react'
import { calculateSaju } from '../../../packages/core/src/saju.js'
import CopyButton from '../CopyButton.js'
import { sajuToText } from '../../utils/text-export.js'
import type { BirthInput, Element } from '../../../packages/core/src/types.js'
import PillarTable from './PillarTable.js'
import CategoryInterpretationView from './CategoryInterpretationView.js'
import { STEM_INFO, BRANCH_ELEMENT } from '../../../packages/core/src/constants.js'
import { stemColorClass, branchColorClass } from '../../utils/format.js'
import { formatStemMainSub, formatBranchMainSub, elementPlainKr } from '../../utils/sajuDisplay.js'
import type { IntegratedReportEntry } from '../../utils/resultCache.js'

const card =
  'rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[var(--card-bg)] backdrop-blur-md p-4 sm:p-5 shadow-[0_0_24px_rgba(59,130,246,0.06)] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)]'

interface Props {
  input: BirthInput
  integratedReport: IntegratedReportEntry | null
  onIntegratedReportComplete: (entry: IntegratedReportEntry) => void
  onClearIntegratedReport?: () => void
}

export default function SajuOverviewView({
  input,
  integratedReport,
  onIntegratedReportComplete,
  onClearIntegratedReport,
}: Props) {
  const result = useMemo(() => calculateSaju(input), [input])
  const [preferKorean, setPreferKorean] = useState(true)
  const pillarCards = useMemo(
    () => [
      { label: '년주', p: result.pillars[3] },
      { label: '월주', p: result.pillars[2] },
      { label: '일주', p: result.pillars[1] },
      { label: '시주', p: result.pillars[0] },
    ],
    [result.pillars],
  )
  const structureLine = useMemo(() => {
    const counts: Record<Element, number> = { tree: 0, fire: 0, earth: 0, metal: 0, water: 0 }
    for (const p of result.pillars) {
      const se = STEM_INFO[p.pillar.stem]?.element
      const be = BRANCH_ELEMENT[p.pillar.branch]
      if (se) counts[se] += 1
      if (be) counts[be] += 1
    }
    const sorted = (Object.entries(counts) as [Element, number][])
      .sort((a, b) => b[1] - a[1])
      .filter(([, n]) => n > 0)

    const top = sorted[0]
    const second = sorted[1]
    if (!top) return '균형 잡힌 혼합형 구조'
    if (!second || top[1] - second[1] >= 2) {
      return `${elementPlainKr(top[0])} 중심의 추진형 구조`
    }
    return `${elementPlainKr(top[0])}과 ${elementPlainKr(second[0])} 중심의 확장형 구조`
  }, [result.pillars])

  return (
    <div className="space-y-4">
      <CategoryInterpretationView
        input={input}
        sectionTitle="통합 흐름 해석"
        sectionDescription="사주·자미두수·점성술 계산 근거를 바탕으로 한 전문가형 리포트입니다."
        cachedIntegratedReport={integratedReport}
        onIntegratedReportComplete={onIntegratedReportComplete}
        onClearIntegratedReport={onClearIntegratedReport}
      />

      <section className={card}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">명식 요약</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">당신의 구조를 이루는 기본 흐름</p>
            <p className="mt-2 text-sm sm:text-base font-semibold text-[var(--text-primary)]">{structureLine}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preferKorean}
                onChange={e => setPreferKorean(e.target.checked)}
                className="rounded border-[var(--border-glow)]"
              />
              한글 표시
            </label>
            <CopyButton label="명식 복사" getText={() => sajuToText(result)} />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {pillarCards.map(({ label, p }, idx) => {
            const unknown = idx === 3 && input.unknownTime
            const sm = formatStemMainSub(p.pillar.stem)
            const bm = formatBranchMainSub(p.pillar.branch)
            return (
              <div key={label} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5">
                <p className="text-[11px] text-[var(--text-muted)] mb-1.5">{label}</p>
                {unknown
                  ? (
                      <p className="text-sm text-[var(--text-muted)]">시간 정보 없음</p>
                    )
                  : (
                      <div className="space-y-2">
                        <div>
                          <p className={`text-sm font-semibold leading-snug ${stemColorClass(p.pillar.stem)}`}>
                            {sm.main}
                          </p>
                          {sm.sub
                            ? <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">{sm.sub}</p>
                            : null}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold leading-snug ${branchColorClass(p.pillar.branch)}`}>
                            {bm.main}
                          </p>
                          {bm.sub
                            ? <p className="text-[11px] text-[var(--text-muted)] leading-tight mt-0.5">{bm.sub}</p>
                            : null}
                        </div>
                      </div>
                    )}
              </div>
            )
          })}
        </div>

        <PillarTable pillars={result.pillars} unknownTime={input.unknownTime} preferKorean={preferKorean} />
      </section>

    </div>
  )
}
