import { useMemo } from 'react'
import { createChart } from '../../../packages/core/src/ziwei.js'
import MingPanGrid from './MingPanGrid.js'
import SihuaSummary from './SihuaSummary.js'
import DaxianTable from './DaxianTable.js'
import LiunianView from './LiunianView.js'
import CopyButton from '../CopyButton.js'
import { ziweiToText } from '../../utils/text-export.js'
import type { BirthInput } from '../../../packages/core/src/types.js'

interface Props {
  input: BirthInput
}

export default function ZiweiView({ input }: Props) {
  if (input.unknownTime) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <p className="text-base text-amber-800 dark:text-amber-300 font-medium">
          자미두수는 출생 시간이 필수입니다.
        </p>
        <p className="text-base text-amber-600 dark:text-amber-400 mt-1">
          시간에 따라 명반 전체 구조가 바뀝니다. 출생 시간을 입력해주세요.
        </p>
      </div>
    )
  }

  const chart = useMemo(
    () => createChart(input.year, input.month, input.day, input.hour, input.minute, input.gender === 'M'),
    [input],
  )

  return (
    <div className="space-y-6">
      {/* 명반(命盤) 그리드 (기본 정보 + 12궁) */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-base font-medium text-gray-700 dark:text-gray-200">자미두수 명반(紫微斗數 命盤)</h2>
          <CopyButton getText={() => ziweiToText(chart)} label="AI 해석용 복사" />
        </div>
        <MingPanGrid chart={chart} />
      </div>

      {/* 사화 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <SihuaSummary chart={chart} />
      </div>

      {/* 대한 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <DaxianTable chart={chart} />
      </div>

      {/* 유년 */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <LiunianView chart={chart} />
      </div>
    </div>
  )
}
