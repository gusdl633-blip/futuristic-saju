import { describe, it, expect } from 'vitest'
import { getFourPillars } from '../src/pillars.ts'
import { adjustKdtToKst } from '../src/kdt.ts'
import { PILLAR_FIXTURES } from './fixtures.ts'

describe('getFourPillars', () => {
  for (const fixture of PILLAR_FIXTURES) {
    const { year, month, day, hour, minute, expected } = fixture
    it(`${year}-${month}-${day} ${hour}:${minute}`, () => {
      // getFourPillars는 KST 기준이므로, KDT 기간 입력은 보정 후 전달
      const kst = adjustKdtToKst(year, month, day, hour, minute)
      const [yp, mp, dp, hp] = getFourPillars(kst.year, kst.month, kst.day, kst.hour, kst.minute)
      expect(yp).toBe(expected.year)
      expect(mp).toBe(expected.month)
      expect(dp).toBe(expected.day)
      expect(hp).toBe(expected.hour)
    })
  }
})

describe('edge cases', () => {
  it('midnight birth (23:30) advances day pillar (통자시 기본)', () => {
    const [, , dp1] = getFourPillars(2000, 1, 1, 23, 29)
    const [, , dp2] = getFourPillars(2000, 1, 1, 23, 30)
    // 23:30 이상이면 일주가 다음날로 넘어감 (통자시 기본)
    expect(dp2).not.toBe(dp1)
  })

  it('same day different hours give different hour pillars', () => {
    const [, , , hp1] = getFourPillars(2000, 1, 1, 3, 0)
    const [, , , hp2] = getFourPillars(2000, 1, 1, 15, 0)
    expect(hp1).not.toBe(hp2)
  })
})

describe('자시법 (JasiMethod)', () => {
  it('통자시: 23:30에 子시 + 일주 다음날', () => {
    const [, , dp, hp] = getFourPillars(2000, 1, 1, 23, 30, 'unified')
    expect(hp[1]).toBe('子')
    // 일주가 23:00(亥시)과 다름 — 다음날로 넘어감
    const [, , dp22] = getFourPillars(2000, 1, 1, 22, 0)
    expect(dp).not.toBe(dp22)
  })

  it('야자시: 23:30에 子시 + 일주 당일 유지', () => {
    const [, , dp, hp] = getFourPillars(2000, 1, 1, 23, 30, 'split')
    expect(hp[1]).toBe('子')
    // 일주가 22시와 같음 (당일 유지)
    const [, , dp22] = getFourPillars(2000, 1, 1, 22, 0)
    expect(dp).toBe(dp22)
  })

  it('야자시: 23:55에도 일주 당일 유지', () => {
    const [, , dp] = getFourPillars(2000, 1, 1, 23, 55, 'split')
    const [, , dp22] = getFourPillars(2000, 1, 1, 22, 0)
    expect(dp).toBe(dp22)
  })

  it('23:00~23:29는 亥시 — 자시법 영향 없음', () => {
    const [, , , hp] = getFourPillars(2000, 1, 1, 23, 0)
    expect(hp[1]).toBe('亥')
    const unified = getFourPillars(2000, 1, 1, 23, 0, 'unified')
    const split = getFourPillars(2000, 1, 1, 23, 0, 'split')
    expect(unified).toEqual(split)
  })

  it('통자시/야자시 비자시 시간은 동일 결과', () => {
    const unified = getFourPillars(2000, 6, 15, 14, 30, 'unified')
    const split = getFourPillars(2000, 6, 15, 14, 30, 'split')
    expect(unified).toEqual(split)
  })

  it('split과 unified의 시주가 동일 (일주만 다름)', () => {
    const [, , dpUnified, hpUnified] = getFourPillars(2000, 1, 1, 23, 30, 'unified')
    const [, , dpSplit, hpSplit] = getFourPillars(2000, 1, 1, 23, 30, 'split')
    expect(hpUnified).toBe(hpSplit) // 시주 동일
    expect(dpUnified).not.toBe(dpSplit) // 일주만 다름
  })

  it('야자시: 2006-02-17 23:30 — 시주 壬子, 일주 丁丑', () => {
    const [, , dp, hp] = getFourPillars(2006, 2, 17, 23, 30, 'split')
    expect(hp).toBe('壬子')
    expect(dp).toBe('丁丑')
  })

  it('00:30(조자시)은 두 모드 모두 같은 결과', () => {
    const unified = getFourPillars(2000, 1, 2, 0, 30, 'unified')
    const split = getFourPillars(2000, 1, 2, 0, 30, 'split')
    expect(unified).toEqual(split)
  })
})
