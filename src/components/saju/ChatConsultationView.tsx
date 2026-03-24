import { useState, useRef, useEffect, useMemo } from 'react'
import { calculateSaju } from '@orrery/core/saju'
import type { BirthInput } from '@orrery/core/types'
import { callGeminiProxy } from '../../lib/geminiClient.ts'
import { buildSajuFactSheet, GEMINI_SYSTEM_BASE } from '../../lib/sajuInterpretationContext.ts'
import InterpretationText from './InterpretationText.tsx'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  input: BirthInput | null
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export default function ChatConsultationView({ input }: Props) {
  const result = useMemo(() => (input ? calculateSaju(input) : null), [input])
  const systemInstruction = useMemo(() => {
    if (!result || !input) return GEMINI_SYSTEM_BASE
    return `${GEMINI_SYSTEM_BASE}\n\n${buildSajuFactSheet(result, input)}`
  }, [result, input])

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        input
          ? '명식 데이터가 연결되었습니다. 사주에 관해 물어보시면, 로컬 엔진 산출값만 근거로 해석해 드립니다.'
          : '먼저 생년월일시를 입력하고 명식을 계산해 주세요.',
    },
  ])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!input) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: '먼저 생년월일시를 입력하고 명식을 계산해 주세요.',
        },
      ])
    } else {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content:
            '명식 데이터가 연결되었습니다. 사주에 관해 물어보시면, 로컬 엔진 산출값만 근거로 해석해 드립니다.',
        },
      ])
    }
  }, [input])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !input || !result) return

    const history = messages
      .slice(1)
      .slice(-10)
      .map(m => `${m.role === 'user' ? '사용자' : '상담자'}: ${m.content}`)
      .join('\n')

    const prompt =
      (history ? `이전 대화:\n${history}\n\n` : '') +
      `사용자 질문: ${text}\n\n위 명식 사실을 바꾸지 말고, 질문에 맞게 한국어로 답하세요.`

    setDraft('')
    setMessages(m => [...m, { id: makeId(), role: 'user', content: text }])
    setSending(true)

    const res = await callGeminiProxy({
      systemInstruction,
      prompt,
      model: 'gemini-2.5-flash',
      temperature: 0.65,
      maxOutputTokens: 2048,
      jsonMode: false,
    })

    setSending(false)

    if ('error' in res && res.error) {
      setMessages(m => [
        ...m,
        {
          id: makeId(),
          role: 'assistant',
          content: `오류: ${res.error}${res.details ? ` — ${res.details}` : ''}`,
        },
      ])
      return
    }

    const reply = 'text' in res && typeof res.text === 'string' ? res.text : ''
    setMessages(m => [...m, { id: makeId(), role: 'assistant', content: reply }])
  }

  return (
    <div className="flex flex-col h-[min(70vh,560px)] rounded-2xl border border-[var(--border-glow)] bg-[var(--glass-bg)] backdrop-blur-sm overflow-hidden shadow-[var(--shadow-glow-soft)]">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
        <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">상담</h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">
          {input
            ? '응답은 /api/gemini 경유이며, 간지·십신 등 수치는 로컬 계산만 유효합니다.'
            : '먼저 생년월일시를 입력하고 계산해 주세요.'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'bg-[var(--neon-primary-dim)] text-[var(--text-primary)] border border-[var(--neon-primary-muted)]'
                  : 'bg-[var(--surface-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
              }`}
            >
              {msg.role === 'assistant' && msg.content.startsWith('오류:') ? (
                <p className="text-[#fda4af] whitespace-pre-wrap">{msg.content}</p>
              ) : msg.role === 'assistant' ? (
                <InterpretationText text={msg.content} />
              ) : (
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={e => void handleSend(e)} className="p-3 border-t border-[var(--border-subtle)] bg-[var(--surface-deep)]/80">
        <div className="flex gap-2">
          <input
            type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder={input ? '메시지를 입력하세요…' : '먼저 명식을 계산하세요'}
            disabled={!input || sending}
            className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-glow)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--neon-primary-muted)] focus:shadow-[var(--shadow-glow-soft)] transition-all text-sm disabled:opacity-40"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!input || sending || !draft.trim()}
            className="shrink-0 h-11 px-5 rounded-xl font-medium text-sm bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] border border-[var(--neon-primary-muted)] hover:shadow-[var(--shadow-glow-soft)] transition-all disabled:opacity-40"
          >
            {sending ? '…' : '전송'}
          </button>
        </div>
      </form>
    </div>
  )
}
