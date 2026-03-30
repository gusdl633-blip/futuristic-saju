/**
 * Vercel Serverless Function — Gemini 프록시 (브라우저에 키 노출 금지)
 */
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  isParseReportJsonFail,
  isParseReportJsonOk,
  isValidateReportFail,
  isValidateReportOk,
  parseReportJson,
  validateReportJson,
  type GeminiFailureReason,
  type GeminiResult,
} from '../src/utils/geminiReportValidation.js'
import { normalizeReport, prepareTextForJsonParse } from '../src/utils/geminiReportNormalize.js'
import {
  PROMPT_VERSION as INTEGRATED_PROMPT_VERSION,
  INTEGRATED_TEXT_VOICE_RULES,
  buildIntegratedTextInput,
  buildIntegratedTextReportPrompt,
} from '../prompts/integrated.js'
import { PROMPT_VERSION as WEALTH_PROMPT_VERSION, buildWealthTextReportPrompt } from '../prompts/wealth.js'
import { PROMPT_VERSION as LOVE_PROMPT_VERSION, buildLoveTextReportPrompt } from '../prompts/love.js'
import { PROMPT_VERSION as MARRIAGE_PROMPT_VERSION, buildMarriageTextReportPrompt } from '../prompts/marriage.js'
import { PROMPT_VERSION as CAREER_PROMPT_VERSION, buildCareerTextReportPrompt } from '../prompts/career.js'
import { PROMPT_VERSION as HEALTH_PROMPT_VERSION, buildHealthTextReportPrompt } from '../prompts/health.js'

const DEFAULT_MODEL = 'gemini-2.5-flash'
const MAX_OUTPUT_CAP = 8192

/** 로컬 `bun dev` 등 — 배포(프리뷰/프로덕션)에서는 파이프라인 상세 로그 생략 */
const GEMINI_PIPELINE_DEV_LOG = process.env.NODE_ENV === 'development'
/** 실험용: true면 repair 단계 호출 없이 primary 결과만 관찰 */
const DISABLE_REPAIR = true

/** 동일 reason이 이 횟수의 배수마다 DEV에서 warning (0이면 비활성) */
const GEMINI_FAILURE_WARN_THRESHOLD = (() => {
  const n = Number(process.env.GEMINI_FAILURE_WARN_THRESHOLD)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5
})()

/**
 * /api/gemini 실패 reason 누적 (프로세스·서버리스 인스턴스 메모리 기준).
 * 인스턴스가 바뀌면 초기화된다.
 */
type FailureStatKey =
  | 'non_json'
  | 'too_short'
  | 'missing_sections'
  | 'network'
  | 'empty'
  | 'blocked'
  | 'invalid_schema'
  | 'unknown'
  | 'upstream'

const failureStats: Record<FailureStatKey, number> = {
  non_json: 0,
  too_short: 0,
  missing_sections: 0,
  network: 0,
  empty: 0,
  blocked: 0,
  invalid_schema: 0,
  unknown: 0,
  upstream: 0,
}

function mapReasonToFailureStatKey(reason: string): FailureStatKey {
  if (reason === 'incomplete_sections') return 'missing_sections'
  if (reason in failureStats) return reason as FailureStatKey
  return 'unknown'
}

function recordGeminiFailure(reason: string, ctx: { kind: string; details?: string }) {
  const statKey = mapReasonToFailureStatKey(reason)
  failureStats[statKey] += 1

  if (!GEMINI_PIPELINE_DEV_LOG) return

  console.log('[gemini/failure]', {
    kind: ctx.kind,
    reason,
    details: ctx.details,
    stats: { ...failureStats },
  })

  const n = failureStats[statKey]
  if (GEMINI_FAILURE_WARN_THRESHOLD > 0 && n >= GEMINI_FAILURE_WARN_THRESHOLD && n % GEMINI_FAILURE_WARN_THRESHOLD === 0) {
    console.warn('[gemini/failure/warn]', {
      statKey,
      count: n,
      lastReason: reason,
      kind: ctx.kind,
    })
  }
}

type ClientBody = {
  prompt?: string
  systemInstruction?: string
  model?: string
  temperature?: number
  maxOutputTokens?: number
  jsonMode?: boolean
  minOutputChars?: number
  structuredOutput?: boolean
  mode?: 'integrated'
  kind?: 'wealth' | 'love' | 'marriage' | 'career' | 'health'
  /** 시간 미입력 해석 모드 (프롬프트 제약 안내용) */
  unknownTime?: boolean
  sajuData?: unknown
  /** 클라이언트 강제 새로고침 (서버는 상태 없음, 로깅·확장용) */
  force?: boolean
}

type GeminiPart = { text?: string }

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] }
    finishReason?: string
  }>
  error?: { message?: string; code?: number; status?: string }
}

type UpstreamOk = { ok: true; text: string; rawText: string; status: number; parsed: GeminiResponse }
type UpstreamErr = { ok: false; status: number; errorText: string; parsed?: GeminiResponse }

const GEMINI_RESULT_KEYS: Array<keyof GeminiResult> = [
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

const GEMINI_RESULT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  required: [...GEMINI_RESULT_KEYS],
  properties: Object.fromEntries(GEMINI_RESULT_KEYS.map(k => [k, { type: 'STRING' }])),
} as const

const VOICE_RULES = `
너는 요약 문장 생성기가 아니라, 동양 사주·자미두수·서양 점성술을 교차 해석하는 분석가이다.
반드시 근거를 드러내며 서술한다.
결과는 카드용 짧은 문장으로 축약하지 않는다.
각 섹션은 하나의 독립된 전문가 해설문처럼 작성한다.
실제 계산된 항목(일주·월주·오행·십성·명궁·성군·태양·달·상승·MC·각도·대운 등)을 문장 안에서 구체적으로 언급한다.
추상적 미사여구·누구에게나 통하는 자기계발형 문장·영성 과장은 금지한다.
데이터에 없는 간지·십성·별·각도를 지어내지 않는다.

절대 규칙:
- JSON 객체 하나만 출력한다.
- 머리말·설명문·마크다운·코드블록·주석 금지.
- 모든 key는 쌍따옴표, 스키마에 없는 key 금지.

말투:
- 구어체 금지.
- "~입니다" 또는 "~이다"로 종결하는 분석 문체.
- 감탄문 금지.
- "좋다" "추천한다" "운이 따른다" 같은 뭉툭한 표현 금지.

표기 규칙(필수):
- 모든 용어는 한글 우선으로 쓴다.
- 한자 또는 영문 기호를 쓸 때는 반드시 아래 형식만 허용한다: 한글(한자) 또는 한글(영문).
- 예: 식신(食神), 상관(傷官), 편재(偏財), 정관(正官), 비견(比肩), 임(壬), 인(寅), 수(水), 목(木).
- 예: 태양(太陽), 거문(巨門), 천기(天機), 천량(天梁), 명궁(命宮), 신궁(身宮).
- 예: 양자리(Aries), 물고기자리(Pisces), 중천(MC), 상승궁(Ascendant).
- 한자만 단독으로 쓰지 않는다. 영문 별자리·행성명만 단독으로 쓰지 않는다.
- 한국어 독자가 한글만 읽어도 의미가 통하도록 쓴다.
`.trim()

