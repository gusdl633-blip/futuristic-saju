/**
 * Gemini 리포트 원문·파싱 결과 후처리 (API 응답 직전·UI 일관성)
 */
import type { GeminiResult } from './geminiReportValidation.js'
import { normalizeTerms } from './normalizeTerms.js'
import { GEMINI_REPORT_KEYS } from './geminiReportValidation.js'

/**
 * 코드펜스·스마트 따옴표·제어문자 정리 후 JSON.parse 시도용 문자열.
 * `{`~`}` 최외곽만 남긴 뒤 trim.
 */
export function sanitizeRawText(text: string): string {
  let s = String(text ?? '')

  // 제어 문자(C0·DEL) 제거 — JSON 문자열 밖/안 구분 없이 salvage용
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')

  // 흔한 스마트 따옴표·대시 → ASCII (파서/모델 산출물에 섞인 경우)
  s = s
    .replace(/[\u201C\u201D\u00AB\u00BB\u2033\u2036]/g, '"')
    .replace(/[\u2018\u2019\u2032\u2035]/g, "'")
    .replace(/\u2013|\u2014|\u2212/g, '-')

  // zero-width·BOM
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '')

  s = s.trim()
  s = s.replace(/^```(?:json)?\s*/i, '')
  s = s.replace(/\s*```\s*$/i, '')
  s = s.replace(/```json/gi, '')
  s = s.replace(/```/g, '')

  const objStart = s.indexOf('{')
  const objEnd = s.lastIndexOf('}')
  if (objStart !== -1 && objEnd > objStart) {
    s = s.slice(objStart, objEnd + 1)
  }
  return s.trim()
}

function stripChattyWrappers(s: string): string {
  let t = s.trim()
  const lower = t.slice(0, 80).toLowerCase()
  if (lower.startsWith('here is') || lower.startsWith('here\'s') || lower.startsWith('아래는')) {
    const i = t.indexOf('{')
    if (i > 0) t = t.slice(i)
  }
  return t.trim()
}

/** 원문에서 JSON 구간만 남기기 (파싱 전 1차) — 머리말 제거 후 sanitize */
export function prepareTextForJsonParse(text: string): string {
  return sanitizeRawText(stripChattyWrappers(String(text ?? '')))
}

function collapseBodyWhitespace(body: string): string {
  let s = body.replace(/\r\n/g, '\n')
  s = s.replace(/[ \t]+/g, ' ')
  s = s.replace(/\n{3,}/g, '\n\n')
  return s.trim()
}

/** 아주 짧은 줄만 이어 붙여 단일 문단으로 (의도적인 긴 줄바꿈은 유지) */
function joinFragmentedParagraphs(body: string): string {
  return body
    .split(/\n\n+/)
    .map(para => {
      const lines = para.split('\n').map(l => l.trim()).filter(Boolean)
      if (lines.length <= 1) return para.trim()
      const allShort = lines.every(l => [...l].length < 55)
      if (allShort) return lines.join(' ')
      return lines.join('\n')
    })
    .join('\n\n')
}

export function normalizeReport(parsed: GeminiResult): GeminiResult {
  const out = {} as GeminiResult
  for (const k of GEMINI_REPORT_KEYS) {
    const raw = parsed[k].trim()
    if (k.endsWith('_body')) {
      const step = collapseBodyWhitespace(raw)
      const merged = joinFragmentedParagraphs(step)
      out[k] = normalizeTerms(merged)
    } else {
      out[k] = normalizeTerms(raw)
    }
  }
  return out
}
