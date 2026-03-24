/** 긴 해석을 문단 단위로 나누어 가독성 유지 (마크다운 과다 방지) */
export default function InterpretationText({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean)

  if (blocks.length <= 1) {
    return <p className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">{text}</p>
  }

  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <p key={i} className="text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
          {b}
        </p>
      ))}
    </div>
  )
}