// 운영 프롬프트는 `prompts/`에서만 관리한다.

function sanitizePlainText(text: string): string {
  let t = String(text ?? '').trim()
  t = t.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '')
  t = t.replace(/```(?:[a-z]+)?/gi, '')
  t = t.replace(/```/g, '')
  // Gemini가 앞에 설명을 붙이는 경우가 있어 제목부터 잘라서 salvage
  const first = t.search(/(전체 요약|사주팔자 분석|자미두수 분석|점성술 분석|인생의 흐름과 대운|핵심 조언)/)
  if (first > 0) t = t.slice(first)
  return t.trim()
}

function sanitizePlainTextByHeadings(text: string, headings: string[]): string {
  let t = String(text ?? '').trim()
  t = t.replace(/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]/g, '')
  t = t.replace(/```(?:[a-z]+)?/gi, '')
  t = t.replace(/```/g, '')
  if (!headings.length) return t.trim()
  const escaped = headings.map(h => h.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')
  const first = t.search(new RegExp(`(${escaped})`))
  if (first > 0) t = t.slice(first)
  return t.trim()
}

type FortuneKind = 'wealth' | 'love' | 'marriage' | 'career' | 'health'
const FORTUNE_HEADINGS = ['사주팔자 분석', '자미두수 분석', '점성술 분석', '종합 해석', '핵심 조언'] as const

const INTEGRATED_SECTION_HEADINGS = [
  '전체 요약',
  '사주팔자 분석',
  '자미두수 분석',
  '점성술 분석',
  '인생의 흐름과 대운',
  '핵심 조언',
] as const

/** 통합·운세 plain text 공통: 최소 글자수 (미만이면 미완성으로 처리) */
const TEXT_PLAIN_MIN_CHARS = 300

type PlainTextReportKind = 'integrated' | FortuneKind

/** 운세 plain text: 출력이 한 섹션만 나오고 끊기는 경우 완결성 확보 */
const FORTUNE_MIN_MAX_OUTPUT_TOKENS = 6144

const FORTUNE_COMPLETION_RULES = `
출력 절대 규칙 (위반 시 응답은 사용할 수 없음):
- 반드시 아래 5개 섹션을 모두 작성한다. 한 섹션만 쓰고 출력을 끝내지 않는다.
- 각 섹션 제목은 아래 문자열을 변형·축약·번호 붙이기 없이 한 줄에 정확히 그대로 쓴다.
  사주팔자 분석
  자미두수 분석
  점성술 분석
  종합 해석
  핵심 조언
- 순서: 사주팔자 분석 → 자미두수 분석 → 점성술 분석 → 종합 해석 → 핵심 조언.
- 마지막 섹션 "핵심 조언"의 본문까지 반드시 작성한 뒤 출력을 종료한다.
- JSON·마크다운·코드블록·머리말 금지. 첫 줄부터 바로 첫 섹션 제목으로 시작한다.
`.trim()

function fortuneKindLabel(kind: FortuneKind): string {
  switch (kind) {
    case 'wealth':
      return '재물운'
    case 'love':
      return '애정운'
    case 'marriage':
      return '결혼운'
    case 'career':
      return '직업운'
    case 'health':
      return '건강운'
  }
}

function fortuneHeadingsPresence(content: string): Record<(typeof FORTUNE_HEADINGS)[number], boolean> {
  return {
    '사주팔자 분석': content.includes('사주팔자 분석'),
    '자미두수 분석': content.includes('자미두수 분석'),
    '점성술 분석': content.includes('점성술 분석'),
    '종합 해석': content.includes('종합 해석'),
    '핵심 조언': content.includes('핵심 조언'),
  }
}

function integratedHeadingsPresence(content: string): Record<(typeof INTEGRATED_SECTION_HEADINGS)[number], boolean> {
  return {
    '전체 요약': content.includes('전체 요약'),
    '사주팔자 분석': content.includes('사주팔자 분석'),
    '자미두수 분석': content.includes('자미두수 분석'),
    '점성술 분석': content.includes('점성술 분석'),
    '인생의 흐름과 대운': content.includes('인생의 흐름과 대운'),
    '핵심 조언': content.includes('핵심 조언'),
  }
}

function requiredHeadingsForPlainText(kind: PlainTextReportKind): readonly string[] {
  return kind === 'integrated' ? INTEGRATED_SECTION_HEADINGS : FORTUNE_HEADINGS
}

type ContentValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'incomplete_sections' | 'too_short'; missing: string[] }

type InvalidContentResult = Extract<ContentValidationResult, { ok: false }>

function isInvalidContentResult(result: ContentValidationResult): result is InvalidContentResult {
  return !result.ok
}

function isValidContent(content: string, kind: PlainTextReportKind): ContentValidationResult {
  const trimmed = content.trim()
  const required = [...requiredHeadingsForPlainText(kind)]
  if (!trimmed) {
    return { ok: false, reason: 'empty', missing: required }
  }
  const missing = required.filter(h => !trimmed.includes(h))
  if (missing.length > 0) {
    return { ok: false, reason: 'incomplete_sections', missing }
  }
  if (trimmed.length < TEXT_PLAIN_MIN_CHARS) {
    return { ok: false, reason: 'too_short', missing: [] }
  }
  return { ok: true }
}

function fortuneMissingForRetry(last: ContentValidationResult | null, content: string): string[] {
  if (last != null && isInvalidContentResult(last)) {
    if (last.reason === 'incomplete_sections') return last.missing
    if (last.reason === 'too_short') return [...FORTUNE_HEADINGS]
  }
  return [...FORTUNE_HEADINGS].filter(h => !content.includes(h))
}

function integratedMissingForRetry(last: ContentValidationResult | null, content: string): string[] {
  if (last != null && isInvalidContentResult(last)) {
    if (last.reason === 'incomplete_sections') return last.missing
    if (last.reason === 'too_short') return [...INTEGRATED_SECTION_HEADINGS]
  }
  return [...INTEGRATED_SECTION_HEADINGS].filter(h => !content.includes(h))
}

