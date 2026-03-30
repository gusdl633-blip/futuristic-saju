/**
 * AI·원문에 섞인 한자·영문 단독 표기를 한글 우선 "한글(한자|영문)" 형태로 보정한다.
 * 이미 "식신(食神)"처럼 한글(괄호) 패턴은 잠시 치환해 두고 처리 후 복원한다.
 */
import {
  RELATIONS,
  METEORS_12,
  SPIRITS_12,
  SKY,
  EARTH,
  SKY_KR,
  EARTH_KR,
} from '../../packages/core/src/constants.js'
import type { GeminiResult } from './geminiReportValidation.js'

const PROTECT_REGEX = /[\uAC00-\uD7A3]+(?:\([^)]+\))/g

function protectKoreanParenSpans(text: string): { masked: string; spans: string[] } {
  const spans: string[] = []
  const masked = text.replace(PROTECT_REGEX, m => {
    spans.push(m)
    return `◎${spans.length - 1}◎`
  })
  return { masked, spans }
}

function restoreKoreanParenSpans(masked: string, spans: string[]): string {
  return masked.replace(/◎(\d+)◎/g, (_, i) => spans[Number(i)] ?? '')
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 자미·격국 등 추가 한자어 (긴 것부터 병합 정렬) */
const ZIWEI_EXTRA: [string, string][] = [
  ['殺破狼', '살파랑(殺破狼)'],
  ['日月', '일월(日月)'],
  ['巨日', '거일(巨日)'],
  ['紫府', '자부(紫府)'],
  ['昌曲', '창곡(昌曲)'],
  ['祿馬', '록마(祿馬)'],
  ['文曲', '문곡(文曲)'],
  ['文昌', '문창(文昌)'],
  ['擎羊', '경양(擎羊)'],
  ['陀羅', '타라(陀羅)'],
  ['化祿', '화록(化祿)'],
  ['化權', '화권(化權)'],
  ['化科', '화과(化科)'],
  ['化忌', '화기(化忌)'],
  ['福德', '복덕(福德)'],
  ['遷移', '천이(遷移)'],
  ['官祿', '관록(官祿)'],
  ['田宅', '전택(田宅)'],
  ['子女', '자녀(子女)'],
  ['命宮', '명궁(命宮)'],
  ['身宮', '신궁(身宮)'],
  ['太陰', '태음(太陰)'],
  ['太陽', '태양(太陽)'],
  ['天同', '천동(天同)'],
  ['天梁', '천량(天梁)'],
  ['天府', '천부(天府)'],
  ['天相', '천상(天相)'],
  ['天機', '천기(天機)'],
  ['巨門', '거문(巨門)'],
  ['破軍', '파군(破軍)'],
  ['貪狼', '탐랑(貪狼)'],
  ['廉貞', '염정(廉貞)'],
  ['武曲', '무곡(武曲)'],
  ['七殺', '칠살(七殺)'],
  ['祿存', '록존(祿存)'],
]

function buildHanjaReplacementList(): [string, string][] {
  const pairs: [string, string][] = [...ZIWEI_EXTRA]

  for (const r of RELATIONS) {
    pairs.push([r.hanja, `${r.hangul}(${r.hanja})`])
  }
  for (const r of METEORS_12) {
    pairs.push([r.hanja, `${r.hangul}(${r.hanja})`])
  }
  for (const r of SPIRITS_12) {
    pairs.push([r.hanja, `${r.hangul}(${r.hanja})`])
  }

  for (let i = 0; i < SKY.length; i++) {
    const h = SKY[i]!
    const k = SKY_KR[i]!
    pairs.push([h, `${k}(${h})`])
  }
  for (let i = 0; i < EARTH.length; i++) {
    const h = EARTH[i]!
    const k = EARTH_KR[i]!
    pairs.push([h, `${k}(${h})`])
  }

  pairs.push(['木', '목(木)'], ['火', '화(火)'], ['土', '토(土)'], ['金', '금(金)'], ['水', '수(水)'])

  const seen = new Set<string>()
  const sorted = pairs.sort((a, b) => b[0].length - a[0].length)
  const out: [string, string][] = []
  for (const [a, b] of sorted) {
    if (seen.has(a)) continue
    seen.add(a)
    out.push([a, b])
  }
  return out
}

const HANJA_REPLACEMENTS = buildHanjaReplacementList()

function buildEnglishZodiacPairs(): [RegExp, string][] {
  const signs: [string, string][] = [
    ['Sagittarius', '사수자리(Sagittarius)'],
    ['Capricorn', '염소자리(Capricorn)'],
    ['Aquarius', '물병자리(Aquarius)'],
    ['Pisces', '물고기자리(Pisces)'],
    ['Scorpio', '전갈자리(Scorpio)'],
    ['Gemini', '쌍둥이자리(Gemini)'],
    ['Cancer', '게자리(Cancer)'],
    ['Virgo', '처녀자리(Virgo)'],
    ['Libra', '천칭자리(Libra)'],
    ['Taurus', '황소자리(Taurus)'],
    ['Aries', '양자리(Aries)'],
    ['Leo', '사자자리(Leo)'],
  ]
  return signs.map(([en, ko]) => [new RegExp(`\\b${escapeRegExp(en)}\\b`, 'g'), ko])
}

function buildPlanetEnglishPairs(): [RegExp, string][] {
  return [
    [/\bAscendant\b/gi, '상승궁(Ascendant)'],
    [/\bNorth\s*Node\b/gi, '북교점(North Node)'],
    [/\bSouth\s*Node\b/gi, '남교점(South Node)'],
    [/\bMidheaven\b/gi, '중천(MC)'],
    [/\bJupiter\b/gi, '목성(Jupiter)'],
    [/\bSaturn\b/gi, '토성(Saturn)'],
    [/\bMercury\b/gi, '수성(Mercury)'],
    [/\bUranus\b/gi, '천왕성(Uranus)'],
    [/\bNeptune\b/gi, '해왕성(Neptune)'],
    [/\bPluto\b/gi, '명왕성(Pluto)'],
    [/\bVenus\b/gi, '금성(Venus)'],
    [/\bMars\b/gi, '화성(Mars)'],
    [/\bMoon\b/gi, '달(Moon)'],
    [/\bSun\b/gi, '태양(Sun)'],
    [/\bMC\b/g, '중천(MC)'],
  ]
}

export function normalizeTerms(text: string): string {
  if (!text || !text.trim()) return text
  const { masked, spans } = protectKoreanParenSpans(text)
  let s = masked

  for (const [from, to] of HANJA_REPLACEMENTS) {
    if (!s.includes(from)) continue
    s = s.split(from).join(to)
  }

  for (const [re, to] of buildEnglishZodiacPairs()) {
    s = s.replace(re, to)
  }
  for (const [re, to] of buildPlanetEnglishPairs()) {
    s = s.replace(re, to)
  }

  return restoreKoreanParenSpans(s, spans)
}

export function normalizeGeminiResult(r: GeminiResult): GeminiResult {
  return {
    summary_title: normalizeTerms(r.summary_title),
    summary_body: normalizeTerms(r.summary_body),
    saju_title: normalizeTerms(r.saju_title),
    saju_body: normalizeTerms(r.saju_body),
    ziwei_title: normalizeTerms(r.ziwei_title),
    ziwei_body: normalizeTerms(r.ziwei_body),
    astrology_title: normalizeTerms(r.astrology_title),
    astrology_body: normalizeTerms(r.astrology_body),
    flow_title: normalizeTerms(r.flow_title),
    flow_body: normalizeTerms(r.flow_body),
    advice_title: normalizeTerms(r.advice_title),
    advice_body: normalizeTerms(r.advice_body),
  }
}
