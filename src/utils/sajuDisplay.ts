import { toHangul } from '../../packages/core/src/pillars.js'
import {
  STEM_INFO,
  BRANCH_ELEMENT,
  RELATIONS,
  METEORS_12,
  SPIRITS_12,
} from '../../packages/core/src/constants.js'
import type { Element } from '../../packages/core/src/types.js'

/** 오행 한자 (표기 보조) */
export const ELEMENT_HANJA: Record<Element, string> = {
  tree: '木',
  fire: '火',
  earth: '土',
  metal: '金',
  water: '水',
}

/** 오행 한글 (목·화·토·금·수) */
export function elementKr(el: Element | undefined): string {
  if (!el) return ''
  const m: Record<Element, string> = {
    tree: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  }
  return m[el]
}

/** 오행 일상어 (나무/불/흙/금/물) */
export function elementPlainKr(el: Element | undefined): string {
  if (!el) return ''
  const m: Record<Element, string> = {
    tree: '나무',
    fire: '불',
    earth: '흙',
    metal: '금',
    water: '물',
  }
  return m[el]
}

/** 천간: 메인 한글 라벨 — 예: 임수 (물) */
export function formatStemKoreanLine(stem: string): string {
  const info = STEM_INFO[stem]
  if (!info) return stem
  const kr = toHangul(stem)
  const elSuffix = elementKr(info.element)
  const elPlain = elementPlainKr(info.element)
  return `${kr}${elSuffix} (${elPlain})`
}

/** 지지: 메인 한글 라벨 — 예: 오화 (불) */
export function formatBranchKoreanLine(branch: string): string {
  const el = BRANCH_ELEMENT[branch]
  if (!el) return toHangul(branch)
  const kr = toHangul(branch)
  return `${kr}${elementKr(el)} (${elementPlainKr(el)})`
}

/** 명식 카드용 천간: 메인 한글(천간 한자), 서브 오행 한글(오행 한자) */
export function formatStemMainSub(stem: string): { main: string; sub: string } {
  const info = STEM_INFO[stem]
  if (!info) return { main: stem, sub: '' }
  const kr = toHangul(stem)
  return {
    main: `${kr}(${stem})`,
    sub: `${elementKr(info.element)}(${ELEMENT_HANJA[info.element]})`,
  }
}

/** 명식 카드용 지지 */
export function formatBranchMainSub(branch: string): { main: string; sub: string } {
  const el = BRANCH_ELEMENT[branch]
  if (!el) return { main: `${toHangul(branch)}(${branch})`, sub: '' }
  const kr = toHangul(branch)
  return {
    main: `${kr}(${branch})`,
    sub: `${elementKr(el)}(${ELEMENT_HANJA[el]})`,
  }
}

/** 십신 한자 → 한글(한자) (本元 → 일간(本元)) */
export function sipsinToKorean(hanja: string): string {
  if (hanja === '本元') return '일간(本元)'
  const r = RELATIONS.find(x => x.hanja === hanja)
  return r ? `${r.hangul}(${r.hanja})` : hanja
}

/** 12운성 한자 → 한글(한자) */
export function unseongToKorean(hanja: string): string {
  const m = METEORS_12.find(x => x.hanja === hanja)
  return m ? `${m.hangul}(${m.hanja})` : hanja
}

/** 12신살 한자 → 한글(한자) */
export function sinsalToKorean(hanja: string): string {
  const s = SPIRITS_12.find(x => x.hanja === hanja)
  return s ? `${s.hangul}(${s.hanja})` : hanja
}

const RELATION_TYPE_KO_HANJA: Record<string, string> = {
  合: '합(合)',
  半合: '반합(半合)',
  三合: '삼합(三合)',
  方合: '방합(方合)',
  沖: '충(沖)',
  刑: '형(刑)',
  害: '해(害)',
  破: '파(破)',
  怨嗔: '원진(怨嗔)',
  鬼門: '귀문(鬼門)',
}

const PILLAR_LABEL_KO_HANJA: Record<string, string> = {
  時柱: '시주(時柱)',
  日柱: '일주(日柱)',
  月柱: '월주(月柱)',
  年柱: '년주(年柱)',
}

const SPECIAL_SAL_KO_HANJA: Record<string, string> = {
  천을귀인: '천을귀인(天乙貴人)',
  천덕귀인: '천덕귀인(天德貴人)',
  월덕귀인: '월덕귀인(月德貴人)',
  문창귀인: '문창귀인(文昌貴人)',
  금여록: '금여록(金輿祿)',
  양인살: '양인살(羊刃煞)',
  도화살: '도화살(桃花煞)',
  백호살: '백호살(白虎煞)',
  괴강살: '괴강살(魁罡煞)',
  홍염살: '홍염살(紅艶煞)',
}

export function formatGan(stem: string): string {
  return `${toHangul(stem)}(${stem})`
}

export function formatJi(branch: string): string {
  return `${toHangul(branch)}(${branch})`
}

export function formatGanzi(ganzi: string): string {
  const chars = [...String(ganzi ?? '')]
  if (chars.length < 2) return ganzi
  return `${toHangul(chars[0])}${toHangul(chars[1])}(${chars[0]}${chars[1]})`
}

export function formatElementKoreanHanja(el: Element | undefined): string {
  if (!el) return ''
  return `${elementKr(el)}(${ELEMENT_HANJA[el]})`
}

export function relationTypeToKorean(type: string): string {
  return RELATION_TYPE_KO_HANJA[type] ?? type
}

export function pillarLabelToKorean(label: string): string {
  return PILLAR_LABEL_KO_HANJA[label] ?? label
}

export function specialSinsalToKorean(label: string): string {
  return SPECIAL_SAL_KO_HANJA[label] ?? label
}
