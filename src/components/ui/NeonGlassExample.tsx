/**
 * 디자인 시스템 참고: `.card` + `.primary-button` + `.tab`
 * 앱에 직접 넣지 않아도 되며, 스타일 검토용으로만 사용합니다.
 */
export default function NeonGlassExample() {
  return (
    <div className="card max-w-md mx-auto p-6 space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">Neon glass</h3>
        <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
          이 블록은 <span className="text-[var(--accent-blue)]">글래스 카드</span>와{' '}
          <span className="text-[var(--accent-purple)]">그라데이션 네온 버튼</span> 조합 예시입니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="tab text-sm active">활성 탭</span>
        <span className="tab text-sm text-[var(--text-muted)]">비활성</span>
      </div>
      <button type="button" className="primary-button px-6 py-3 text-sm font-semibold w-full sm:w-auto">
        primary-button
      </button>
    </div>
  )
}
