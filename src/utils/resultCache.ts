import type { BirthInput } from '../../packages/core/src/types.js'
import type { GeminiFailureReason } from './geminiReportValidation.js'

const GEMINI_RESULT_KEYS = [
  'summary_title',
  'summary_body',
  'saju_title',
  'saju_body',
  'ziwei_title',
  'ziwei_body',
  'astrology_title',
  'astrology_body',
  'flow_title',
  'flow_body',
  'advice_title',
  'advice_body',
] as const

export const ORRERY_LAST_RESULT_KEY = 'orrery:lastResult'

/** fallback·error는 TTL 지나면 로드 시 무시 */
export const INTEGRATED_REPORT_FALLBACK_TTL_MS = 5 * 60 * 1000
export const INTEGRATED_REPORT_ERROR_TTL_MS = 2 * 60 * 1000

export type IntegratedReportEntry =
  | { status: 'success'; content: string; generatedAt: number; source?: 'primary' | 'repair' }
  | {
      status: 'fallback'
      reason: GeminiFailureReason
      message: string
      /** 서버 `details` — UI 비표시, 디버깅·localStorage 추적용 */
      details?: string
      generatedAt: number
      expiresAt: number
    }
  | {
      status: 'error'
      reason: GeminiFailureReason
      message: string
      details?: string
      generatedAt: number
      expiresAt: number
    }

function expireIfStale(entry: IntegratedReportEntry): IntegratedReportEntry | null {
  if (entry.status === 'success') return entry
  return entry.expiresAt > Date.now() ? entry : null
}

function migrateIntegratedReport(ir: unknown): IntegratedReportEntry | null {
  if (!ir || typeof ir !== 'object') return null
  const r = ir as Record<string, unknown>

  if (r.status === 'success' && typeof r.content === 'string' && typeof r.generatedAt === 'number') {
    const source = r.source === 'repair' ? 'repair' : r.source === 'primary' ? 'primary' : undefined
    return { status: 'success', content: r.content, generatedAt: r.generatedAt, source }
  }

  // 이전(Structured JSON) 캐시 포맷 마이그레이션: 가능한 경우 텍스트로 조합
  if (r.status === 'success' && r.parsed && typeof r.generatedAt === 'number') {
    const pr = r.parsed as Record<string, unknown>
    if (!GEMINI_RESULT_KEYS.every(k => typeof pr[k] === 'string')) return null
    const get = (k: (typeof GEMINI_RESULT_KEYS)[number]) => String(pr[k]).trim()
    const content = [
      `전체 요약`,
      get('summary_title'),
      get('summary_body'),
      '',
      `사주팔자 분석`,
      get('saju_title'),
      get('saju_body'),
      '',
      `자미두수 분석`,
      get('ziwei_title'),
      get('ziwei_body'),
      '',
      `점성술 분석`,
      get('astrology_title'),
      get('astrology_body'),
      '',
      `인생의 흐름과 대운`,
      get('flow_title'),
      get('flow_body'),
      '',
      `핵심 조언`,
      get('advice_title'),
      get('advice_body'),
    ]
      .map(x => x.trim())
      .filter(Boolean)
      .join('\n')
    const source = r.source === 'repair' ? 'repair' : r.source === 'primary' ? 'primary' : undefined
    return { status: 'success', content, generatedAt: r.generatedAt, source }
  }

  if (r.status === 'fallback' && typeof r.generatedAt === 'number') {
    const reason = (r.reason as GeminiFailureReason) ?? 'unknown'
    const message =
      typeof r.message === 'string' ? r.message : '이전 요청이 완료되지 않았습니다.'
    const details = typeof r.details === 'string' && r.details.trim() ? r.details : undefined
    const expiresAt =
      typeof r.expiresAt === 'number'
        ? r.expiresAt
        : (r.generatedAt as number) + INTEGRATED_REPORT_FALLBACK_TTL_MS
    return {
      status: 'fallback',
      reason,
      message,
      ...(details ? { details } : {}),
      generatedAt: r.generatedAt as number,
      expiresAt,
    }
  }

  if (r.status === 'error' && typeof r.generatedAt === 'number') {
    const reason = (r.reason as GeminiFailureReason) ?? 'unknown'
    const message = typeof r.message === 'string' ? r.message : '요청에 실패했습니다.'
    const details = typeof r.details === 'string' && r.details.trim() ? r.details : undefined
    const expiresAt =
      typeof r.expiresAt === 'number'
        ? r.expiresAt
        : (r.generatedAt as number) + INTEGRATED_REPORT_ERROR_TTL_MS
    return {
      status: 'error',
      reason,
      message,
      ...(details ? { details } : {}),
      generatedAt: r.generatedAt as number,
      expiresAt,
    }
  }

  return null
}

