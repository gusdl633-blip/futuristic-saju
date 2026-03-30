import { useMemo, useState } from 'react'
import { calculateSaju } from '../../../packages/core/src/saju.js'
import PillarTable from './PillarTable.js'
import RelationList from './RelationList.js'
import SinsalList from './SinsalList.js'
import JwabeopChart from './JwabeopChart.js'
import InjongbeopChart from './InjongbeopChart.js'
import DaewoonTable from './DaewoonTable.js'
import TransitView from './TransitView.js'
import CopyButton from '../CopyButton.js'
import { sajuToText } from '../../utils/text-export.js'
import type { BirthInput } from '../../../packages/core/src/types.js'

const card =
  'rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[var(--card-bg)] backdrop-blur-md p-4 shadow-[0_0_24px_rgba(59,130,246,0.06)] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.03)]'

interface Props {
  input: BirthInput
}

export default function SajuView({ input }: Props) {
  const result = useMemo(() => calculateSaju(input), [input])
  const [preferKorean, setPreferKorean] = useState(true)

  const ganzis = result.pillars.map(p => p.pillar.ganzi)
  const natalPillars = ganzis

  return (
    <div className="space-y-5">
      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)]">
            명식 표 (상세)
          </h2>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <label className="flex items-center gap-2 text-xs sm:text-sm text-[var(--text-secondary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={preferKorean}
                onChange={e => setPreferKorean(e.target.checked)}
                className="rounded border-[var(--border-glow)]"
              />
              한글 표시
            </label>
            <CopyButton getText={() => sajuToText(result)} label="명식 텍스트 복사" />
          </div>
        </div>
        <PillarTable pillars={result.pillars} unknownTime={input.unknownTime} preferKorean={preferKorean} />
      </section>

      <div className={card}>
        <RelationList relations={result.relations} pillars={ganzis} />
      </div>

      <div className={card}>
        <SinsalList sals={result.specialSals} />
      </div>

      <div className={`${card} space-y-4`}>
        <JwabeopChart jwabeop={result.jwabeop} pillars={result.pillars} unknownTime={input.unknownTime} />
        <InjongbeopChart injongbeop={result.injongbeop} pillars={result.pillars} />
      </div>

      <div className={card}>
        <DaewoonTable daewoon={result.daewoon} unknownTime={input.unknownTime} />
      </div>

      <div className={card}>
        <TransitView natalPillars={natalPillars} />
      </div>
    </div>
  )
}
