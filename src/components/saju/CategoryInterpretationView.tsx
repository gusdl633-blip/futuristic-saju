import { useMemo, useState, useCallback } from 'react'
import { calculateSaju } from '../../../packages/core/src/saju.js'
import type { BirthInput } from '../../../packages/core/src/types.js'
import { createChart } from '../../../packages/core/src/ziwei.js'
import { calculateNatal } from '../../../packages/core/src/natal.js'
import { callGeminiProxy } from '../../lib/geminiClient.js'
import { buildSajuFactSheet } from '../../lib/sajuInterpretationContext.js'
import {
  INTEGRATED_REPORT_ERROR_TTL_MS,
  INTEGRATED_REPORT_FALLBACK_TTL_MS,
  type IntegratedReportEntry,
} from '../../utils/resultCache.js'

interface Props {
  input: BirthInput
  sectionTitle?: string
  sectionDescription?: string
  cachedIntegratedReport: IntegratedReportEntry | null
  onIntegratedReportComplete: (entry: IntegratedReportEntry) => void
  /** 통합 해석 재요청 시 기존 캐시 제거 */
  onClearIntegratedReport?: () => void
}

type ReportUiState = 'idle' | 'loading' | 'success' | 'fallback' | 'error'

function parseIntegratedSections(content: string) {
  const titles = [
    '전체 요약',
    '사주팔자 분석',
    '자미두수 분석',
    '점성술 분석',
    '인생의 흐름과 대운',
    '핵심 조언',
  ]

  const normalized = String(content ?? '').replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')

  const sections: Array<{ title: string; body: string }> = []
  let currentTitle: string | null = null
  let bodyLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (titles.includes(trimmed)) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: bodyLines.join('\n').trim() })
      }
      currentTitle = trimmed
      bodyLines = []
      continue
    }

    if (currentTitle) bodyLines.push(line)
  }

  if (currentTitle) sections.push({ title: currentTitle, body: bodyLines.join('\n').trim() })
  return sections
}