export const FORTUNE_REPORT_KEYS = ['wealth', 'love', 'marriage', 'career', 'health'] as const
export type FortuneReportsPersisted = Record<(typeof FORTUNE_REPORT_KEYS)[number], string | null>

export function emptyFortuneReports(): FortuneReportsPersisted {
  return { wealth: null, love: null, marriage: null, career: null, health: null }
}

export function normalizeFortuneReportsFromLs(v: unknown): FortuneReportsPersisted | undefined {
  if (!v || typeof v !== 'object') return undefined
  const o = v as Record<string, unknown>
  const out: FortuneReportsPersisted = { wealth: null, love: null, marriage: null, career: null, health: null }
  for (const k of FORTUNE_REPORT_KEYS) {
    const x = o[k]
    if (x == null) out[k] = null
    else if (typeof x === 'string') out[k] = x
    else return undefined
  }
  return out
}

export function toPersistedFortuneSlice(reports: Record<string, string | null>): FortuneReportsPersisted {
  const e = emptyFortuneReports()
  for (const k of FORTUNE_REPORT_KEYS) {
    const v = reports[k]
    e[k] = typeof v === 'string' ? v : null
  }
  return e
}

/** 통합 리포트와 함께 같은 cacheKey로 묶어 저장 (다른 생정보면 덮어쓰기) */
export function persistFortuneReportsForInput(input: BirthInput, reports: FortuneReportsPersisted): void {
  const cacheKey = buildResultCacheKey(input)
  const cur = loadOrreryPersisted()
  const integratedReport = cur?.cacheKey === cacheKey ? cur.integratedReport ?? null : null
  saveOrreryPersisted({
    version: 1,
    cacheKey,
    integratedReport,
    fortuneReports: reports,
  })
}

/** localStorage에 저장하는 통합 결과 묶음 */
export type OrreryPersistedPayload = {
  version: 1
  cacheKey: string
  integratedReport: IntegratedReportEntry | null
  /** 재물·애정 등 운세 plain text (cacheKey 일치 시만 유효) */
  fortuneReports?: FortuneReportsPersisted
}

export function buildResultCacheKey(input: BirthInput): string {
  return JSON.stringify({
    y: input.year,
    mo: input.month,
    d: input.day,
    h: input.hour,
    mi: input.minute,
    g: input.gender,
    ut: input.unknownTime ?? false,
    jm: input.jasiMethod ?? 'unified',
    lat: input.latitude ?? null,
    lon: input.longitude ?? null,
  })
}

export function loadOrreryPersisted(): OrreryPersistedPayload | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(ORRERY_LAST_RESULT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as OrreryPersistedPayload
    if (p?.version !== 1 || typeof p.cacheKey !== 'string') return null
    const frNorm = normalizeFortuneReportsFromLs(p.fortuneReports)
    const base: OrreryPersistedPayload = {
      version: 1,
      cacheKey: p.cacheKey,
      integratedReport: p.integratedReport,
      ...(frNorm ? { fortuneReports: frNorm } : {}),
    }

    if (p.integratedReport != null) {
      const migrated = migrateIntegratedReport(p.integratedReport)
      if (!migrated) return { ...base, integratedReport: null }
      const fresh = expireIfStale(migrated)
      return { ...base, integratedReport: fresh }
    }
    return base
  } catch {
    return null
  }
}

export function saveOrreryPersisted(payload: OrreryPersistedPayload): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(ORRERY_LAST_RESULT_KEY, JSON.stringify(payload))
  } catch (e) {
    console.warn('[orrery] localStorage save failed', e)
  }
}
