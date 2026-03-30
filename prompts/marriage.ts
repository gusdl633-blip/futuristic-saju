import { buildIntegratedTextInput, UNKNOWN_TIME_PROMPT_RULES } from './integrated.js'

export const PROMPT_VERSION = 'v1.0'

export function buildMarriageTextReportPrompt(sajuData: unknown): string {
  const data = buildIntegratedTextInput(sajuData)
  return `
넌 사주 기반 인생 흐름 분석 전문가다.

아래 데이터를 기반으로 "결혼운"을 분석하라.

결혼 가능성, 시기, 배우자 성향을 중심으로 분석해야 한다.

반드시 아래 구조로 작성:

사주팔자 분석
- 관성, 일지, 합/충 중심으로 결혼 가능성 분석
- 배우자 성향 구체화

자미두수 분석
- 부부궁, 대운 흐름 중심으로 결혼 타이밍 분석
- 안정형 결혼인지 변동형 결혼인지 판단

점성술 분석
- 7하우스, 금성, 토성 중심으로 결혼 구조 분석
- 장기 관계 가능성 평가

종합 해석
- 결혼 시기 / 결혼 안정성 / 리스크

핵심 조언
- 결혼하면 좋은 타이밍
- 결혼 시 반드시 고려해야 할 요소

조건:
- 막연한 “좋다/나쁘다” 금지
- 시기와 구조 명확히 제시
- 출생 시간이 미입력인 경우 아래 규칙을 반드시 적용:
${UNKNOWN_TIME_PROMPT_RULES}

지금부터 결혼운 해석을 작성하라.

[데이터 시작]
${data}
[데이터 끝]
`.trim()
}

