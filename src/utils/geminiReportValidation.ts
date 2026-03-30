/**
 * 통합 리포트 JSON 검증 (API·클라이언트 공용)
 */

export type GeminiResult = {
  summary_title: string
  summary_body: string
  saju_title: string
  saju_body: string
  ziwei_title: string
  ziwei_body: string
  astrology_title: string
  astrology_body: string
  flow_title: string
  flow_body: string
  advice_title: string
  advice_body: string
}

export type GeminiFailureReason =
  | 'network'
  | 'empty'
  | 'non_json'
  | 'invalid_schema'
  | 'too_short'
  | 'blocked'
  | 'unknown'

export const GEMINI_REPORT_KEYS: (keyof GeminiResult)[] = [
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
]

const BODY_KEYS: (keyof GeminiResult)[] = [
  'summary_body',
  'saju_body',
  'ziwei_body',
  'astrology_body',
  'flow_body',
  'advice_body',
]

/** 프롬프트·문서용 권장 분량(검증 하드 제한 아님) */
export const GEMINI_REPORT_SOFT_MIN_MAIN_BODY = 180
export const GEMINI_REPORT_SOFT_MIN_OTHER_BODY = 160

const MAIN_BODY_KEYS = new Set<keyof GeminiResult>(['saju_body', 'ziwei_body', 'astrology_body'])

/** 이 길이 이하만 `too_short`로 실패 — 그 위는 통과(프롬프트에서 분량 권장) */
const BODY_TOO_SHORT_HARD_MAX = 100

function kLen(s: string): number {
  return [...s.trim()].length
}

/** 명백한 안내문·무의미 반복 위주 (긴 본문 오탐 최소화) */
function isPlaceholderLikeBody(s: string): boolean {
  const t = s.trim()
  if (t.length < 80) return true
  if (/^해석을\s*완성하지\s*못했/i.test(t)) return true
  if (/^다시\s*시도/i.test(t) && t.length < 200) return true
  if (/응답을\s*생성할\s*수\s*없|서버\s*오류|JSON\s*형식이\s*아닙니다/i.test(t) && t.length < 400) return true
  const parts = t.split(/[.\n!?]+/).map(x => x.trim()).filter(Boolean)
  if (parts.length >= 3) {
    const first = parts[0]!
    const same = parts.filter(p => p === first).length
    if (same >= parts.length * 0.85 && t.length < 500) return true
  }
  return false
}

export type ValidateReportResult =
  | { ok: true; data: GeminiResult }
  | { ok: false; reason: GeminiFailureReason; details?: string }

export type ParseReportJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: GeminiFailureReason; details: string }

export function isParseReportJsonFail(
  r: ParseReportJsonResult,
): r is { ok: false; reason: GeminiFailureReason; details: string } {
  return r.ok === false
}

export function isParseReportJsonOk(r: ParseReportJsonResult): r is { ok: true; value: unknown } {
  return r.ok === true
}

export function isValidateReportFail(
  r: ValidateReportResult,
): r is { ok: false; reason: GeminiFailureReason; details?: string } {
  return r.ok === false
}

export function isValidateReportOk(r: ValidateReportResult): r is { ok: true; data: GeminiResult } {
  return r.ok === true
}

/**
 * @param tier primary | strict — 길이는 동일: 100자 초과면 통과, 이하만 too_short.
 *        (180/160자 권장은 프롬프트 소프트 제약, `GEMINI_REPORT_SOFT_MIN_*` 참고)
 */
export function validateReportJson(parsed: unknown, _tier: 'primary' | 'strict'): ValidateReportResult {
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, reason: 'invalid_schema', details: 'root is not an object' }
  }
  const p = parsed as Record<string, unknown>
  for (const k of GEMINI_REPORT_KEYS) {
    const v = p[k]
    if (typeof v !== 'string' || !v.trim()) {
      return { ok: false, reason: 'invalid_schema', details: `missing or non-string ${String(k)}` }
    }
  }

  const data = {} as GeminiResult
  for (const k of GEMINI_REPORT_KEYS) {
    data[k] = String(p[k]).trim()
  }

  for (const key of BODY_KEYS) {
    const len = kLen(data[key])
    if (len <= BODY_TOO_SHORT_HARD_MAX) {
      const softHint = MAIN_BODY_KEYS.has(key)
        ? GEMINI_REPORT_SOFT_MIN_MAIN_BODY
        : GEMINI_REPORT_SOFT_MIN_OTHER_BODY
      return {
        ok: false,
        reason: 'too_short',
        details: `${String(key)}: ${len} <= ${BODY_TOO_SHORT_HARD_MAX} (권장 ${softHint}자 이상)`,
      }
    }
    if (isPlaceholderLikeBody(data[key])) {
      return { ok: false, reason: 'invalid_schema', details: `placeholder-like ${String(key)}` }
    }
  }

  return { ok: true, data }
}

export function parseReportJson(raw: string): ParseReportJsonResult {
  try {
    const value: unknown = JSON.parse(raw)
    return { ok: true, value }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: 'non_json', details: msg.slice(0, 200) }
  }
}
