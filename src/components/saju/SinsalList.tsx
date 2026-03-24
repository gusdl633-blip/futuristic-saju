import type { SpecialSals } from '@orrery/core/types'
import { PILLAR_NAMES } from '@orrery/core/constants'

interface Props {
  sals: SpecialSals
}

interface SalEntry {
  label: string
  type: 'good' | 'bad'
}

export default function SinsalList({ sals }: Props) {
  const items: SalEntry[] = []

  // 길신 (吉神)
  if (sals.cheonul.length > 0) {
    const pos = sals.cheonul.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `천을귀인(${pos})`, type: 'good' })
  }
  if (sals.cheonduk.length > 0) {
    const pos = sals.cheonduk.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `천덕귀인(${pos})`, type: 'good' })
  }
  if (sals.wolduk.length > 0) {
    const pos = sals.wolduk.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `월덕귀인(${pos})`, type: 'good' })
  }
  if (sals.munchang.length > 0) {
    const pos = sals.munchang.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `문창귀인(${pos})`, type: 'good' })
  }
  if (sals.geumyeo.length > 0) {
    const pos = sals.geumyeo.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `금여록(${pos})`, type: 'good' })
  }

  // 흉신 (凶神)
  if (sals.yangin.length > 0) {
    const pos = sals.yangin.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `양인살(${pos})`, type: 'bad' })
  }
  if (sals.dohwa.length > 0) {
    const pos = sals.dohwa.map(i => PILLAR_NAMES[i]).join(',')
    items.push({ label: `도화살(${pos})`, type: 'bad' })
  }
  if (sals.baekho) items.push({ label: '백호살', type: 'bad' })
  if (sals.goegang) items.push({ label: '괴강살', type: 'bad' })
  if (sals.hongyeom) items.push({ label: '홍염살', type: 'bad' })

  if (items.length === 0) return null

  return (
    <section>
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-200 mb-2">神殺</h3>
      <div className="flex flex-wrap gap-2">
        {items.map(item => (
          <span
            key={item.label}
            className={`text-base px-2 py-0.5 rounded ${
              item.type === 'good'
                ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
                : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400'
            }`}
          >
            {item.label}
          </span>
        ))}
      </div>
    </section>
  )
}