function buildFortuneIncompleteRetryPrompt(kind: FortuneKind, sajuData: unknown, partialText: string, missing: string[]): string {
  const data = buildIntegratedTextInput(sajuData)
  const label = fortuneKindLabel(kind)
  const safePartial = partialText.trim().slice(0, 6000)
  return `
너는 앞선 출력이 중도에 끊기거나 섹션이 누락되어 재작성이 필요하다.

주제: ${label}

아래 [이전 출력]은 불완전하다. 누락된 섹션: ${missing.join(', ') || '(검증 실패)'}

요구사항:
- [이전 출력]을 이어쓰기하지 말고, 5개 섹션을 처음부터 끝까지 한 번에 전부 다시 작성한다.
- 섹션 제목 5개는 반드시 아래와 문자 단위로 동일하게 한 줄씩 쓴다 (번호·기호 붙이지 않는다).
  사주팔자 분석
  자미두수 분석
  점성술 분석
  종합 해석
  핵심 조언
- "핵심 조언" 본문까지 작성한 뒤에만 끝낸다.
- JSON·마크다운·코드블록 금지.

[데이터 시작]
${data}
[데이터 끝]

[이전 출력 — 참고만 하고 복사하지 말 것]
${safePartial}
`.trim()
}

// 운영 프롬프트 본문은 `prompts/*.ts`에 위치한다.

function buildFortuneTextReportPrompt(kind: FortuneKind, sajuData: unknown): string {
  const core =
    kind === 'wealth'
      ? buildWealthTextReportPrompt(sajuData)
      : kind === 'love'
        ? buildLoveTextReportPrompt(sajuData)
        : kind === 'marriage'
          ? buildMarriageTextReportPrompt(sajuData)
          : kind === 'career'
            ? buildCareerTextReportPrompt(sajuData)
            : buildHealthTextReportPrompt(sajuData)
  return `${core}

다시 한 번 강조한다. 5개 섹션(사주팔자 분석·자미두수 분석·점성술 분석·종합 해석·핵심 조언)은 제목 문자열을 정확히 한 줄씩 쓰고 본문을 모두 채워야 한다. 한 섹션만 쓰고 출력을 끝내거나 중도에 멈추면 안 된다.

${INTEGRATED_TEXT_VOICE_RULES}

${FORTUNE_COMPLETION_RULES}`.trim()
}

function enrichSajuDataWithUnknownTimeFlag(sajuData: unknown, unknownTimeFromBody: boolean): unknown {
  if (!unknownTimeFromBody || !sajuData || typeof sajuData !== 'object' || Array.isArray(sajuData)) {
    return sajuData
  }
  const root = sajuData as Record<string, unknown>
  const input = root.input
  const nextInput =
    input && typeof input === 'object' && !Array.isArray(input)
      ? { ...(input as Record<string, unknown>), unknownTime: true }
      : { unknownTime: true }
  return {
    ...root,
    input: nextInput,
    unknownTime: true,
  }
}

// 통합 prompt는 `prompts/integrated.ts`에서 import한다.

function buildIntegratedIncompleteRetryPrompt(sajuData: unknown, partialText: string, missing: string[]): string {
  const integratedInput = buildIntegratedTextInput(sajuData)
  const safePartial = partialText.trim().slice(0, 6000)
  return `
너는 앞선 출력이 중도에 끊기거나 섹션이 누락되어 재작성이 필요하다.

아래 [이전 출력]은 불완전하다. 누락 또는 미흡: ${missing.join(', ') || '(검증 실패)'}

요구사항:
- [이전 출력]을 이어쓰기하지 말고, 6개 섹션을 처음부터 끝까지 한 번에 전부 다시 작성한다.
- 섹션 제목 6개는 반드시 아래와 문자 단위로 동일하게 한 줄씩 쓴다 (번호·기호 붙이지 않는다).
  전체 요약
  사주팔자 분석
  자미두수 분석
  점성술 분석
  인생의 흐름과 대운
  핵심 조언
- "핵심 조언" 본문까지 작성한 뒤에만 끝낸다.
- JSON·마크다운·코드블록 금지.

[데이터 시작]
${integratedInput}
[데이터 끝]

[이전 출력 — 참고만 하고 복사하지 말 것]
${safePartial}
`.trim()
}

/** 1차: 계산 데이터 기반 전문가 리포트 */
function buildPrimaryReportPrompt(sajuData: unknown): string {
  const body = `
아래는 사주·자미두수·점성술 계산 결과(JSON)이다. 이 데이터만 근거로 전문가 리포트형 JSON을 생성하라.

계산 데이터:
${JSON.stringify(sajuData, null, 2)}

출력 스키마(모든 필드 문자열, 빈 문자열 금지):
{
  "summary_title": "string",
  "summary_body": "string",
  "saju_title": "string",
  "saju_body": "string",
  "ziwei_title": "string",
  "ziwei_body": "string",
  "astrology_title": "string",
  "astrology_body": "string",
  "flow_title": "string",
  "flow_body": "string",
  "advice_title": "string",
  "advice_body": "string"
}

title 규칙:
- 각 title은 해당 섹션의 핵심 키워드를 담은 한 줄 제목이다.
- 예: "사주팔자 분석: 수생목(水生木)의 흐름, 넘치는 표현력" (한자는 괄호 안에만)

각 *_body 공통 구조(강제):
1) 결론 1문장
2) 근거 2~4문장 (해당 영역의 실제 계산 항목을 문장 속에 명시)
3) 해석 확장 1~2문장 (실제 삶·선택·관계·일에서의 의미)

분량(한글 기준 글자 수):
- summary_body: 300자 이상 400자 이하
- saju_body, ziwei_body, astrology_body, flow_body, advice_body: 각각 300자 이상 500자 이하
- 한두 문장 요약으로 끝내지 않는다.

섹션별 내용:
1) summary_body: 한 사람을 한 문장 비유로 정의한 뒤, 사주·자미두수·점성술 핵심을 모두 언급하며 300~400자로 요약한다.
2) saju_body: 일주·월주 등 실제 사주 근거, 오행 분포, 십성, 충합·신살 중 데이터에 있는 것을 인용하여 왜 그런 성향이 나오는지 명리 용어로 설명한다.
3) ziwei_body: 명궁·신궁·주요 성군·사화(화록/화권/화기/화과)·복덕·질액·관록 등 데이터에 있는 항목을 인용한다. 시간 미입력으로 ziwei가 null이면 그 사실을 근거로 서술 범위를 제한한다.
4) astrology_body: 태양·달·상승, 금성·화성, MC, 주요 aspect 등 데이터에 있는 항목을 인용한다.
5) flow_body: 사주 대운·세운 흐름을 반드시 언급하고, 가능하면 자미 대운과 연결한다. 현재 시기와 다음 시기를 구분한다.
6) advice_body: 조언 2~3가지. 각 조언은 앞선 구조에 근거한 실행 가능한 방향이어야 한다.

JSON만 출력한다.
`.trim()

  return `${VOICE_RULES}\n\n${body}`
}

