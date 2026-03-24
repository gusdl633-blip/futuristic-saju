function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/60 dark:bg-gray-800/60 rounded border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
      {children}
    </div>
  )
}

export default function Guide() {
  return (
    <div className="mt-8">
      <section className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-5 bg-gray-50/50 dark:bg-gray-900/50">
        <h3 className="text-base font-medium text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          사용 방법
        </h3>
        <ol className="text-base text-gray-500 dark:text-gray-400 space-y-2 list-none pl-0">
          <li className="flex gap-2">
            <span className="shrink-0 text-gray-400 dark:text-gray-500">1.</span>
            <span>위 폼에 생년월일, 태어난 시간, 성별을 입력합니다.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-gray-400 dark:text-gray-500">2.</span>
            <span><strong className="text-gray-600 dark:text-gray-300">계산</strong> 버튼을 누르면 사주팔자, 자미두수, 출생차트 결과가 나타납니다.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-gray-400 dark:text-gray-500">3.</span>
            <span>
              탭 우측의 <strong className="text-gray-600 dark:text-gray-300">AI 해석용 전부 복사</strong>를 누르면 사주팔자 + 자미두수 + 출생차트 데이터가 한 번에 복사됩니다.
              각 탭의 <strong className="text-gray-600 dark:text-gray-300">AI 해석용 복사</strong> 버튼으로 개별 복사도 가능합니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-gray-400 dark:text-gray-500">4.</span>
            <span>Claude, ChatGPT, Gemini 등 AI 채팅에 붙여넣고 해석을 요청하세요.</span>
          </li>
        </ol>

        <hr className="my-4 border-gray-200 dark:border-gray-700" />

        <h4 className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-3">AI에게 이렇게 물어보세요</h4>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">성격 분석</p>
            <ExampleBox>
              다음은 내 사주팔자, 자미두수 명반, 출생차트야. 성격적 강점과 약점을 분석해줘.<br />
              <span className="text-gray-400 dark:text-gray-500">[복사한 데이터 붙여넣기]</span>
            </ExampleBox>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">고민 상담</p>
            <ExampleBox>
              아래 명반 데이터를 기반으로, 내가 살면서 힘들 수 있는 부분 Top 3를 뽑고 조언해줘.<br />
              <span className="text-gray-400 dark:text-gray-500">[복사한 데이터 붙여넣기]</span>
            </ExampleBox>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-1">궁합 보기</p>
            <ExampleBox>
              두 사람의 명반 데이터를 보내줄게. 성격적으로 잘 맞는 부분과 부딪힐 수 있는 부분을 분석해줘.<br /><br />
              <span className="text-gray-400 dark:text-gray-500">[A의 데이터 붙여넣기]</span><br /><br />
              <span className="text-gray-400 dark:text-gray-500">[B의 데이터 붙여넣기]</span>
            </ExampleBox>
          </div>
        </div>
      </section>
    </div>
  )
}
