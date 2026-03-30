import { buildIntegratedTextInput, UNKNOWN_TIME_PROMPT_RULES } from './integrated.js'

export const PROMPT_VERSION = 'v1.0'

export function buildCareerTextReportPrompt(sajuData: unknown): string {
  const data = buildIntegratedTextInput(sajuData)
  return `
넌 커리어 구조를 분석하는 전문가다.

아래 데이터를 기반으로 "직업운"을 분석하라.

직업 적성, 성공 방식, 커리어 방향을 분석해야 한다.

반드시 아래 구조로 작성:

사주팔자 분석
- 관성, 식상, 재성 중심으로 직업 유형 분석
- 조직형 vs 개인형 구분

자미두수 분석
- 관록궁 중심으로 직업 성공 구조 분석
- 권력형인지 기술형인지 판단

점성술 분석
- MC, 10하우스 중심으로 직업 방향 분석
- 사회적 성공 방식 설명

종합 해석
- 잘 맞는 직업 vs 망하는 직업

핵심 조언
- 성공하는 커리어 전략
- 반드시 피해야 할 선택

조건:
- 추상적 직업 추천 금지
- 실제 방향 제시
- 출생 시간이 미입력인 경우 아래 규칙을 반드시 적용:
${UNKNOWN_TIME_PROMPT_RULES}

지금부터 직업운 해석을 작성하라.

[데이터 시작]
${data}
[데이터 끝]
`.trim()
}