/** 사용자에게 노출되는 짧은 안내(API `message`) */
const USER_REPAIR_JSON_FAIL_MESSAGE = '해석 형식을 정리하지 못했습니다. 다시 시도해 주세요.'

/** 2차: 형식 복구만(원문 전체 삽입 금지 — 이스케이프된 짧은 발췌만) */
function buildRepairReportPrompt(rawText: string): string {
  const rawPreview = JSON.stringify(String(rawText).slice(0, 800))
  return `
이전 응답은 JSON 형식이 아니었습니다. 내용을 새로 설명하지 말고, 아래 스키마에 맞는 유효한 JSON 객체 하나만 다시 출력하세요.

역할: 형식 복구만 한다. 새 해석을 쓰지 말고, 발췌문의 정보 밀도와 분량을 최대한 유지해 구조만 정리한다. 한 줄 요약으로 축약하지 않는다.

규칙(위반 시 파서가 실패한다):
- 반드시 JSON 객체 하나만 출력한다.
- 코드블록·마크다운 금지.
- 설명문·머리말 금지.
- 모든 value는 JSON 문자열(쌍따옴표로 감쌈)이어야 한다.
- 문자열 값 내부에 큰따옴표(")를 쓰지 않는다. 인용이 필요하면 작은따옴표나 괄호만 쓴다.
- 값 안에 줄바꿈을 넣지 않는다. 문장은 공백으로 이어 한 줄로 쓴다.
- 스키마에 없는 key 금지.

스키마(키와 순서는 자유, 키 이름은 정확히 일치):
{
  "summary_title": "string",
  "summary_body": "string",
  "saju_title": "string",
  "saju_body": "string",
  "ziwei_title": "string",
  "ziwei_body": "string",
  "astrology_title": "string",
  "astrology_body": "string",
  "flow_title": "string",
  "flow_body": "string",
  "advice_title": "string",
  "advice_body": "string"
}

참고용 이전 응답 발췌(아래는 JSON 이스케이프된 문자열 한 덩어리이다. 이 따옴표 블록 전체를 그대로 출력하지 말고, 내용만 위 스키마 필드에 나누어 담는다):
${rawPreview}
`.trim()
}

function mergeInstructions(systemInstruction: string | undefined, prompt: string): { systemBlock: string; userPrompt: string } {
  const sys = (systemInstruction ?? '').trim()
  const pr = (prompt ?? '').trim()
  if (!pr) return { systemBlock: sys, userPrompt: '' }
  if (!sys) return { systemBlock: '', userPrompt: pr }
  return { systemBlock: sys, userPrompt: pr }
}

function extractText(upstream: GeminiResponse): string {
  const parts = upstream.candidates?.[0]?.content?.parts
  return parts?.map(p => p.text ?? '').join('').trim() ?? ''
}

function extractFinishReason(upstream: GeminiResponse): string | undefined {
  return upstream.candidates?.[0]?.finishReason
}

function classifyUpstreamFailure(err: UpstreamErr): { reason: GeminiFailureReason; message: string } {
  const fr = err.parsed ? extractFinishReason(err.parsed) : undefined
  const text = err.errorText.trim()

  if (!text || text === 'no text') {
    return { reason: 'empty', message: '모델 응답 본문이 비어 있습니다.' }
  }

  const safetyBlock =
    fr === 'SAFETY' ||
    fr === 'RECITATION' ||
    /safety|blocked|policy|candidates.*filter/i.test(text) ||
    err.status === 403 ||
    err.status === 429

  if (safetyBlock) {
    return { reason: 'blocked', message: '응답이 정책에 의해 제한되었습니다.' }
  }

  if (err.status === 400 || err.status === 401) {
    return { reason: 'unknown', message: text.slice(0, 200) }
  }

  if (err.status >= 500 || err.status === 502 || err.status === 503) {
    return { reason: 'network', message: '업스트림 서버 오류입니다.' }
  }

  if (err.status === 0 || !Number.isFinite(err.status)) {
    return { reason: 'network', message: text.slice(0, 200) }
  }

  return { reason: 'unknown', message: text.slice(0, 200) }
}

function logPipelineDev(event: string, payload?: Record<string, unknown>) {
  if (!GEMINI_PIPELINE_DEV_LOG) return
  if (payload && Object.keys(payload).length > 0) {
    console.info(`[gemini/pipeline] ${event}`, payload)
  } else {
    console.info(`[gemini/pipeline] ${event}`)
  }
}

function logValidationFailDev(phase: 'primary' | 'repair', reason: string, details: string | undefined, rawText?: string) {
  if (!GEMINI_PIPELINE_DEV_LOG) return
  const payload: Record<string, unknown> = { phase, reason, details }
  if (rawText) payload.rawPreview = rawText.slice(0, 500)
  console.info('[gemini/pipeline] parse/validate fail', payload)
}

type StructuredRunResult =
  | { kind: 'success'; data: GeminiResult; source: 'primary' | 'repair' }
  | { kind: 'fallback'; reason: GeminiFailureReason; message: string; details?: string }
  | { kind: 'error'; reason: GeminiFailureReason; message: string; details?: string }

/** Network 탭과 동일한 요지로 남김(민감 본문 제외) */
function logStructuredApiResponse(body: Record<string, unknown>) {
  if (!GEMINI_PIPELINE_DEV_LOG) return
  console.info('[api/gemini] structured response body', body)
}

function logDebug(label: string, payload: unknown) {
  if (!GEMINI_PIPELINE_DEV_LOG) return
  console.info(`[gemini/debug] ${label}`, payload)
}

