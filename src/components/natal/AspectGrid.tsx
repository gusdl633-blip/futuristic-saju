import type { NatalAspect } from '../../../packages/core/src/types.js'
import { PLANET_SYMBOLS, PLANET_KO, ASPECT_SYMBOLS } from '../../../packages/core/src/natal.js'

interface Props {
  aspects: NatalAspect[]
}

export default function AspectGrid({ aspects }: Props) {
  const top = aspects.slice(0, 15)

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Major Aspects</h3>
      <div className="space-y-0.5">
        {top.map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-base py-0.5">
            <span className="w-5 text-center">{PLANET_SYMBOLS[a.planet1]}</span>
            <span className="text-gray-500 dark:text-gray-400 w-12">{PLANET_KO[a.planet1]}</span>
            <span className="w-4 text-center">{ASPECT_SYMBOLS[a.type]}</span>
            <span className="w-5 text-center">{PLANET_SYMBOLS[a.planet2]}</span>
            <span className="text-gray-500 dark:text-gray-400 w-12">{PLANET_KO[a.planet2]}</span>
            <span className="ml-auto font-mono text-gray-400 dark:text-gray-500 text-sm">
              orb {a.orb.toFixed(1)}°
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
