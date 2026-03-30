/**
 * 브라우저 → /api/gemini 프록시만 호출 (Google API 직접 호출 금지)
 */
import type { GeminiFailureReason } from '../utils/geminiReportValidation.js'

export type { GeminiFailureReason } from '../utils/geminiReportValidation.js'

export type GeminiProxyRequest = {
  model?: string
  temperature?: number
  maxOutputTokens?: number
  mode?: 'integrated'
  kind?: 'wealth' | 'love' | 'marriage' | 'career' | 'health'
  /** 시간 미입력 해석 모드 안내 플래그 */
  unknownTime?: boolean
  sajuData?: unknown
  /** primary부터 캐시 무시하고 새로 생성 (서버 로깅·확장용; 클라이언트는 캐시 클리어와 함께 사용) */
  force?: boolean
}

export type GeminiIntegratedTextResponse =
  | { status: 'success'; content: string }
  | {
      status: 'fallback'
      reason: GeminiFailureReason
      message: string
      details?: string
    }
  | {
      status: 'error'
      reason: GeminiFailureReason
      message: string
      details?: string
    }

function readIntegratedTextPayload(d: Record<string, unknown>): GeminiIntegratedTextResponse | null {
  if (d.ok === true && d.status === 'success' && typeof d.content === 'string') {
    return { status: 'success', content: d.content }
  }

  if (d.ok === false && d.status === 'fallback') {
    const reason = (d.reason as GeminiFailureReason) ?? 'unknown'
    const message = typeof d.message === 'string' ? d.message : '해석을 완성하지 못했습니다.'
    const details = typeof d.details === 'string' && d.details.trim() ? d.details : undefined
    return { status: 'fallback', reason, message, ...(details ? { details } : {}) }
  }

  if (d.ok === false && d.status === 'error') {
    const reason = (d.reason as GeminiFailureReason) ?? 'unknown'
    const message = typeof d.message === 'string' ? d.message : '요청에 실패했습니다.'
    const details = typeof d.details === 'string' && d.details.trim() ? d.details : undefined
    return { status: 'error', reason, message, ...(details ? { details } : {}) }
  }

  return null
}

export async function callGeminiProxy(req: GeminiProxyRequest): Promise<GeminiIntegratedTextResponse> {
  let httpRes: Response
  try {
    httpRes = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      status: 'error' as const,
      reason: 'network',
      message: import.meta.env.DEV ? `네트워크 오류: ${msg}` : '네트워크 오류가 발생했습니다.',
    }
  }

  let data: unknown
  try {
    data = await httpRes.json()
  } catch {
    return {
      status: 'error' as const,
      reason: 'unknown',
      message: '서버 응답을 해석하지 못했습니다.',
    }
  }

  const d = data as Record<string, unknown>

  if (!httpRes.ok) {
    return {
      status: 'error' as const,
      reason: 'unknown',
      message: `HTTP ${httpRes.status}`,
    }
  }

  const payload = readIntegratedTextPayload(d)
  if (payload) return payload

  return { status: 'error' as const, reason: 'unknown', message: '알 수 없는 응답 형식' }
}
