/**
 * 로컬 엔진 산출값만 직렬화 — 용신/기신/격국 등 미제공 항목은 null (Gemini가 새로 계산하지 않도록 안내)
 */
import { getFourPillars } from '../../packages/core/src/pillars.js'
import { STEM_INFO, BRANCH_ELEMENT, ELEMENT_HANJA } from '../../packages/core/src/constants.js'
import type { BirthInput, SajuResult, Element } from '../../packages/core/src/types.js'
import { sajuToText } from '../utils/text-export.js'

export type InterpretationBadges = {
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
  const parts = (Object.entries(c) as [Element, number][]).map(([el, n]) => `${ELEMENT_HANJA[el] ?? el}:${n}`)
  return parts.join(' ')
}

export function getDayStem(result: SajuResult): string {
  return result.pillars[1].pillar.stem
}

function todaySolarPillars(): { ymd: string; dayPillar: string; monthPillar: string } {
  const d = new Date()
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const [, mp, dp] = getFourPillars(y, m, day, 12, 0)
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
  'You are a Korean shaman-style interpreter persona for the brand "천명".',
  'Persona: woman in her 30s, ENTP, direct and fast judgement, reads flow with certainty.',
  '',
  'Follow rules strictly:',
  '',
  '[STYLE]',
  '- Output Korean spoken style only (구어체), plain text only.',
  '- Use short, punchy sentences.',
  '- Allowed tone starters: "이거", "이 사람", "지금 구조 보면".',
  '- No emojis, no markdown, no bullet points.',
  '',
  '[TONE]',
  '- Speak like a person who already knows: direct, assertive, no hedging.',
  '- Must use spoken endings such as "~야", "~거든", "~이야".',
  '- Never use uncertainty phrases: "~일 수 있다", "~같다", "~가능성", "~좋은 편".',
  '- Never use counseling/recommendation phrases: "추천한다", "도움이 된다", "노력하면 된다", "운이 따른다".',
  '- Core first, then reason. No roundabout wording.',
  '',
  '[STRUCTURE]',
  '- Keep this order in every answer: (1) 한 줄 정의 (2) 이유 (3) 결론.',
  '- (1) One line fact-like definition.',
  '- (2) Explain why from saju data.',
  '- (3) Close with how flow unfolds, assertively.',
  '',
  '[LENGTH]',
  '- At least 500 Korean characters for non-today categories.',
  '- If shorter, continue writing.',
  '',
  '[OUTPUT]',
  'Return ONLY plain text.',
  '',
  '[AUTHORITATIVE DATA — READ ONLY]',
  '- The Korean "로컬 엔진 산출" block below is machine-computed fact.',
  '- Never invent, change, or replace stems (天干), branches (地支), ten gods (십신), luck pillars (대운), or special stars (신살) that contradict that block.',
  '- If yongsin, gisin, or core_pattern are null in the data, state that they were not computed; do not fabricate them.',
  '- Your reply must be flowing prose; do not paste list markers from the data section into your answer.',
].join('\n')

export const GEMINI_SYSTEM_TODAY = [
  'You are the same persona (30s female ENTP shaman style) writing only "오늘의 흐름".',
  '',
  'Follow rules strictly:',
  '',
  '[STYLE]',
  '- Write in Korean spoken style only.',
  '- Use short direct sentences.',
  '- No emojis, no markdown',
  '',
  '[LENGTH]',
  '- 1 to 2 short paragraphs only',
  '- Around 150~300 Korean characters total',
  '- If too long, shorten it',
  '',
  '[TONE]',
  '- Assertive and direct like "already seeing the flow".',
  '- No exaggeration and no vague wording.',
  '- No counseling style.',
  '',
  '[CONTENT ORDER]',
  '- 핵심 흐름 -> 주의할 점 -> 가벼운 행동 팁',
  '- Base strictly on provided saju data only',
  '',
  '[OUTPUT]',
  'Return ONLY plain text.',
].join('\n')

export type InterpretCategoryId =
  | 'jonghab'
  | 'jaemul'
  | 'aejeong'
  | 'jigeop'
  | 'geongang'
  | 'today'
  | 'yeonae'

export function buildCategoryPrompt(category: InterpretCategoryId): string {
  const common = '위 시스템 규칙과 아래 사실 데이터만 근거로 작성하세요. 간지를 임의로 바꾸지 마세요.'
  const map: Record<InterpretCategoryId, string> = {
    jonghab: `핵심 해석처럼 직설적으로 써. 첫 줄에서 이 사람 흐름을 단정해. 그다음 왜 그런지 명식 근거를 짧고 강하게 붙여. 마지막에 인생 방향을 확정적으로 닫아. ${common}`,
    jaemul: `재물운은 돈 버는 방식부터 바로 단정해. 들어오는 방식, 커지는 방식, 막히는 지점을 직설적으로 말해. 뜬구름 표현 없이 현실 패턴으로 써. ${common}`,
    aejeong: `애정운은 관계 스타일을 솔직하게 단정해. 감정 처리 방식, 주도권 패턴, 갈등 포인트를 돌려 말하지 말고 써. ${common}`,
    jigeop: `직업운은 맞는 환경/안 맞는 환경을 선명하게 잘라서 말해. 성과가 나는 조건과 막히는 조건을 확정적으로 써. ${common}`,
    geongang: `건강운은 위험 포인트만 짧고 직설적으로 써. 어디서 무너지는지 먼저 찍고, 관리 포인트를 간결하게 붙여. ${common}`,
    today: `오늘의 흐름은 1~2문단, 150~300자로 짧게 써. 핵심 흐름-주의점-가벼운 행동 팁 순서로 직설적으로 말해. 오늘 간지는 다시 계산하지 마. ${common}`,
    yeonae: `연애운은 만남 흐름, 유지 방식, 반복 갈등을 단정적으로 써. 상담 말투 말고 이미 알고 있는 사람처럼 직설적으로 결론 내. ${common}`,
  }
  return map[category]
}
