function ExampleBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/40 px-3 py-2.5 text-sm text-[var(--text-secondary)] leading-relaxed">
      {children}
    </div>
  )
}

export default function Guide() {
  return (
    <div className="mt-10">
      <section className="rounded-2xl border border-[var(--border-glow)] bg-[var(--glass-bg)] backdrop-blur-sm p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-[var(--neon-cyan)] mb-4 flex items-center gap-2 tracking-wide">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.94 6.94a.75.75 0 11-1.061-1.061 3 3 0 112.871 5.026v.345a.75.75 0 01-1.5 0v-.5c0-.72.57-1.172 1.081-1.287A1.5 1.5 0 108.94 6.94zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          이용 안내
        </h3>
        <ol className="text-sm text-[var(--text-secondary)] space-y-2.5 list-none pl-0">
          <li className="flex gap-2">
            <span className="shrink-0 text-[var(--neon-primary)] font-mono text-xs pt-0.5">01</span>
            <span>생년월일·시간·성별·출생지를 입력한 뒤 「명식 계산」을 누릅니다.</span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-[var(--neon-primary)] font-mono text-xs pt-0.5">02</span>
            <span>
              <strong className="text-[var(--text-primary)]">명식 요약</strong>에서 사주 표·대운·운세를 확인합니다. 「명식 텍스트 복사」로 AI에 넘길 수 있습니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-[var(--neon-primary)] font-mono text-xs pt-0.5">03</span>
            <span>
              <strong className="text-[var(--text-primary)]">카테고리 해석</strong>·<strong className="text-[var(--text-primary)]">상담</strong>은 API 연동 시 채워질 영역입니다.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-[var(--neon-primary)] font-mono text-xs pt-0.5">04</span>
            <span>자미두수·출생차트는 상단 도구 탭에서 그대로 이용할 수 있습니다.</span>
          </li>
        </ol>

        <hr className="my-5 border-[var(--border-subtle)]" />

        <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">AI에 물어볼 때 예시</h4>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-[var(--neon-cyan)] mb-1.5">성향</p>
            <ExampleBox>
              아래는 내 사주 명식 데이터야. 십신과 오행 관점에서 성향을 정리해줘.<br />
              <span className="text-[var(--text-muted)]">[복사한 텍스트 붙여넣기]</span>
            </ExampleBox>
          </div>
          <div>
            <p className="text-xs text-[var(--neon-cyan)] mb-1.5">시기</p>
            <ExampleBox>
              대운 표를 참고해서, 앞으로 10년 흐름을 단계별로 설명해줘.<br />
              <span className="text-[var(--text-muted)]">[복사한 텍스트 붙여넣기]</span>
            </ExampleBox>
          </div>
        </div>
      </section>
    </div>
  )
}
