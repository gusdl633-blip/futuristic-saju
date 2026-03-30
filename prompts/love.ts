import { buildIntegratedTextInput, UNKNOWN_TIME_PROMPT_RULES } from './integrated.js'

export const PROMPT_VERSION = 'v1.0'

export function buildLoveTextReportPrompt(sajuData: unknown): string {
  const data = buildIntegratedTextInput(sajuData)
  return `
넌 사주팔자, 자미두수, 점성술을 종합하는 관계 분석 전문가다.

아래 데이터를 기반으로 "애정운"을 분석하라.

단순 연애운이 아니라 관계 패턴을 분석해야 한다.

반드시 아래 구조로 작성:

사주팔자 분석
- 식상, 관성, 일지 중심으로 연애 스타일 분석
- 끌리는 유형 vs 충돌 구조 설명

자미두수 분석
- 부부궁, 명궁 중심으로 감정 패턴 분석
- 관계에서 주도형인지 의존형인지 판단

점성술 분석
- 금성, 화성, 달 중심으로 감정 흐름 분석
- 사랑 방식 vs 갈등 방식 구분

종합 해석
- 관계 반복 패턴 (왜 깨지는지 / 왜 유지되는지)

핵심 조언
- 관계 유지 전략
- 반드시 피해야 할 연애 패턴

조건:
- 이상적인 사랑 이야기 금지
- 실제 관계 문제 중심 분석
- 출생 시간이 미입력인 경우 아래 규칙을 반드시 적용:
${UNKNOWN_TIME_PROMPT_RULES}

지금부터 애정운 해석을 작성하라.

[데이터 시작]
${data}
[데이터 끝]
`.trim()
}

