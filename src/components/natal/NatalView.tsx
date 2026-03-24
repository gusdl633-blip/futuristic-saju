import { useEffect, useState } from 'react'
import { calculateNatal, HOUSE_SYSTEMS } from '@orrery/core/natal'
import PlanetTable from './PlanetTable.tsx'
import HouseTable from './HouseTable.tsx'
import AspectGrid from './AspectGrid.tsx'
import NatalWheel from './wheel/NatalWheel.tsx'
import CopyButton from '../CopyButton.tsx'
import { natalToText } from '../../utils/text-export.ts'
import type { BirthInput, NatalChart } from '@orrery/core/types'

interface Props {
  input: BirthInput
}

export default function NatalView({ input }: Props) {
  const [chart, setChart] = useState<NatalChart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [houseSystem, setHouseSystem] = useState('P')

  const unknownTime = !!input.unknownTime

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setChart(null)

    calculateNatal(input, houseSystem)
      .then(result => {
        if (!cancelled) {
          setChart(result)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err))
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [input, houseSystem])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-base text-gray-500 dark:text-gray-400">
          <svg className="w-5 h-5 animate-spin text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Swiss Ephemeris 로딩 중...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-base text-red-800 dark:text-red-300 font-medium">계산 오류</p>
        <p className="text-base text-red-600 dark:text-red-400 mt-1">{error}</p>
      </div>
    )
  }

  if (!chart) return null

  const houseSystemName = HOUSE_SYSTEMS.find(([k]) => k === houseSystem)?.[1] ?? 'Placidus'

  return (
    <div className="space-y-6">
      {/* 시간 모름 안내 */}
      {unknownTime && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <p className="text-base text-amber-800 dark:text-amber-300 font-medium">
            출생 시간 없이 정오(12:00) 기준으로 계산한 결과입니다.
          </p>
          <p className="text-base text-amber-600 dark:text-amber-400 mt-1">
            달은 최대 ±6° 오차가 있을 수 있으며, ASC · 하우스 배치는 표시하지 않습니다.
          </p>
        </div>
      )}

      {/* Wheel Chart — 시간 있을 때만 */}
      {!unknownTime && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <NatalWheel chart={chart} />
        </div>
      )}

      {/* Planets + Angles */}
      <section className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 sm:gap-3">
            <h2 className="text-base font-medium text-gray-700 dark:text-gray-200">Natal Chart</h2>
            {!unknownTime && (
              <label className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500 sm:ml-2">
                House
                <select
                  value={houseSystem}
                  onChange={e => setHouseSystem(e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 rounded px-2 py-1 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-500"
                >
                {HOUSE_SYSTEMS.map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
                </select>
              </label>
            )}
          </div>
          <CopyButton getText={() => natalToText(chart, houseSystemName)} label="AI 해석용 복사" />
        </div>
        <PlanetTable planets={chart.planets} angles={chart.angles} />
      </section>

      {/* Houses — 시간 있을 때만 */}
      {!unknownTime && chart.houses.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Houses</h3>
          <HouseTable houses={chart.houses} />
        </div>
      )}

      {/* Aspects */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <AspectGrid aspects={chart.aspects} />
      </div>
    </div>
  )
}
