import { buildIntegratedTextInput, UNKNOWN_TIME_PROMPT_RULES } from './integrated.js'

export const PROMPT_VERSION = 'v1.0'

export function buildWealthTextReportPrompt(sajuData: unknown): string {
  const data = buildIntegratedTextInput(sajuData)
  return `
넌 사주팔자, 자미두수, 점성술을 종합하는 전문 분석가다.

아래 데이터를 기반으로 "재물운"만 집중 분석하라.

단순 운세가 아니라 실제 돈의 흐름 구조를 분석해야 한다.

반드시 아래 구조로 작성:

사주팔자 분석
- 재성(편재/정재), 식상, 관성의 구조를 중심으로 돈 버는 방식 설명
- 돈이 들어오는 방식 vs 새는 구조 구분

자미두수 분석
- 재백궁, 명궁, 화록/화권/화기 중심으로 재물 흐름 분석
- 재물 축적형인지 소비형인지 명확히 판단

점성술 분석
- 2하우스, 8하우스, 금성, 목성 중심으로 재물 패턴 분석
- 수입 vs 투자 vs 리스크 구분

종합 해석
- 돈 버는 구조 / 유지 구조 / 깨지는 구조 명확히 정리

핵심 조언
- 돈을 늘리는 전략 (구체적으로)
- 절대 하면 안 되는 재물 행동

조건:
- 감정적 표현 금지
- 반드시 구조 기반 분석
- 실제 돈 흐름 기준으로 설명
- 출생 시간이 미입력인 경우 아래 규칙을 반드시 적용:
${UNKNOWN_TIME_PROMPT_RULES}

지금부터 재물운 해석을 작성하라.

[데이터 시작]
${data}
[데이터 끝]
`.trim()
}

