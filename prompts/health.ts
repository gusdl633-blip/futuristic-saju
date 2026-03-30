import { buildIntegratedTextInput, UNKNOWN_TIME_PROMPT_RULES } from './integrated.js'

export const PROMPT_VERSION = 'v1.0'

export function buildHealthTextReportPrompt(sajuData: unknown): string {
  const data = buildIntegratedTextInput(sajuData)
  return `
넌 신체 에너지 구조를 해석하는 전문가다.

아래 데이터를 기반으로 "건강운"을 분석하라.

단순 건강운이 아니라 취약 구조를 분석해야 한다.

반드시 아래 구조로 작성:

사주팔자 분석
- 오행 불균형 중심으로 약한 장기 분석
- 과다/부족 요소 명확히 설명

자미두수 분석
- 질액궁 중심으로 건강 리스크 분석
- 반복되는 건강 패턴 설명

점성술 분석
- 6하우스, 12하우스 중심으로 건강 흐름 분석
- 스트레스/질병 패턴 구분

종합 해석
- 가장 취약한 건강 영역
- 장기적 리스크

핵심 조언
- 반드시 해야 할 관리 습관
- 피해야 할 생활 패턴

조건:
- 무조건 구체적으로
- 생활 단위 조언 포함
- 출생 시간이 미입력인 경우 아래 규칙을 반드시 적용:
${UNKNOWN_TIME_PROMPT_RULES}

지금부터 건강운 해석을 작성하라.

[데이터 시작]
${data}
[데이터 끝]
`.trim()
}

