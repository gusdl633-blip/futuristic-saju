/**
 * Vercel Serverless Function — Gemini 프록시 (브라우저에 키 노출 금지)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'

const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_OUTPUT_CAP = 8192

type ClientBody = {
  prompt?: string
  systemInstruction?: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  jsonMode?: boolean
}

type GeminiPart = { text?: string }

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] }
    finishReason?: string
  }>
  error?: { message?: string; code?: number; status?: string }
}

function mergeInstructions(systemInstruction: string | undefined, prompt: string): { systemBlock: string; userPrompt: string } {
  const sys = (systemInstruction ?? '').trim()
  const pr = (prompt ?? '').trim()
  if (!pr) return { systemBlock: sys, userPrompt: '' }
  if (!sys) return { systemBlock: '', userPrompt: pr }
  return { systemBlock: sys, userPrompt: pr }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error('[api/gemini] GEMINI_API_KEY missing')
    return res.status(500).json({ error: 'Server misconfiguration', details: 'GEMINI_API_KEY not set' })
  }

  let body: ClientBody
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as ClientBody) ?? {}
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' })
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  if (!prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL
  const temperature =
    typeof body.temperature === 'number' && Number.isFinite(body.temperature)
      ? Math.min(2, Math.max(0, body.temperature))
      : 0.7
  const maxOutputTokens =
    typeof body.maxOutputTokens === 'number' && Number.isFinite(body.maxOutputTokens)
      ? Math.min(MAX_OUTPUT_CAP, Math.max(1, Math.floor(body.maxOutputTokens)))
      : 2048
  const jsonMode = body.jsonMode === true
  const systemInstruction = typeof body.systemInstruction === 'string' ? body.systemInstruction : undefined

  const { systemBlock, userPrompt } = mergeInstructions(systemInstruction, prompt)

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens,
  }
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json'
  }

  const payload: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig,
  }

  if (systemBlock) {
    payload.systemInstruction = {
      parts: [{ text: systemBlock }],
    }
  }

  const debugPromptPreview = userPrompt.slice(0, 200)
  console.log('[api/gemini] model=', model, 'jsonMode=', jsonMode, 'prompt[0:200]=', debugPromptPreview)

  let upstream: GeminiResponse
  let upstreamText = ''
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    upstreamText = await r.text()
    const preview = upstreamText.slice(0, 200)
    console.log('[api/gemini] upstream status=', r.status, 'body[0:200]=', preview)

    try {
      upstream = JSON.parse(upstreamText) as GeminiResponse
    } catch {
      return res.status(502).json({
        error: 'Invalid upstream response',
        details: preview,
      })
    }

    if (!r.ok) {
      const msg = upstream.error?.message ?? upstreamText.slice(0, 500)
      return res.status(502).json({
        error: 'Gemini request failed',
        details: msg,
      })
    }

    if (upstream.error?.message) {
      return res.status(502).json({
        error: 'Gemini API error',
        details: upstream.error.message,
      })
    }

    const parts = upstream.candidates?.[0]?.content?.parts
    const text = parts?.map(p => p.text ?? '').join('').trim() ?? ''

    if (!text) {
      return res.status(502).json({
        error: 'Empty model output',
        details: upstream.candidates?.[0]?.finishReason ?? 'no text',
        raw: upstream,
      })
    }

    return res.status(200).json({ text, raw: jsonMode ? upstream : undefined })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/gemini] fetch error', message)
    return res.status(502).json({
      error: 'Upstream fetch failed',
      details: message,
    })
  }
}