function readBodyLengthFromUnknown(parsed: unknown, key: keyof GeminiResult): number | null {
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const value = (parsed as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.length : null
}

function readBodyPreviewFromUnknown(parsed: unknown, key: keyof GeminiResult, max = 200): string {
  if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return ''
  const value = (parsed as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function logValidateLengths(report: GeminiResult) {
  logDebug('validate lengths', {
    saju: report.saju_body.length,
    ziwei: report.ziwei_body.length,
    astrology: report.astrology_body.length,
    flow: report.flow_body.length,
    advice: report.advice_body.length,
  })
}

async function runStructuredReportPipeline(
  apiKey: string,
  model: string,
  sajuData: unknown,
  generationConfig: Record<string, unknown>,
  force?: boolean,
): Promise<StructuredRunResult> {
  let primaryFailure: { reason: GeminiFailureReason; details?: string } | null = null

  if (force) {
    logPipelineDev('force refresh requested')
  }

  const primaryPrompt = buildPrimaryReportPrompt(sajuData)
  logPipelineDev('primary start')
  const primaryUpstream = await callGeminiUpstreamWithRetry(apiKey, model, '', primaryPrompt, generationConfig)

  if (isUpstreamErr(primaryUpstream)) {
    const { reason, message } = classifyUpstreamFailure(primaryUpstream)
    const details = primaryUpstream.errorText.trim().slice(0, 500) || undefined
    logPipelineDev('primary failed', { step: 'upstream', reason, message, details })
    return { kind: 'error', reason, message, details }
  }

  const rawPrimary = primaryUpstream.text
  logDebug('primary raw length', rawPrimary.length)
  const preparedPrimary = prepareTextForJsonParse(rawPrimary)
  const primaryJson = parseReportJson(preparedPrimary)

  if (isParseReportJsonFail(primaryJson)) {
    const reason = primaryJson.reason
    const details = primaryJson.details
    primaryFailure = { reason, details }
    logValidationFailDev('primary', reason, details, rawPrimary)
    logPipelineDev('primary failed', { step: 'parse', reason, details })
  } else if (isParseReportJsonOk(primaryJson)) {
    const primaryValue = primaryJson.value
    logDebug('primary parsed saju_body length', readBodyLengthFromUnknown(primaryValue, 'saju_body'))
    logDebug('primary parsed saju_body preview', readBodyPreviewFromUnknown(primaryValue, 'saju_body'))
    if (primaryValue != null && typeof primaryValue === 'object' && !Array.isArray(primaryValue)) {
      const maybeReport = primaryValue as Partial<GeminiResult>
      if (
        typeof maybeReport.saju_body === 'string' &&
        typeof maybeReport.ziwei_body === 'string' &&
        typeof maybeReport.astrology_body === 'string' &&
        typeof maybeReport.flow_body === 'string' &&
        typeof maybeReport.advice_body === 'string'
      ) {
        logValidateLengths(maybeReport as GeminiResult)
      }
    }
    const validatedPrimary = validateReportJson(primaryValue, 'primary')
    if (isValidateReportFail(validatedPrimary)) {
      const reason = validatedPrimary.reason
      const details = validatedPrimary.details
      primaryFailure = { reason, details }
      logValidationFailDev('primary', reason, details, rawPrimary)
      logPipelineDev('primary failed', { step: 'validate', reason, details })
    } else if (isValidateReportOk(validatedPrimary)) {
      const data = normalizeReport(validatedPrimary.data)
      logDebug('normalized saju_body length', data.saju_body.length)
      logDebug('normalized saju_body preview', data.saju_body.slice(0, 200))
      logPipelineDev('primary success')
      return { kind: 'success', data, source: 'primary' }
    }
  }

  if (DISABLE_REPAIR) {
    const reason = primaryFailure?.reason ?? 'unknown'
    const details = primaryFailure?.details
    const message = '해석 형식을 정리하지 못했습니다. 다시 시도해 주세요.'
    logPipelineDev('repair skipped (DISABLE_REPAIR=true)', { reason, details, message })
    return { kind: 'fallback', reason, message, details }
  }

  logPipelineDev('repair start')
  const repairPrompt = buildRepairReportPrompt(rawPrimary)
  const repairGenerationConfig = {
    ...generationConfig,
    temperature: 0,
  }
  const repairUpstream = await callGeminiUpstreamWithRetry(apiKey, model, '', repairPrompt, repairGenerationConfig)

  if (isUpstreamErr(repairUpstream)) {
    const { reason, message } = classifyUpstreamFailure(repairUpstream)
    const details = repairUpstream.errorText.trim().slice(0, 500) || undefined
    const msg = message || '보정 요청에 실패했습니다.'
    logPipelineDev('repair failed', { step: 'upstream', reason, message: msg, details })
    logPipelineDev('fallback return', { reason, message: msg, details })
    return {
      kind: 'fallback',
      reason,
      message: msg,
      details,
    }
  }

  const rawRepair = repairUpstream.text
  logDebug('repair raw length', rawRepair.length)
  const preparedRepair = prepareTextForJsonParse(rawRepair)
  const repairJson = parseReportJson(preparedRepair)

  if (isParseReportJsonFail(repairJson)) {
    const reason = repairJson.reason
    const details = repairJson.details
    logValidationFailDev('repair', reason, details, rawRepair)
    logPipelineDev('repair failed', { step: 'parse', reason, details })
    if (GEMINI_PIPELINE_DEV_LOG) {
      const preview = rawRepair.slice(0, Math.min(500, Math.max(300, rawRepair.length)))
      console.info('[gemini/pipeline] repair raw preview', preview)
    }
    const internalDetails = details
      ? `보정 응답을 JSON으로 읽지 못했습니다. (${details})`
      : '보정 응답을 JSON으로 읽지 못했습니다.'
    logPipelineDev('fallback return', { reason, message: USER_REPAIR_JSON_FAIL_MESSAGE, details: internalDetails })
    return {
      kind: 'fallback',
      reason,
      message: USER_REPAIR_JSON_FAIL_MESSAGE,
      details: internalDetails,
    }
  }

  if (isParseReportJsonOk(repairJson)) {
    const repairValue = repairJson.value
    logDebug('repair parsed saju_body length', readBodyLengthFromUnknown(repairValue, 'saju_body'))
    logDebug('repair parsed saju_body preview', readBodyPreviewFromUnknown(repairValue, 'saju_body'))
    if (repairValue != null && typeof repairValue === 'object' && !Array.isArray(repairValue)) {
      const maybeReport = repairValue as Partial<GeminiResult>
      if (
        typeof maybeReport.saju_body === 'string' &&
        typeof maybeReport.ziwei_body === 'string' &&
        typeof maybeReport.astrology_body === 'string' &&
        typeof maybeReport.flow_body === 'string' &&
        typeof maybeReport.advice_body === 'string'
      ) {
        logValidateLengths(maybeReport as GeminiResult)
      }
    }
    const validatedRepair = validateReportJson(repairValue, 'strict')
    if (isValidateReportFail(validatedRepair)) {
      const reason = validatedRepair.reason
      const details = validatedRepair.details
      logValidationFailDev('repair', reason, details, rawRepair)
      logPipelineDev('repair failed', { step: 'validate', reason, details })
      const message = details
        ? `보정 후에도 리포트 검증을 통과하지 못했습니다. (${details})`
        : '보정 후에도 리포트 검증을 통과하지 못했습니다.'
      logPipelineDev('fallback return', { reason, message, details })
      return {
        kind: 'fallback',
        reason,
        message,
        details,
      }
    }
    if (isValidateReportOk(validatedRepair)) {
      const data = normalizeReport(validatedRepair.data)
      logDebug('normalized saju_body length', data.saju_body.length)
      logDebug('normalized saju_body preview', data.saju_body.slice(0, 200))
      logPipelineDev('repair success')
      return { kind: 'success', data, source: 'repair' }
    }
  }

  logPipelineDev('repair failed', { step: 'unknown_branch', reason: 'unknown' })
  logPipelineDev('fallback return', {
    reason: 'unknown',
    message: '보정 응답 처리를 완료하지 못했습니다.',
  })
  return {
    kind: 'fallback',
    reason: 'unknown',
    message: '보정 응답 처리를 완료하지 못했습니다.',
  }
}

function isUpstreamErr(result: UpstreamOk | UpstreamErr): result is UpstreamErr {
  return 'errorText' in result
}

async function callGeminiUpstream(
  apiKey: string,
  model: string,
  systemBlock: string,
  userPrompt: string,
  generationConfig: Record<string, unknown>,
): Promise<UpstreamOk | UpstreamErr> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

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

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const rawText = await r.text()
  let upstream: GeminiResponse
  try {
    upstream = JSON.parse(rawText) as GeminiResponse
  } catch {
    return { ok: false, status: r.status, errorText: rawText.slice(0, 500) }
  }

  if (!r.ok) {
    return { ok: false, status: r.status, errorText: upstream.error?.message ?? rawText.slice(0, 500), parsed: upstream }
  }
  if (upstream.error?.message) {
    return { ok: false, status: 502, errorText: upstream.error.message, parsed: upstream }
  }

  const text = extractText(upstream)
  if (!text) {
    return {
      ok: false,
      status: 502,
      errorText: extractFinishReason(upstream) ?? 'no text',
      parsed: upstream,
    }
  }

  return { ok: true, text, rawText, status: r.status, parsed: upstream }
}

/** 본 시도 실패(throw) 시에만 1회 재호출. 총 최대 2회, 무한 루프 없음. */
async function callWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    console.warn('retry 1')
    return await fn()
  }
}

