/**
 * 브라우저 → /api/gemini 프록시만 호출 (Google API 직접 호출 금지)
 */

export type GeminiProxyRequest = {
  prompt: string
  systemInstruction?: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  jsonMode?: boolean
}

export type GeminiProxyOk = { text: string; raw?: unknown }
export type GeminiProxyErr = { error: string; details?: string }

export async function callGeminiProxy(req: GeminiProxyRequest): Promise<GeminiProxyOk | GeminiProxyErr> {
  let res: Response
  try {
    res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      error: '네트워크 오류',
      details:
        import.meta.env.DEV
          ? `${msg} — 로컬에서는 vercel dev로 API를 띄우거나, 배포 환경에서 시도하세요.`
          : msg,
    }
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    return { error: '서버 응답 파싱 실패', details: await res.text().catch(() => '') }
  }

  if (!res.ok) {
    const d = data as GeminiProxyErr
    return { error: d.error ?? `HTTP ${res.status}`, details: d.details }
  }

  const d = data as GeminiProxyOk & GeminiProxyErr
  if (typeof d.text === 'string') {
    return { text: d.text, raw: d.raw }
  }
  if (d.error) {
    return { error: d.error, details: d.details }
  }
  return { error: '알 수 없는 응답 형식' }
}
