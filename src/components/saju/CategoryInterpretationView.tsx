import { useMemo, useState, useCallback } from 'react'
import { calculateSaju } from '@orrery/core/saju'
import CopyButton from '../CopyButton.tsx'
import { sajuToText } from '../../utils/text-export.ts'
import type { BirthInput } from '@orrery/core/types'
import { callGeminiProxy } from '../../lib/geminiClient.ts'
import {
  buildCategoryPrompt,
  buildSajuFactSheet,
  GEMINI_SYSTEM_BASE,
  type InterpretCategoryId,
} from '../../lib/sajuInterpretationContext.ts'
import InterpretationText from './InterpretationText.tsx'

interface Props {
  input: BirthInput
}

const CATEGORIES: {
  id: InterpretCategoryId
  title: string
  description: string
}[] = [
  { id: 'jonghab', title: '종합운', description: '명식 전체 구조와 성향의 큰 그림' },
  { id: 'jaemul', title: '재물운', description: '재성·식상 등 데이터에 드러난 재물 맥락' },
  { id: 'aejeong', title: '애정운', description: '인연·관계에 대한 참고 해석' },
  { id: 'jigeop', title: '직업운', description: '사회·직업 활동 방향' },
  { id: 'geongang', title: '건강운', description: '기운 균형 관점의 참고 (의학 아님)' },
  { id: 'today', title: '오늘의 운세', description: '오늘 일·월주와 원국의 참고' },
  { id: 'yeonun', title: '연운', description: '올해 년주와 원국의 참고' },
]

export default function CategoryInterpretationView({ input }: Props) {
  const result = useMemo(() => calculateSaju(input), [input])
  const [openId, setOpenId] = useState<InterpretCategoryId | null>(CATEGORIES[0].id)
  const [texts, setTexts] = useState<Partial<Record<InterpretCategoryId, string>>>({})
  const [loadingId, setLoadingId] = useState<InterpretCategoryId | null>(null)
  const [errors, setErrors] = useState<Partial<Record<InterpretCategoryId, string>>>({})
  const [bulkLoading, setBulkLoading] = useState(false)

  const factSheet = useMemo(() => buildSajuFactSheet(result, input), [result, input])
  const systemInstruction = useMemo(() => `${GEMINI_SYSTEM_BASE}\n\n${factSheet}`, [factSheet])

  const runCategory = useCallback(
    async (id: InterpretCategoryId) => {
      setLoadingId(id)
      setErrors(e => ({ ...e, [id]: undefined }))
      const res = await callGeminiProxy({
        systemInstruction,
        prompt: buildCategoryPrompt(id),
        model: 'gemini-2.5-flash',
        temperature: 0.65,
        maxOutputTokens: 2048,
        jsonMode: false,
      })
      setLoadingId(null)
      if ('error' in res && res.error) {
        setErrors(e => ({ ...e, [id]: res.details ? `${res.error}: ${res.details}` : res.error }))
        return
      }
      if ('text' in res && res.text) {
        setTexts(t => ({ ...t, [id]: res.text }))
      }
    },
    [systemInstruction],
  )

  async function runAllSequential() {
    setBulkLoading(true)
    setErrors({})
    for (const c of CATEGORIES) {
      await runCategory(c.id)
    }
    setBulkLoading(false)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
              카테고리 해석
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
              아래 내용은 로컬 명식만 근거로 Gemini가 생성합니다. 간지·십신 수치는 엔진 값만 유효합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <CopyButton label="명식 텍스트 복사" getText={() => sajuToText(result)} />
            <button
              type="button"
              disabled={bulkLoading || loadingId !== null}
              onClick={() => void runAllSequential()}
              className="px-3 py-1.5 text-sm rounded-xl border border-[var(--neon-primary-muted)] bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] hover:shadow-[var(--shadow-glow-soft)] disabled:opacity-40 transition-all"
            >
              {bulkLoading ? '전체 생성 중…' : '전체 생성'}
            </button>
          </div>
        </div>
      </header>

      <ul className="space-y-2">
        {CATEGORIES.map(cat => {
          const isOpen = openId === cat.id
          const loading = loadingId === cat.id
          const err = errors[cat.id]
          const body = texts[cat.id]

          return (
            <li key={cat.id}>
              <div
                className={`rounded-xl border transition-all ${
                  isOpen
                    ? 'border-[var(--neon-primary-muted)] bg-[var(--glass-bg)] shadow-[var(--shadow-glow-soft)]'
                    : 'border-[var(--border-glow)] bg-[var(--glass-bg)]/80'
                } backdrop-blur-sm overflow-hidden`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : cat.id)}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--neon-primary-dim)]/20 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-[var(--text-primary)]">{cat.title}</span>
                    <span
                      className={`text-[var(--neon-cyan)] text-xs shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden
                    >
                      ▼
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{cat.description}</p>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-0 border-t border-[var(--border-subtle)]">
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        disabled={loading || bulkLoading}
                        onClick={() => void runCategory(cat.id)}
                        className="px-3 py-1.5 text-sm rounded-xl font-medium bg-[var(--neon-primary)] text-[#030712] hover:brightness-110 disabled:opacity-40 transition-all"
                      >
                        {loading ? '생성 중…' : '이 주제 해석 받기'}
                      </button>
                    </div>
                    {err && (
                      <p className="mt-3 text-sm text-[#fda4af] border-l-2 border-[color-mix(in_srgb,#f472b6_50%,transparent)] pl-3">
                        {err}
                      </p>
                    )}
                    {body && (
                      <div className="mt-4 p-3 rounded-xl bg-[var(--surface-deep)]/80 border border-[var(--border-subtle)]">
                        <InterpretationText text={body} />
                      </div>
                    )}
                    {!body && !err && !loading && (
                      <p className="mt-3 text-xs text-[var(--text-muted)]">
                        버튼을 누르면 서버의 /api/gemini를 통해 해석 문구가 생성됩니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
