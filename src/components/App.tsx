import { useCallback, useRef, useState } from 'react'
import BirthForm from './BirthForm.tsx'
import type { BirthFormHandle, SavedFormState } from './BirthForm.tsx'
import ProfileModal from './ProfileModal.tsx'
import Guide from './Guide.tsx'
import CopyButton from './CopyButton.tsx'
import ThemeToggle from './ThemeToggle.tsx'
import SajuView from './saju/SajuView.tsx'
import CategoryInterpretationView from './saju/CategoryInterpretationView.tsx'
import ChatConsultationView from './saju/ChatConsultationView.tsx'
import ZiweiView from './ziwei/ZiweiView.tsx'
import NatalView from './natal/NatalView.tsx'
import { calculateSaju } from '@orrery/core/saju'
import { createChart } from '@orrery/core/ziwei'
import { calculateNatal } from '@orrery/core/natal'
import { sajuToText, ziweiToText, natalToText } from '../utils/text-export.ts'
import type { BirthInput } from '@orrery/core/types'

/** 사주 대시보드 내 화면 */
type SajuScreen = 'summary' | 'interpret' | 'consult' | 'input'
/** 부가 도구 (기능 유지) */
type ToolTab = 'saju' | 'ziwei' | 'natal'

export default function App() {
  const [toolTab, setToolTab] = useState<ToolTab>('saju')
  const [sajuScreen, setSajuScreen] = useState<SajuScreen>('summary')
  const [birthInput, setBirthInput] = useState<BirthInput | null>(null)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [externalFormState, setExternalFormState] = useState<SavedFormState | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const birthFormRef = useRef<BirthFormHandle>(null)

  function handleSubmit(input: BirthInput) {
    setBirthInput(input)
    setToolTab('saju')
    setSajuScreen('summary')
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' })
    })
  }

  const getCurrentFormState = useCallback(() => {
    return birthFormRef.current?.getCurrentState() ?? null
  }, [])

  return (
    <div className="min-h-screen relative text-[var(--text-primary)] bg-[var(--surface-deep)]">
      {/* 미묘한 그리드 + 그라데이션 */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35] dark:opacity-[0.5]"
        aria-hidden
        style={{
          backgroundImage: `
            linear-gradient(rgba(61, 255, 156, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(92, 225, 230, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-b from-[#0a1628]/90 via-transparent to-[#030712]"
        aria-hidden
      />

      <ThemeToggle />
      <a
        href="https://github.com/rath/orrery"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-3 right-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-glow)] bg-[var(--glass-bg)] backdrop-blur-sm text-[var(--text-muted)] hover:border-[var(--neon-primary-muted)] hover:text-[var(--neon-cyan)] transition-all"
        aria-label="GitHub 저장소"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </a>

      <main className="relative max-w-2xl mx-auto px-4 py-8 sm:py-10">
        <header className="text-center mb-8 space-y-2">
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-[var(--neon-cyan)]">
            혼천의
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
            사주 명리 대시보드
          </h1>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto leading-relaxed">
            생년월일시를 입력하면 브라우저에서 사주를 계산합니다. 해석·상담 화면은 API 연동을 준비한 자리입니다.
          </p>
        </header>

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

        {birthInput && (
          <div ref={resultsRef} className="mt-8 space-y-4">
            {/* 부가 도구: 자미 / 네이탈 (기능 유지) */}
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-between">
              <div className="flex flex-wrap gap-2 justify-center">
                {(
                  [
                    { id: 'saju' as const, label: '사주' },
                    { id: 'ziwei' as const, label: '자미두수' },
                    { id: 'natal' as const, label: '출생차트' },
                  ] as const
                ).map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setToolTab(t.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      toolTab === t.id
                        ? 'border-[var(--neon-primary-muted)] bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] shadow-[var(--shadow-glow-soft)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-glow)]'
                    }`}
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
              <>
                <nav
                  className="flex gap-1 p-1 rounded-2xl border border-[var(--border-glow)] bg-[var(--surface-elevated)]/60 backdrop-blur-sm overflow-x-auto"
                  aria-label="사주 화면"
                >
                  {(
                    [
                      { id: 'summary' as const, label: '명식 요약' },
                      { id: 'interpret' as const, label: '카테고리 해석' },
                      { id: 'consult' as const, label: '상담' },
                      { id: 'input' as const, label: '생정보' },
                    ] as const
                  ).map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSajuScreen(s.id)}
                      className={`shrink-0 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                        sajuScreen === s.id
                          ? 'bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] border border-[var(--neon-primary-muted)] shadow-[var(--shadow-glow-soft)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-transparent'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </nav>

                <div className="panel-neon p-4 sm:p-5 min-h-[200px]">
                  {sajuScreen === 'summary' && <SajuView input={birthInput} />}
                  {sajuScreen === 'interpret' && <CategoryInterpretationView input={birthInput} />}
                  {sajuScreen === 'consult' && <ChatConsultationView input={birthInput} />}
                  {sajuScreen === 'input' && (
                    <div className="space-y-3">
                      <h2 className="text-lg font-semibold text-[var(--text-primary)]">생년정보 수정</h2>
                      <p className="text-sm text-[var(--text-muted)]">
                        아래로 스크롤하여 상단 폼에서 날짜·시간·위치를 바꾼 뒤 다시 「명식 계산」을 누르세요.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        className="text-sm font-medium px-4 py-2 rounded-xl border border-[var(--neon-primary-muted)] text-[var(--neon-primary)] bg-[var(--neon-primary-dim)] hover:shadow-[var(--shadow-glow-soft)] transition-all"
                      >
                        입력 폼으로 이동
                      </button>
                    </div>
                  )}
                </div>
              </>
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

        <Guide />
      </main>

      <footer className="relative text-center text-xs text-[var(--text-muted)] py-8 border-t border-[var(--border-subtle)]">
        <p>
          &copy; 2026 Jang-Ho Hwang &middot;{' '}
          <a href="https://x.com/xrath" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--neon-cyan)] transition-colors">
            @xrath
          </a>{' '}
          &middot;{' '}
          <a href="https://x.com/xrath/status/2022548658562937028" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--neon-cyan)] transition-colors">
            소개글
          </a>
        </p>
      </footer>

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        getCurrentFormState={getCurrentFormState}
        onSelect={setExternalFormState}
      />
    </div>
  )
}
