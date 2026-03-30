import type { PlanetPosition, NatalAngles } from '../../../packages/core/src/types.js'
import { PLANET_SYMBOLS, PLANET_KO, ZODIAC_SYMBOLS, ZODIAC_KO, ROMAN, formatDegree } from '../../../packages/core/src/natal.js'

interface Props {
  planets: PlanetPosition[]
  angles: NatalAngles | null
}

export default function PlanetTable({ planets, angles }: Props) {
  const showHouse = planets.some(p => p.house != null)

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Planets</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-sm text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
              <th className="text-left py-1 pr-2">행성</th>
              <th className="text-left py-1 pr-2">별자리</th>
              <th className="text-right py-1 pr-2">도수</th>
              <th className="text-center py-1 pr-2">Rx</th>
              {showHouse && <th className="text-center py-1">하우스</th>}
            </tr>
          </thead>
          <tbody>
            {planets.map(p => (
              <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800">
                <td className="py-1.5 pr-2">
                  <span className="mr-1">{PLANET_SYMBOLS[p.id]}</span>
                  <span className="text-gray-600 dark:text-gray-300">{PLANET_KO[p.id]}</span>
                </td>
                <td className="py-1.5 pr-2 whitespace-nowrap">
                  <span className="mr-1">{ZODIAC_SYMBOLS[p.sign]}</span>
                  <span className="text-gray-600 dark:text-gray-300 sm:hidden">{ZODIAC_KO[p.sign].slice(0, -2)}</span>
                  <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">{ZODIAC_KO[p.sign]}</span>
                </td>
                <td className="py-1.5 pr-2 text-right font-mono text-gray-700 dark:text-gray-200">
                  {formatDegree(p.longitude)}
                </td>
                <td className="py-1.5 pr-2 text-center text-red-500 dark:text-red-400">
                  {p.isRetrograde ? 'R' : ''}
                </td>
                {showHouse && (
                  <td className="py-1.5 text-center text-gray-600 dark:text-gray-300">
                    {p.house != null ? ROMAN[p.house - 1] : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Angles — 시간 있을 때만 */}
      {angles && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Angles</h3>
          <div className="grid grid-cols-2 gap-2 text-base">
            {([
              ['ASC', angles.asc],
              ['MC', angles.mc],
              ['DESC', angles.desc],
              ['IC', angles.ic],
            ] as const).map(([label, a]) => (
              <div key={label} className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-medium text-gray-700 dark:text-gray-200 w-10">{label}</span>
                <span>{ZODIAC_SYMBOLS[a.sign]}</span>
                <span className="text-gray-600 dark:text-gray-300 sm:hidden">{ZODIAC_KO[a.sign].slice(0, -2)}</span>
                <span className="text-gray-600 dark:text-gray-300 hidden sm:inline">{ZODIAC_KO[a.sign]}</span>
                <span className="font-mono text-gray-700 dark:text-gray-200">{formatDegree(a.longitude)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
