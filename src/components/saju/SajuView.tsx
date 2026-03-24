import { useMemo } from 'react'
import { calculateSaju } from '@orrery/core/saju'
import PillarTable from './PillarTable.tsx'
import RelationList from './RelationList.tsx'
import SinsalList from './SinsalList.tsx'
import JwabeopChart from './JwabeopChart.tsx'
import InjongbeopChart from './InjongbeopChart.tsx'
import DaewoonTable from './DaewoonTable.tsx'
import TransitView from './TransitView.tsx'
import CopyButton from '../CopyButton.tsx'
import { sajuToText } from '../../utils/text-export.ts'
import type { BirthInput } from '@orrery/core/types'

const card =
  'rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/35 p-4'

interface Props {
  input: BirthInput
}

export default function SajuView({ input }: Props) {
  const result = useMemo(() => calculateSaju(input), [input])

  const ganzis = result.pillars.map(p => p.pillar.ganzi)
  const natalPillars = ganzis

  return (
    <div className="space-y-5">
      <section className={card}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="text-base font-semibold tracking-tight text-[var(--text-primary)] font-hanja">
            四柱八字
          </h2>
          <CopyButton getText={() => sajuToText(result)} label="명식 텍스트 복사" />
        </div>
        <PillarTable pillars={result.pillars} unknownTime={input.unknownTime} />
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
