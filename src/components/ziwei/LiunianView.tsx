import { useState, useMemo } from 'react'
import { calculateLiunian } from '../../../packages/core/src/ziwei.js'
import type { ZiweiChart } from '../../../packages/core/src/types.js'
import { MAIN_STAR_NAMES } from '../../../packages/core/src/constants.js'
import { formatPalaceName, formatSihua, formatStarName, formatZiweiLabel } from '../../utils/ziweiDisplay.js'

interface Props {
  chart: ZiweiChart
}

const LUNAR_MONTH_NAMES = [
  '正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '臘月',
]
const LUNAR_MONTH_KO = [
  '정월(正月)', '이월(二月)', '삼월(三月)', '사월(四月)', '오월(五月)', '유월(六月)',
  '칠월(七月)', '팔월(八月)', '구월(九月)', '시월(十月)', '동월(冬月)', '납월(臘月)',
]

function getMainStarsAtZhi(chart: ZiweiChart, zhi: string): string[] {
  for (const palace of Object.values(chart.palaces)) {
    if (palace.zhi === zhi) {
      return palace.stars
        .filter(s => MAIN_STAR_NAMES.has(s.name))
        .map(s => s.name)
    }
  }
  return []
}

export default function LiunianView({ chart }: Props) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const liunian = useMemo(() => calculateLiunian(chart, year), [chart, year])

  const colorMap: Record<string, string> = {
    '化祿': 'text-green-600 dark:text-green-400',
    '化權': 'text-yellow-600 dark:text-yellow-400',
    '化科': 'text-blue-600 dark:text-blue-400',
    '化忌': 'text-red-600 dark:text-red-400',
  }

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h3 className="text-base font-medium text-gray-700 dark:text-gray-200">유년(流年)</h3>
        <input
          type="number"
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          min={chart.solarYear}
          max={chart.solarYear + 100}
          className="w-20 text-base border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 text-gray-700 dark:text-gray-200"
        />
        <span className="text-sm text-gray-400 dark:text-gray-500">{formatZiweiLabel(`${liunian.gan}${liunian.zhi}`)}년(年)</span>
      </div>

      {/* 대한 정보 */}
      <div className="text-base text-gray-600 dark:text-gray-300 mb-2">
        <span className="font-medium text-gray-700 dark:text-gray-200">대한(大限)</span>
        <span className="text-gray-400 dark:text-gray-500 mx-1">:</span>
        {liunian.daxianAgeStart}-{liunian.daxianAgeEnd}세(歲) {formatPalaceName(liunian.daxianPalaceName)}
      </div>

      {/* 유년 명궁 */}
      <div className="text-base text-gray-600 dark:text-gray-300 mb-3">
        <span className="font-medium text-gray-700 dark:text-gray-200">유년명궁(流年命宮)</span>
        <span className="text-gray-400 dark:text-gray-500 mx-1">:</span>
        <span>{formatZiweiLabel(liunian.mingGongZhi)}궁(宮)</span> → 본명(本命) {formatPalaceName(liunian.natalPalaceAtMing)}
        <span className="text-gray-400 dark:text-gray-500 ml-1">
          ({getMainStarsAtZhi(chart, liunian.mingGongZhi).map(formatStarName).join(', ') || '공궁(空宮)'})
        </span>
      </div>

      {/* 유년 사화 */}
      <div className="mb-3">
        <div className="text-base font-medium text-gray-700 dark:text-gray-200 mb-1">유년사화(流年四化)</div>
        <div className="space-y-0.5">
          {['化祿', '化權', '化科', '化忌'].map(huaType => {
            let starName = ''
            for (const [s, h] of Object.entries(liunian.siHua)) {
              if (h === huaType) { starName = s; break }
            }
            const palaceName = liunian.siHuaPalaces[huaType] || '?'
            if (!starName) return null
            return (
              <div key={huaType} className="text-base text-gray-600 dark:text-gray-300">
                <span className={colorMap[huaType]}>{formatSihua(huaType)}</span>
                <span className="text-gray-400 dark:text-gray-500 mx-1">:</span>
                <span>{formatStarName(starName)}</span>
                <span className="text-gray-400 dark:text-gray-500 mx-1">→</span>
                <span>{formatPalaceName(palaceName)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 유월 */}
      <div>
        <div className="text-base font-medium text-gray-700 dark:text-gray-200 mb-1">유월운세(流月運勢)</div>
        <div className="space-y-0.5">
          {liunian.liuyue.map(ly => {
            const stars = getMainStarsAtZhi(chart, ly.mingGongZhi)
            const hasMain = stars.length > 0
            return (
              <div
                key={ly.month}
                className={`text-base ${hasMain ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}
              >
                <span className="w-24 inline-block">{LUNAR_MONTH_KO[ly.month - 1] ?? LUNAR_MONTH_NAMES[ly.month - 1]}</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 mx-1">({formatZiweiLabel(ly.mingGongZhi)})</span>
                <span className="mr-1">{formatPalaceName(ly.natalPalaceName)}</span>
                <span className="text-gray-400 dark:text-gray-500 text-sm">
                  {hasMain ? `- ${stars.map(formatStarName).join(', ')}` : '- 공궁(空宮)'}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