/** 재시도 가능한 응답(429·일부 5xx). 논리 호출당 Gemini fetch는 최대 2회(본 시도 + 재시도 1회). */
const GEMINI_UPSTREAM_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])

async function callGeminiUpstreamWithRetry(
  ...args: Parameters<typeof callGeminiUpstream>
): Promise<UpstreamOk | UpstreamErr> {
  let invokeCount = 0
  const run = () => {
    invokeCount += 1
    return callGeminiUpstream(...args)
  }

  let r: UpstreamOk | UpstreamErr
  try {
    r = await callWithRetry(run)
  } catch (e) {
    return {
      ok: false,
      status: 0,
      errorText: e instanceof Error ? e.message : String(e),
    }
  }

  const alreadyUsedThrowRetry = invokeCount >= 2

  if (
    !alreadyUsedThrowRetry &&
    isUpstreamErr(r) &&
    GEMINI_UPSTREAM_RETRYABLE_STATUS.has(r.status)
  ) {
    console.warn('retry 1')
    try {
      r = await run()
    } catch (e) {
      return {
        ok: false,
        status: 0,
        errorText: e instanceof Error ? e.message : String(e),
      }
    }
  }

  return r
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

  const textForce = body.force === true
  const textSajuData = body.sajuData ?? null
  const inferredUnknownTime =
    textSajuData && typeof textSajuData === 'object' && !Array.isArray(textSajuData)
      ? ((textSajuData as Record<string, unknown>).input as Record<string, unknown> | undefined)?.unknownTime === true
      : false
  const bodyUnknownTime = body.unknownTime === true || inferredUnknownTime
  const kind = body.kind
  const isIntegrated = body.mode === 'integrated' || body.prompt === 'integrated'
  const isFortune =
    kind === 'wealth' || kind === 'love' || kind === 'marriage' || kind === 'career' || kind === 'health'

  if (isIntegrated || isFortune) {
    if (!textSajuData || typeof textSajuData !== 'object') {
      recordGeminiFailure('unknown', {
        kind: isIntegrated ? 'integrated' : String(kind ?? 'fortune'),
        details: 'sajuData is required',
      })
      return res.status(400).json({ ok: false, status: 'error', reason: 'unknown', message: 'sajuData is required' })
    }

    const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL
    const temperature =
      typeof body.temperature === 'number' && Number.isFinite(body.temperature)
        ? Math.min(2, Math.max(0, body.temperature))
        : 0.2
    const maxOutputTokens =
      typeof body.maxOutputTokens === 'number' && Number.isFinite(body.maxOutputTokens)
        ? Math.min(MAX_OUTPUT_CAP, Math.max(1, Math.floor(body.maxOutputTokens)))
        : 4096

    // 운세 plain text: 5개 섹션 완결·max 토큰 확보 (기본 4096보다 상향)
    const fortuneMinMaxOutputTokens = Math.min(MAX_OUTPUT_CAP, FORTUNE_MIN_MAX_OUTPUT_TOKENS)
    const effectiveMaxOutputTokens = isFortune ? Math.max(maxOutputTokens, fortuneMinMaxOutputTokens) : maxOutputTokens

    if (textForce) {
      console.info('[gemini] force refresh requested')
    }

    const promptSajuData = enrichSajuDataWithUnknownTimeFlag(textSajuData, bodyUnknownTime)
    const integratedPrompt = buildIntegratedTextReportPrompt(promptSajuData)
    const generationConfig: Record<string, unknown> = { temperature, maxOutputTokens: effectiveMaxOutputTokens }

    try {
      if (isFortune) {
        if (GEMINI_PIPELINE_DEV_LOG) {
          const v =
            kind === 'wealth'
              ? WEALTH_PROMPT_VERSION
              : kind === 'love'
                ? LOVE_PROMPT_VERSION
                : kind === 'marriage'
                  ? MARRIAGE_PROMPT_VERSION
                  : kind === 'career'
                    ? CAREER_PROMPT_VERSION
                    : HEALTH_PROMPT_VERSION
          console.log('[prompt]', v, kind)
          if (bodyUnknownTime) console.info('[prompt] unknownTime=true')
        }
        let content = ''
        let lastValidation: ContentValidationResult | null = null

        for (let attempt = 0; attempt < 2; attempt++) {
          const missingForRetry = fortuneMissingForRetry(lastValidation, content)

          const promptForAttempt =
            attempt === 0
              ? buildFortuneTextReportPrompt(kind, promptSajuData)
              : buildFortuneIncompleteRetryPrompt(kind, promptSajuData, content, missingForRetry)

          const upstream = await callGeminiUpstreamWithRetry(apiKey, model, '', promptForAttempt, generationConfig)
          if (isUpstreamErr(upstream)) {
            const { reason, message } = classifyUpstreamFailure(upstream)
            const details = upstream.errorText.trim().slice(0, 500) || undefined
            recordGeminiFailure(reason, { kind: String(kind), details })
            return res.status(200).json({
              ok: false,
              status: 'error',
              mode: 'text',
              reason,
              message,
              details,
            })
          }

          content = sanitizePlainTextByHeadings(upstream.text, [...FORTUNE_HEADINGS])
          const validated = isValidContent(content, kind)
          lastValidation = validated
          const finishReason = extractFinishReason(upstream.parsed)
          const headingsFound = fortuneHeadingsPresence(content)

          if (GEMINI_PIPELINE_DEV_LOG) {
            const trimmed = content.trim()
            const lastChar = trimmed.slice(-1)
            const lastCharIsPunct = /[.!?。！？…]/.test(lastChar)
            console.info('[fortune/debug] kind', kind)
            console.info('[fortune/debug] attempt', attempt)
            console.info('[fortune/debug] finishReason', finishReason)
            console.info('[fortune/debug] content length', content.length)
            console.info('[fortune/debug] content preview first 300', content.slice(0, 300))
            console.info('[fortune/debug] content preview last 300', trimmed.length > 300 ? trimmed.slice(-300) : trimmed)
            console.info('[fortune/debug] headings found', headingsFound)
            if (!lastCharIsPunct) {
              console.info('[fortune/debug] possible truncation (last char not punctuation)', {
                lastChar,
                last5: trimmed.slice(-5),
              })
            }
          }

          if (validated.ok) {
            return res.status(200).json({
              ok: true,
              status: 'success',
              mode: 'text',
              content,
            })
          }
          if (isInvalidContentResult(validated)) {
            const invalid = validated
            if (GEMINI_PIPELINE_DEV_LOG) {
              console.warn('[fortune/debug] incomplete fortune text — will retry if attempts remain', {
                attempt,
                reason: invalid.reason,
                missing: invalid.missing,
              })
            }

            if (attempt === 1) {
              const message =
                invalid.reason === 'too_short'
                  ? '해석이 너무 짧아 완료되지 않았습니다. 다시 시도해 주세요.'
                  : invalid.reason === 'empty'
                    ? '해석을 완성하지 못했습니다. 다시 시도해 주세요.'
                    : '해석의 일부 섹션이 누락되어 완료되지 않았습니다. 다시 시도해 주세요.'
              const details =
                invalid.reason === 'incomplete_sections'
                  ? `누락 섹션: ${invalid.missing.join(', ')}`
                  : invalid.reason === 'too_short'
                    ? `length=${content.length}, min=${TEXT_PLAIN_MIN_CHARS}`
                    : undefined
              recordGeminiFailure(invalid.reason, { kind: String(kind), details })
              return res.status(200).json({
                ok: false,
                status: 'fallback',
                mode: 'text',
                reason: invalid.reason,
                message,
                ...(details ? { details } : {}),
              })
            }
          }
        }

        recordGeminiFailure('incomplete_sections', {
          kind: String(kind),
          details: 'fortune loop exhausted without success',
        })
        return res.status(200).json({
          ok: false,
          status: 'fallback',
          mode: 'text',
          reason: 'incomplete_sections',
          message: '해석을 완성하지 못했습니다. 다시 시도해 주세요.',
        })
      }

      if (GEMINI_PIPELINE_DEV_LOG) {
        console.log('[prompt]', INTEGRATED_PROMPT_VERSION, 'integrated')
        if (bodyUnknownTime) console.info('[prompt] unknownTime=true')
      }
      let integratedContent = ''
      let lastIntegratedValidation: ContentValidationResult | null = null

      for (let attempt = 0; attempt < 2; attempt++) {
        const missingForRetry = integratedMissingForRetry(lastIntegratedValidation, integratedContent)

        const promptForAttempt =
          attempt === 0
            ? integratedPrompt
            : buildIntegratedIncompleteRetryPrompt(promptSajuData, integratedContent, missingForRetry)

        const upstream = await callGeminiUpstreamWithRetry(apiKey, model, '', promptForAttempt, generationConfig)
        if (isUpstreamErr(upstream)) {
          const { reason, message } = classifyUpstreamFailure(upstream)
          const details = upstream.errorText.trim().slice(0, 500) || undefined
          recordGeminiFailure(reason, { kind: 'integrated', details })
          return res.status(200).json({
            ok: false,
            status: 'error',
            mode: 'text',
            reason,
            message,
            details,
          })
        }

        integratedContent = sanitizePlainText(upstream.text)
        const validated = isValidContent(integratedContent, 'integrated')
        lastIntegratedValidation = validated

        if (GEMINI_PIPELINE_DEV_LOG) {
          console.info('[gemini/debug] integrated attempt', attempt)
          console.info('[gemini/debug] integrated content length', integratedContent.length)
          console.info('[gemini/debug] integrated content preview', integratedContent.slice(0, 500))
          console.info('[gemini/debug] integrated headings found', integratedHeadingsPresence(integratedContent))
          console.info('[gemini/debug] integrated finishReason', extractFinishReason(upstream.parsed))
        }

        if (validated.ok) {
          return res.status(200).json({
            ok: true,
            status: 'success',
            mode: 'text',
            content: integratedContent,
          })
        }
        if (isInvalidContentResult(validated)) {
          const invalid = validated
          if (GEMINI_PIPELINE_DEV_LOG) {
            console.warn('[gemini/debug] integrated incomplete — will retry if attempts remain', {
              attempt,
              reason: invalid.reason,
              missing: invalid.missing,
            })
          }

          if (attempt === 1) {
            const message =
              invalid.reason === 'too_short'
                ? '해석이 너무 짧아 완료되지 않았습니다. 다시 시도해 주세요.'
                : invalid.reason === 'empty'
                  ? '해석을 완성하지 못했습니다. 다시 시도해 주세요.'
                  : '해석의 일부 섹션이 누락되어 완료되지 않았습니다. 다시 시도해 주세요.'
            const details =
              invalid.reason === 'incomplete_sections'
                ? `누락 섹션: ${invalid.missing.join(', ')}`
                : invalid.reason === 'too_short'
                  ? `length=${integratedContent.length}, min=${TEXT_PLAIN_MIN_CHARS}`
                  : undefined
            recordGeminiFailure(invalid.reason, { kind: 'integrated', details })
            return res.status(200).json({
              ok: false,
              status: 'fallback',
              mode: 'text',
              reason: invalid.reason,
              message,
              ...(details ? { details } : {}),
            })
          }
        }
      }

      recordGeminiFailure('incomplete_sections', {
        kind: 'integrated',
        details: 'integrated loop exhausted without success',
      })
      return res.status(200).json({
        ok: false,
        status: 'fallback',
        mode: 'text',
        reason: 'incomplete_sections',
        message: '해석을 완성하지 못했습니다. 다시 시도해 주세요.',
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      console.error('[api/gemini] text report error', message)
      recordGeminiFailure('network', {
        kind: isFortune ? String(kind) : 'integrated',
        details: message,
      })
      return res.status(200).json({
        ok: false,
        status: 'error',
        mode: 'text',
        reason: 'network',
        message: '요청 처리 중 오류가 발생했습니다.',
        details: message,
      })
    }
  }

  const structuredOutput = body.structuredOutput === true
  const force = body.force === true
  const prompt = typeof body.prompt === 'string' ? body.prompt : ''
  if (!structuredOutput && !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' })
  }

  const model = typeof body.model === 'string' && body.model.trim() ? body.model.trim() : DEFAULT_MODEL
  let temperature =
    typeof body.temperature === 'number' && Number.isFinite(body.temperature)
      ? Math.min(2, Math.max(0, body.temperature))
      : 0.7
  let maxOutputTokens =
    typeof body.maxOutputTokens === 'number' && Number.isFinite(body.maxOutputTokens)
      ? Math.min(MAX_OUTPUT_CAP, Math.max(1, Math.floor(body.maxOutputTokens)))
      : 2048
  let jsonMode = body.jsonMode === true
  const systemInstruction = typeof body.systemInstruction === 'string' ? body.systemInstruction : undefined

  const minOutputChars =
    typeof body.minOutputChars === 'number' && Number.isFinite(body.minOutputChars) && body.minOutputChars > 0
      ? Math.min(8000, Math.floor(body.minOutputChars))
      : undefined

  if (minOutputChars && !jsonMode) {
    maxOutputTokens = Math.min(MAX_OUTPUT_CAP, Math.max(maxOutputTokens, 4096))
  }

  let userPrompt = prompt
  let systemBlock = systemInstruction ?? ''
  const sajuData = body.sajuData ?? {}

  if (structuredOutput) {
    jsonMode = true
    temperature = 0.2
    maxOutputTokens = Math.min(MAX_OUTPUT_CAP, 4096)
    systemBlock = ''
  } else {
    const merged = mergeInstructions(systemInstruction, prompt)
    systemBlock = merged.systemBlock
    userPrompt = merged.userPrompt
  }

  const generationConfig: Record<string, unknown> = {
    temperature,
    maxOutputTokens,
  }
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json'
    if (structuredOutput) {
      generationConfig.responseSchema = GEMINI_RESULT_RESPONSE_SCHEMA
    }
  }

  if (GEMINI_PIPELINE_DEV_LOG) {
    console.info('[api/gemini] request', { model, structured: structuredOutput, force })
  }

  try {
    if (structuredOutput) {
      const out = await runStructuredReportPipeline(apiKey, model, sajuData, generationConfig, force)
      if (out.kind === 'success') {
        const body = {
          ok: true as const,
          status: 'success' as const,
          data: out.data,
          source: out.source,
        }
        logStructuredApiResponse({ ...body, data: '[GeminiResult]' })
        return res.status(200).json(body)
      }
      if (out.kind === 'error') {
        const body: Record<string, unknown> = {
          ok: false,
          status: 'error',
          reason: out.reason,
          message: out.message,
        }
        if (out.details) body.details = out.details
        logStructuredApiResponse(body)
        recordGeminiFailure(out.reason, {
          kind: 'structured',
          details: typeof out.details === 'string' ? out.details : undefined,
        })
        return res.status(200).json(body)
      }
      const body: Record<string, unknown> = {
        ok: true,
        status: 'fallback',
        data: null,
        reason: out.reason,
        message: out.message,
      }
      if (out.details) body.details = out.details
      logStructuredApiResponse(body)
      recordGeminiFailure(out.reason, {
        kind: 'structured',
        details: typeof out.details === 'string' ? out.details : undefined,
      })
      return res.status(200).json(body)
    }

    const first = await callGeminiUpstreamWithRetry(apiKey, model, systemBlock, userPrompt, generationConfig)
    if (isUpstreamErr(first)) {
      if (GEMINI_PIPELINE_DEV_LOG) {
        console.info('[api/gemini] text mode upstream fail', {
          status: first.status,
          errorPreview: first.errorText.slice(0, 200),
        })
      }
      recordGeminiFailure('upstream', {
        kind: 'prompt',
        details: first.errorText.slice(0, 500),
      })
      return res.status(502).json({
        error: 'Gemini request failed',
        reason: 'upstream',
        message: 'Gemini 요청이 실패했습니다.',
        details: first.errorText,
      })
    }

    let finalText = first.text
    const jsonRaw: GeminiResponse | undefined = jsonMode ? first.parsed : undefined

    if (!jsonMode && minOutputChars && finalText.length < minOutputChars) {
      const expandPrompt =
        `Your previous answer was too short (${finalText.length} characters). ` +
        `Rewrite and expand into ONE continuous plain-text reply in Korean. ` +
        `You MUST exceed ${minOutputChars} Korean characters total. ` +
        `Follow the same style rules from the system instruction (spoken Korean, no markdown, no bullets, no emojis). ` +
        `Stay strictly consistent with the saju facts from the system instruction; do not invent pillars or ten-gods.\n\n` +
        `Previous answer to expand upon:\n---\n${finalText}\n---`

      const second = await callGeminiUpstreamWithRetry(apiKey, model, systemBlock, expandPrompt, generationConfig)
      if (second.ok) {
        finalText = second.text
      }
    }

    return res.status(200).json({
      text: finalText,
      raw: jsonMode ? jsonRaw : undefined,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[api/gemini] fetch error', message)
    if (structuredOutput) {
      recordGeminiFailure('network', { kind: 'structured', details: message })
      return res.status(200).json({
        ok: false,
        status: 'error',
        reason: 'network',
        message: '요청 처리 중 네트워크 오류가 발생했습니다.',
        details: message,
      })
    }
    recordGeminiFailure('network', { kind: 'prompt', details: message })
    return res.status(502).json({
      error: 'Upstream fetch failed',
      reason: 'network',
      message: '서버에서 upstream 호출에 실패했습니다.',
      details: message,
    })
  }
}
