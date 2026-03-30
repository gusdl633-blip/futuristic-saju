import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import BirthForm from './BirthForm.js'
import type { BirthFormHandle, SavedFormState } from './BirthForm.js'
import ProfileModal from './ProfileModal.js'
import CopyButton from './CopyButton.js'
import ThemeToggle from './ThemeToggle.js'
import SajuView from './saju/SajuView.js'
import SajuOverviewView from './saju/SajuOverviewView.js'
import ZiweiView from './ziwei/ZiweiView.js'
import NatalView from './natal/NatalView.js'
import { calculateSaju } from '../../packages/core/src/saju.js'
import { createChart } from '../../packages/core/src/ziwei.js'
import { calculateNatal } from '../../packages/core/src/natal.js'
import { sajuToText, ziweiToText, natalToText } from '../utils/text-export.js'
import type { BirthInput } from '../../packages/core/src/types.js'
import { callGeminiProxy } from '../lib/geminiClient.js'
import { buildSajuFactSheet } from '../lib/sajuInterpretationContext.js'
import {
  buildResultCacheKey,
  emptyFortuneReports,
  loadOrreryPersisted,
  persistFortuneReportsForInput,
  saveOrreryPersisted,
  toPersistedFortuneSlice,
  type OrreryPersistedPayload,
} from '../utils/resultCache.js'

/** 부가 도구 (기능 유지) */
type ToolTab = 'saju' | 'detail' | 'ziwei' | 'natal'
type SajuSubTab = 'integrated' | 'wealth' | 'love' | 'marriage' | 'career' | 'health'

type FortuneKey = Exclude<SajuSubTab, 'integrated'>

const FORTUNE_TITLES = ['사주팔자 분석', '자미두수 분석', '점성술 분석', '종합 해석', '핵심 조언'] as const

