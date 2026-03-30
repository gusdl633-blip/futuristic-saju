import { toHangul } from '../../packages/core/src/pillars.js'

const PALACE_MAP: Record<string, string> = {
  命宮: '명궁(命宮)',
  兄弟: '형제궁(兄弟宮)',
  夫妻: '부부궁(夫妻宮)',
  子女: '자녀궁(子女宮)',
  財帛: '재물궁(財帛宮)',
  疾厄: '질병궁(疾厄宮)',
  遷移: '이동궁(遷移宮)',
  交友: '친구궁(交友宮)',
  官祿: '직업궁(官祿宮)',
  田宅: '부동산궁(田宅宮)',
  福德: '복덕궁(福德宮)',
  父母: '부모궁(父母宮)',
}

const STAR_MAP: Record<string, string> = {
  紫微: '자미(紫微)',
  天機: '천기(天機)',
  太陽: '태양(太陽)',
  武曲: '무곡(武曲)',
  天同: '천동(天同)',
  廉貞: '염정(廉貞)',
  天府: '천부(天府)',
  太陰: '태음(太陰)',
  貪狼: '탐랑(貪狼)',
  巨門: '거문(巨門)',
  天相: '천상(天相)',
  天梁: '천량(天梁)',
  七殺: '칠살(七殺)',
  破軍: '파군(破軍)',
  左輔: '좌보(左輔)',
  右弼: '우필(右弼)',
  文昌: '문창(文昌)',
  文曲: '문곡(文曲)',
  天魁: '천괴(天魁)',
  天鉞: '천월(天鉞)',
  火星: '화성(火星)',
  鈴星: '영성(鈴星)',
  地空: '지공(地空)',
  地劫: '지겁(地劫)',
  擎羊: '경양(擎羊)',
  陀羅: '타라(陀羅)',
}

const BRIGHTNESS_MAP: Record<string, string> = {
  廟: '묘(廟)',
  旺: '왕(旺)',
  得: '득(得)',
  利: '리(利)',
  平: '평(平)',
  陷: '함(陷)',
}

const SIHUA_MAP: Record<string, string> = {
  化祿: '화록(化祿)',
  化權: '화권(化權)',
  化科: '화과(化科)',
  化忌: '화기(化忌)',
}

const UI_WORD_MAP: Record<string, string> = {
  空宮: '공궁(空宮)',
  在: '재(在)',
  本命: '본명(本命)',
  流年: '유년(流年)',
  流月運勢: '유월운세(流月運勢)',
  流年四化: '유년사화(流年四化)',
  大限: '대한(大限)',
  陽曆: '양력(陽曆)',
  陰曆: '음력(陰曆)',
  性別: '성별(性別)',
  年柱: '년주(年柱)',
  命宮_LABEL: '명궁(命宮)',
  身宮: '신궁(身宮)',
  五行局: '오행국(五行局)',
  大限起始: '대한기시(大限起始)',
  歲: '세(歲)',
  年: '년(年)',
  月: '월(月)',
  日: '일(日)',
  時: '시(時)',
  分: '분(分)',
}

const WUXINGJU_MAP: Record<string, string> = {
  木三局: '목삼국(木三局)',
  水二局: '수이국(水二局)',
  金四局: '금사국(金四局)',
  土五局: '토오국(土五局)',
  火六局: '화육국(火六局)',
}

export function formatGanzhi(ganZhi: string): string {
  const chars = [...String(ganZhi ?? '')]
  if (chars.length !== 2) return ganZhi
  return `${toHangul(chars[0])}${toHangul(chars[1])}(${chars[0]}${chars[1]})`
}

export function formatGan(stem: string): string {
  return `${toHangul(stem)}(${stem})`
}

export function formatJi(branch: string): string {
  return `${toHangul(branch)}(${branch})`
}

export function formatPalaceName(name: string): string {
  return PALACE_MAP[name] ?? name
}

export function formatStarName(name: string): string {
  return STAR_MAP[name] ?? name
}

export function formatBrightness(b: string): string {
  return BRIGHTNESS_MAP[b] ?? b
}

export function formatSihua(h: string): string {
  return SIHUA_MAP[h] ?? h
}

export function formatWuxingJu(name: string): string {
  return WUXINGJU_MAP[name] ?? name
}

export function formatZiweiLabel(value: string): string {
  const t = String(value ?? '').trim()
  if (!t) return t
  if (STAR_MAP[t]) return STAR_MAP[t]
  if (BRIGHTNESS_MAP[t]) return BRIGHTNESS_MAP[t]
  if (SIHUA_MAP[t]) return SIHUA_MAP[t]
  if (PALACE_MAP[t]) return PALACE_MAP[t]
  if (UI_WORD_MAP[t]) return UI_WORD_MAP[t]
  if (/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(t)) return formatGanzhi(t)
  return t
}

export function formatZiweiText(value: string): string {
  return String(value ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map(formatZiweiLabel)
    .join(' ')
}

