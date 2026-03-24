/**
 * 로컬 엔진 산출값만 직렬화 — 용신/기신/격국 등 미제공 항목은 null (Gemini가 새로 계산하지 않도록 안내)
 */
import { getFourPillars } from '@orrery/core/pillars'
import { STEM_INFO, BRANCH_ELEMENT, ELEMENT_HANJA } from '@orrery/core/constants'
import type { BirthInput, SajuResult, Element } from '@orrery/core/types'
import { sajuToText } from '../utils/text-export.ts'

export type InterpretationBadges = {
  /** 로컬 엔진 미산출 — 항상 null 유지 (프롬프트에 명시용) */
  yongsin: null
  gisin: null
  core_pattern: null
}

export function getInterpretationBadges(_result: SajuResult): InterpretationBadges {
  return { yongsin: null, gisin: null, core_pattern: null }
}

function countElements(result: SajuResult): Record<Element, number> {
  const counts: Record<Element, number> = {
    tree: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  }
  for (const p of result.pillars) {
    const se = STEM_INFO[p.pillar.stem]?.element
    const be = BRANCH_ELEMENT[p.pillar.branch]
    if (se) counts[se] += 1
    if (be) counts[be] += 1
  }
  return counts
}

function formatElementCounts(result: SajuResult): string {
  const c = countElements(result)
  const parts = (Object.entries(c) as [Element, number][]).map(
    ([el, n]) => `${ELEMENT_HANJA[el] ?? el}:${n}`,
  )
  return parts.join(' ')
}

/** 일간(일주 천간) */
export function getDayStem(result: SajuResult): string {
  return result.pillars[1].pillar.stem
}

function todaySolarPillars(): { ymd: string; dayPillar: string; monthPillar: string } {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const [yp, mp, dp] = getFourPillars(y, m, day, 12, 0)
  return {
    ymd: `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    dayPillar: dp,
    monthPillar: mp,
  }
}

function currentYearPillar(): { year: number; yearPillar: string } {
  const y = new Date().getFullYear()
  const [yp] = getFourPillars(y, 6, 15, 12, 0)
  return { year: y, yearPillar: yp }
}

/**
 * Gemini에 넘길 「사실」 블록. 간지·십신·신살 등은 여기 있는 것만 참고하도록 시스템 지시와 함께 씀.
 */
export function buildSajuFactSheet(result: SajuResult, input: BirthInput): string {
  const badges = getInterpretationBadges(result)
  const ilgan = getDayStem(result)
  const stemInfo = STEM_INFO[ilgan]
  const elHan = stemInfo ? ELEMENT_HANJA[stemInfo.element] : '?'
  const today = todaySolarPillars()
  const yeon = currentYearPillar()

  const lines: string[] = [
    '### 로컬 엔진 산출 명식 요약 (이 값만 사실로 취급할 것)',
    `- 성별: ${input.gender === 'M' ? '남' : '여'}, 시간모름: ${input.unknownTime ? '예' : '아니오'}`,
    `- 일간(日干): ${ilgan} (${elHan}, 음양 ${stemInfo?.yinyang === '+' ? '양' : stemInfo?.yinyang === '-' ? '음' : '?'})`,
    `- 천간·지지 오행 개수(주당 1천간+1지지): ${formatElementCounts(result)}`,
    `- badges(용신/기신/격국): 로컬 미산출 → yongsin=${badges.yongsin}, gisin=${badges.gisin}, core_pattern=${badges.core_pattern} (임의 추론·보강 금지)`,
    '',
    '### 오늘·연운 참고 (로컬 절기 간지 계산, 같은 엔진)',
    `- 오늘 양력 ${today.ymd} 월주 ${today.monthPillar} 일주 ${today.dayPillar}`,
    `- ${yeon.year}년 년주(참고용 간지) ${yeon.yearPillar}`,
    '',
    '### 전체 명식 텍스트 (로컬 포맷)',
    sajuToText(result),
  ]

  return lines.join('\n')
}

export const GEMINI_SYSTEM_BASE = [
  '당신은 한국어 사주 해석 도우미입니다.',
  '반드시 위에 제공된 「로컬 엔진 산출」 데이터만을 사실로 다루고, 간지·십신·대운·신살의 글자나 개수를 새로 만들어내거나 바꾸지 마세요.',
  '용신·기신·격국·오행 균형의 「판정」이 데이터에 없으면, 그 사실을 밝히고 일반적인 읽기 방향만 조심스럽게 제안하세요.',
  '의학·투자 확언은 피하고, 해석은 참고용임을 가볍게 상기하세요.',
  '출력은 한국어. 불필요한 마크다운 제목 남발 대신, 짧은 문단(2~4개)으로 읽기 좋게 나누세요.',
].join('\n')

export type InterpretCategoryId =
  | 'jonghab'
  | 'jaemul'
  | 'aejeong'
  | 'jigeop'
  | 'geongang'
  | 'today'
  | 'yeonun'

export function buildCategoryPrompt(category: InterpretCategoryId): string {
  const common = '위 사실 데이터만 근거로, 추측으로 간지를 보태지 마세요.'
  const map: Record<InterpretCategoryId, string> = {
    jonghab: `종합운을 해석해 주세요. 성향·구조의 큰 그림 위주로, ${common}`,
    jaemul: `재물운을 해석해 주세요. 재성·식상·일간 관계 등 데이터에 나타난 십신 구조를 위주로, ${common}`,
    aejeong: `애정·인연 운을 해석해 주세요. 배우자·관성 등 데이터에 드러난 십신과 지지 관계를 위주로, ${common}`,
    jigeop: `직업·사회 활동 운을 해석해 주세요. 관인·식상 등과 12운성 맥락을 위주로, ${common}`,
    geongang: `건강·에너지 관점의 참고 해석을 해 주세요. 의학 진단이 아닌 사주상 기운 균형 이야기로, ${common}`,
    today: `「오늘의 운세」로, 위에 적힌 오늘 일주·월주와 원국 명식의 상호 참고만으로 오늘 흐름을 해석해 주세요. 오늘 간지를 다시 계산해 쓰지 마세요(이미 제시됨). ${common}`,
    yeonun: `「연운」으로, 위에 적힌 해당 연도 년주와 원국 명식의 관계를 중심으로 올해 흐름을 해석해 주세요. 년주 간지를 임의로 바꾸지 마세요. ${common}`,
  }
  return map[category]
}