function parseFortuneSections(content: string) {
  const titles = [...FORTUNE_TITLES]
  const normalized = String(content ?? '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')

  function normalizeLine(s: string) {
    return s
      .trim()
      .replace(/^[-–—•*#\s]+/g, '')
      .replace(/^\d+[.)]\s*/g, '')
      .replace(/[:：]\s*$/g, '')
  }

  const sections: Array<{ title: string; body: string }> = []
  let currentTitle: string | null = null
  let bodyLines: string[] = []

  for (const line of lines) {
    const trimmed = normalizeLine(line)
    if (titles.includes(trimmed as (typeof titles)[number])) {
      if (currentTitle) sections.push({ title: currentTitle, body: bodyLines.join('\n').trim() })
      currentTitle = trimmed
      bodyLines = []
      continue
    }
    if (currentTitle) bodyLines.push(line)
  }
  if (currentTitle) sections.push({ title: currentTitle, body: bodyLines.join('\n').trim() })
  return sections
}

export default function App() {
  const [toolTab, setToolTab] = useState<ToolTab>('saju')
  const [sajuSubTab, setSajuSubTab] = useState<SajuSubTab>('integrated')
  const [birthInput, setBirthInput] = useState<BirthInput | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [externalFormState, setExternalFormState] = useState<SavedFormState | null>(null)
  /** 동일 생년월일시 기준 통합 리포트 등 (탭 이동·재마운트 후에도 유지) */
  const [persistedResults, setPersistedResults] = useState<OrreryPersistedPayload | null>(null)

  const [fortuneReports, setFortuneReports] = useState<Record<SajuSubTab, string | null>>({
    integrated: null,
    wealth: null,
    love: null,
    marriage: null,
    career: null,
    health: null,
  })
  const [fortuneLoading, setFortuneLoading] = useState<Record<SajuSubTab, boolean>>({
    integrated: false,
    wealth: false,
    love: false,
    marriage: false,
    career: false,
    health: false,
  })
  const [fortuneError, setFortuneError] = useState<Record<SajuSubTab, string | null>>({
    integrated: null,
    wealth: null,
    love: null,
    marriage: null,
    career: null,
    health: null,
  })
  const resultsRef = useRef<HTMLDivElement>(null)
  const birthFormRef = useRef<BirthFormHandle>(null)
  const fortuneReportsRef = useRef(fortuneReports)
  const fortuneInFlightRef = useRef<Partial<Record<FortuneKey, boolean>>>({})
  useEffect(() => {
    fortuneReportsRef.current = fortuneReports
  }, [fortuneReports])

  const emptyFortuneTabState = useMemo(
    () => ({
      integrated: null,
      ...emptyFortuneReports(),
    }),
    [],
  )

  useEffect(() => {
    if (!birthInput) {
      setPersistedResults(null)
      setFortuneReports({ ...emptyFortuneTabState })
      return
    }
    const key = buildResultCacheKey(birthInput)
    const fromLs = loadOrreryPersisted()
    if (fromLs?.cacheKey === key) {
      setPersistedResults(fromLs)
      const fr = fromLs.fortuneReports ?? emptyFortuneReports()
      setFortuneReports({ integrated: null, ...fr })
    } else {
      setPersistedResults({ version: 1, cacheKey: key, integratedReport: null })
      setFortuneReports({ ...emptyFortuneTabState })
    }
  }, [birthInput, emptyFortuneTabState])

  const handleIntegratedReportComplete = useCallback(
    (entry: NonNullable<OrreryPersistedPayload['integratedReport']>) => {
      if (!birthInput) return
      const key = buildResultCacheKey(birthInput)
      const prev = loadOrreryPersisted()
      const fortuneReportsPersisted =
        prev?.cacheKey === key && prev.fortuneReports
          ? prev.fortuneReports
          : toPersistedFortuneSlice(fortuneReportsRef.current)
      const next: OrreryPersistedPayload = {
        version: 1,
        cacheKey: key,
        integratedReport: entry,
        fortuneReports: fortuneReportsPersisted,
      }
      setPersistedResults(next)
      saveOrreryPersisted(next)
    },
    [birthInput],
  )

  const clearIntegratedReport = useCallback(() => {
    if (!birthInput) return
    const key = buildResultCacheKey(birthInput)
    const prev = loadOrreryPersisted()
    const next: OrreryPersistedPayload = {
      version: 1,
      cacheKey: key,
      integratedReport: null,
      ...(prev?.cacheKey === key && prev.fortuneReports ? { fortuneReports: prev.fortuneReports } : {}),
    }
    setPersistedResults(next)
    saveOrreryPersisted(next)
  }, [birthInput])

  const birthCacheKey = useMemo(() => (birthInput ? buildResultCacheKey(birthInput) : null), [birthInput])

  const requestFortune = useCallback(
    async (key: FortuneKey, opts?: { force?: boolean }) => {
      if (!birthInput) return
      const force = opts?.force === true
      if (!force && fortuneReportsRef.current[key]) return
      if (fortuneInFlightRef.current[key]) return

      fortuneInFlightRef.current[key] = true
      setFortuneLoading(prev => ({ ...prev, [key]: true }))
      setFortuneError(prev => ({ ...prev, [key]: null }))

      try {
        const saju = calculateSaju(birthInput)
        const factSheet = buildSajuFactSheet(saju, birthInput)
        const ziwei = birthInput.unknownTime
          ? null
          : createChart(
              birthInput.year,
              birthInput.month,
              birthInput.day,
              birthInput.hour,
              birthInput.minute,
              birthInput.gender === 'M',
            )
        const natal = await calculateNatal(birthInput)

        const res = await callGeminiProxy({
          kind: key,
          model: 'gemini-2.5-flash',
          force,
          unknownTime: birthInput.unknownTime === true,
          sajuData: {
            factSheet,
            input: birthInput,
            pillars: saju.pillars,
            daewoon: saju.daewoon,
            relations: saju.relations,
            ziwei,
            natal,
          },
        })

        if (res.status === 'success') {
          setFortuneReports(prev => {
            const next = { ...prev, [key]: res.content }
            persistFortuneReportsForInput(birthInput, toPersistedFortuneSlice(next))
            return next
          })
        } else {
          setFortuneError(prev => ({ ...prev, [key]: res.message }))
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setFortuneError(prev => ({ ...prev, [key]: msg }))
      } finally {
        fortuneInFlightRef.current[key] = false
        setFortuneLoading(prev => ({ ...prev, [key]: false }))
      }
    },
    [birthInput],
  )

  useEffect(() => {
    if (!birthInput || toolTab !== 'saju') return
    if (sajuSubTab === 'integrated') return
    const key = sajuSubTab as FortuneKey
    void requestFortune(key, { force: false })
  }, [birthInput, toolTab, sajuSubTab, requestFortune])

  function handleSubmit(input: BirthInput) {
    setBirthInput(input)
    setToolTab('saju')
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const getCurrentFormState = useCallback(() => {
    return birthFormRef.current?.getCurrentState() ?? null
  }, [])

  return (
    <div className="min-h-screen relative text-[var(--text-primary)] bg-transparent">
      {/* 미묘한 그리드 + 상단 조명 */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.12] dark:opacity-[0.5]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(59, 130, 246, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[rgba(59,130,246,0.06)] via-transparent to-[rgba(139,92,246,0.05)] dark:from-[rgba(59,130,246,0.14)] dark:via-transparent dark:to-[rgba(11,15,26,0.92)]"
        aria-hidden
      />

      <ThemeToggle />

      <main className="relative max-w-2xl mx-auto px-4 py-8 sm:py-10">
        <header className="text-center mb-10 space-y-3">
          <p className="text-sm opacity-60 text-[var(--text-secondary)]">
            천명 (天命)
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            운명의 흐름을 해석하다
          </h1>
          <p className="text-base opacity-80 text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            우리는 선택을 한다고 믿지만,
            <br />
            결국 정해진 길로 돌아온다
          </p>
        </header>

        <p className="text-center text-sm opacity-70 text-[var(--text-secondary)] mb-5">
          입력된 시간 위에 흐름이 열린다
        </p>

        <BirthForm
          ref={birthFormRef}
          onSubmit={handleSubmit}
          externalState={externalFormState}
          onExternalStateConsumed={() => setExternalFormState(null)}
        />

        <div className="flex justify-end mt-3">
          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            프로필 관리
          </button>
        </div>

        {!birthInput && (
          <section className="panel-neon mt-8 p-5 sm:p-6 text-center">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              아직 흐름은 열리지 않았다
            </h2>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed mt-2">
              생년월일과 시간을 입력하면
              <br />
              당신의 명식과 흐름이 드러난다
            </p>
          </section>
        )}

        {birthInput && (
          <div ref={resultsRef} className="mt-8 space-y-4">
            {/* 부가 도구: 자미 / 네이탈 (기능 유지) */}
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-between">
              <div className="flex flex-wrap gap-2 justify-center">
                {(
                  [
                    { id: 'saju' as const, label: '사주' },
                    { id: 'detail' as const, label: '명식상세' },
                    { id: 'ziwei' as const, label: '자미두수' },
                    { id: 'natal' as const, label: '출생차트' },
                  ] as const
                ).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setToolTab(t.id)}
                    className={`tab text-sm font-medium ${toolTab === t.id ? 'active' : 'text-[var(--text-secondary)]'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <CopyButton
                label={<>데이터<br className="sm:hidden" /> 전부 복사</>}
                getText={async () => {
                  const saju = calculateSaju(birthInput)
                  const parts = [sajuToText(saju)]
                  if (!birthInput.unknownTime) {
                    const chart = createChart(
                      birthInput.year,
                      birthInput.month,
                      birthInput.day,
                      birthInput.hour,
                      birthInput.minute,
                      birthInput.gender === 'M',
                    )
                    parts.push(ziweiToText(chart))
                  }
                  const natal = await calculateNatal(birthInput)
                  parts.push(natalToText(natal))
                  return parts.join('\n\n')
                }}
              />
            </div>

            {toolTab === 'saju' && (
              <div className="panel-neon p-4 sm:p-5 min-h-[200px]">
                <nav
                  className="flex gap-1.5 p-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[var(--card-bg)] backdrop-blur-xl overflow-x-auto dark:bg-[rgba(255,255,255,0.03)] mb-5"
                  aria-label="통합 해석 서브탭"
                >
                  {(
                    [
                      { id: 'integrated' as const, label: '통합해석' },
                      { id: 'wealth' as const, label: '재물운' },
                      { id: 'love' as const, label: '애정운' },
                      { id: 'marriage' as const, label: '결혼운' },
                      { id: 'career' as const, label: '직업운' },
                      { id: 'health' as const, label: '건강운' },
                    ] as const
                  ).map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSajuSubTab(t.id)}
                      className={`tab shrink-0 text-sm font-medium whitespace-nowrap sm:px-5 ${sajuSubTab === t.id ? 'active' : 'text-[var(--text-muted)]'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>

                {sajuSubTab === 'integrated' && (
                  <SajuOverviewView
                    input={birthInput}
                    integratedReport={
                      birthCacheKey && persistedResults?.cacheKey === birthCacheKey
                        ? persistedResults.integratedReport
                        : null
                    }
                    onIntegratedReportComplete={handleIntegratedReportComplete}
                    onClearIntegratedReport={clearIntegratedReport}
                  />
                )}

                {sajuSubTab !== 'integrated' && (
                  (() => {
                    const key = sajuSubTab as FortuneKey
                    const content = fortuneReports[key]
                    const loading = fortuneLoading[key]
                    const err = fortuneError[key]

                    if (loading) {
                      return (
                        <div className="card p-4 sm:p-5 space-y-3">
                          <p className="text-sm text-[var(--text-primary)]">흐름을 해석 중이다</p>
                        </div>
                      )
                    }

                    if (err) {
                      return (
                        <div className="card p-4 sm:p-5 space-y-3">
                          <p className="text-sm text-[var(--text-primary)]">해석을 완성하지 못했다. 다시 시도해라</p>
                          <button
                            type="button"
                            className="primary-button px-4 py-2 text-sm font-medium w-full sm:w-auto"
                            onClick={() => void requestFortune(key, { force: true })}
                          >
                            다시 해석
                          </button>
                        </div>
                      )
                    }

                    if (!content) {
                      return (
                        <div className="card p-4 sm:p-5 space-y-3">
                          <p className="text-sm text-[var(--text-primary)]">아직 해석이 없습니다</p>
                          <button
                            type="button"
                            className="primary-button px-4 py-2 text-sm font-medium w-full sm:w-auto"
                            onClick={() => void requestFortune(key, { force: true })}
                          >
                            해석 불러오기
                          </button>
                        </div>
                      )
                    }

                    const sections = parseFortuneSections(content)
                    return (
                      <div className="space-y-6">
                        {birthInput.unknownTime && (
                          <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[var(--text-muted)]">
                            시간 미입력 기준 해석 (시주 제외)
                          </p>
                        )}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="primary-button px-4 py-2 text-sm font-medium"
                            onClick={() => void requestFortune(key, { force: true })}
                          >
                            다시 해석
                          </button>
                        </div>
                        {sections.length ? (
                          sections.map((section, index) => (
                            <article
                              key={`${section.title}-${index}`}
                              className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6"
                            >
                              <h3 className="text-lg font-semibold text-white mb-3">{section.title}</h3>
                              <div className="space-y-3">
                                {section.body.split(/\n{2,}/).map((paragraph, i) => (
                                  <p key={i} className="text-sm leading-relaxed text-white/70 whitespace-pre-line">
                                    {paragraph.trim()}
                                  </p>
                                ))}
                              </div>
                            </article>
                          ))
                        ) : (
                          <article className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6">
                            <pre className="whitespace-pre-wrap text-[var(--text-primary)] leading-[1.7] text-sm sm:text-base">
                              {content}
                            </pre>
                          </article>
                        )}
                      </div>
                    )
                  })()
                )}
              </div>
            )}

            {toolTab === 'detail' && (
              <div className="panel-neon p-4 sm:p-5 min-h-[200px]">
                <SajuView input={birthInput} />
              </div>
            )}

            {toolTab === 'ziwei' && (
              <div className="panel-neon p-4 sm:p-5">
                <ZiweiView input={birthInput} />
              </div>
            )}
            {toolTab === 'natal' && (
              <div className="panel-neon p-4 sm:p-5">
                <NatalView input={birthInput} />
              </div>
            )}
          </div>
        )}

      </main>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        getCurrentFormState={getCurrentFormState}
        onSelect={setExternalFormState}
      />
    </div>
  )
}