export default function CategoryInterpretationView({
  input,
  sectionTitle = '통합 흐름 해석',
  sectionDescription = '사주·자미두수·점성술을 근거로 한 전문가형 리포트를 생성합니다.',
  cachedIntegratedReport,
  onIntegratedReportComplete,
  onClearIntegratedReport,
}: Props) {
  const result = useMemo(() => calculateSaju(input), [input])
  const factSheet = useMemo(() => buildSajuFactSheet(result, input), [result, input])
  const [loading, setLoading] = useState(false)

  const reportUiState = useMemo((): ReportUiState => {
    if (loading) return 'loading'
    if (!cachedIntegratedReport) return 'idle'
    if (cachedIntegratedReport.status === 'success') return 'success'
    if (cachedIntegratedReport.status === 'error') return 'error'
    return 'fallback'
  }, [loading, cachedIntegratedReport])

  const successContent =
    cachedIntegratedReport?.status === 'success' ? cachedIntegratedReport.content : null

  const headerShowsRegenerate = cachedIntegratedReport != null

  const fetchReport = useCallback(
    async (opts?: { force?: boolean }) => {
      const force = opts?.force !== false
      if (force) onClearIntegratedReport?.()
      setLoading(true)
      const ziwei = input.unknownTime
        ? null
        : createChart(input.year, input.month, input.day, input.hour, input.minute, input.gender === 'M')
      const natal = await calculateNatal(input)
      const res = await callGeminiProxy({
        mode: 'integrated',
        model: 'gemini-2.5-flash',
        force,
        unknownTime: input.unknownTime === true,
        sajuData: {
          factSheet,
          input,
          pillars: result.pillars,
          daewoon: result.daewoon,
          relations: result.relations,
          ziwei,
          natal,
        },
      })
      setLoading(false)

      if (res.status === 'success') {
        onIntegratedReportComplete({
          status: 'success',
          content: res.content,
          generatedAt: Date.now(),
        })
      } else if (res.status === 'fallback') {
        const entry: IntegratedReportEntry = {
          status: 'fallback',
          reason: res.reason,
          message: res.message,
          generatedAt: Date.now(),
          expiresAt: Date.now() + INTEGRATED_REPORT_FALLBACK_TTL_MS,
          ...(res.details ? { details: res.details } : {}),
        }
        if (import.meta.env.DEV) console.info('[integrated report] fallback', entry)
        onIntegratedReportComplete(entry)
      } else if (res.status === 'error') {
        const entry: IntegratedReportEntry = {
          status: 'error',
          reason: res.reason,
          message: res.message,
          generatedAt: Date.now(),
          expiresAt: Date.now() + INTEGRATED_REPORT_ERROR_TTL_MS,
          ...(res.details ? { details: res.details } : {}),
        }
        if (import.meta.env.DEV) console.info('[integrated report] error', entry)
        onIntegratedReportComplete(entry)
      }
    },
    [factSheet, input, onClearIntegratedReport, onIntegratedReportComplete, result.daewoon, result.pillars, result.relations],
  )

  const headerButtonLabel = loading
    ? '리포트를 구성하는 중입니다'
    : headerShowsRegenerate
      ? '통합 해석 다시 생성'
      : '통합 해석 불러오기'

  const errorMessage =
    cachedIntegratedReport?.status === 'error' ? cachedIntegratedReport.message : null

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">{sectionTitle}</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
              {sectionDescription}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={() => void fetchReport({ force: true })}
              className="primary-button px-4 py-2 text-sm font-medium disabled:opacity-40"
            >
              {headerButtonLabel}
            </button>
          </div>
        </div>
      </header>

      {reportUiState === 'error' && errorMessage && (
        <div className="card p-4 sm:p-5 space-y-3">
          <p className="text-sm text-[#fda4af] border-l-2 border-[color-mix(in_srgb,#f472b6_50%,transparent)] pl-3">
            {errorMessage}
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchReport({ force: true })}
            className="primary-button px-4 py-2 text-sm font-medium disabled:opacity-40 w-full sm:w-auto"
          >
            다시 시도
          </button>
        </div>
      )}

      {reportUiState === 'fallback' && (
        <div className="card p-4 sm:p-5 space-y-3">
          <p className="text-sm text-[var(--text-primary)]">해석을 완성하지 못했다.</p>
          <p className="text-sm text-[var(--text-secondary)]">다시 시도해라</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void fetchReport({ force: true })}
            className="primary-button px-4 py-2 text-sm font-medium disabled:opacity-40 w-full sm:w-auto"
          >
            다시 해석
          </button>
        </div>
      )}

      {reportUiState === 'success' && successContent && (
        <div className="space-y-3">
          {input.unknownTime && (
            <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[var(--text-muted)]">
              시간 미입력 기준 해석 (시주 제외)
            </p>
          )}
          {(() => {
            const sections = parseIntegratedSections(successContent)
            if (sections.length === 0) {
              return (
                <article className="card p-4 sm:p-5">
                  <pre className="whitespace-pre-wrap text-[var(--text-primary)] leading-[1.7] text-sm sm:text-base">{successContent}</pre>
                </article>
              )
            }

            return (
              <div className="space-y-6">
                {sections.map((section, index) => (
                  <article
                    key={`${section.title}-${index}`}
                    className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 p-6"
                  >
                    <h3 className="text-lg font-semibold text-white mb-3">{section.title}</h3>
                    <div className="space-y-3">
                      {section.body.split(/\n{2,}/).map((paragraph, i) => (
                        <p
                          key={i}
                          className="text-sm leading-relaxed text-white/70 whitespace-pre-line"
                        >
                          {paragraph.trim()}
                        </p>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {reportUiState === 'idle' && (
        <div className="mt-2">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            아직 통합 리포트가 없습니다
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mt-1">
            버튼을 누르면 계산 근거가 드러난 해석 리포트를 불러옵니다
          </p>
        </div>
      )}
    </div>
  )
}
