import { normalizeTerms } from '../../utils/normalizeTerms.js'

/** 해석·채팅 본문 공통: 글자 크기·행간·줄바꿈 (색은 상위에서 지정 가능) */
export const interpretationBodyTypography =
  'text-[15px] sm:text-base leading-[1.7] whitespace-pre-wrap'

/** 해석 본문: 줄바꿈 유지, 가독성(행간·글자 크기) */
export default function InterpretationText({ text }: { text: string }) {
  text = normalizeTerms(text)
  const blocks = text
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean)

  const paraClass = `${interpretationBodyTypography} text-[var(--text-secondary)]`

  if (blocks.length <= 1) {
    return <p className={paraClass}>{text}</p>
  }

  return (
    <div className="space-y-4">
      {blocks.map((b, i) => (
        <p key={i} className={paraClass}>
          {b}
        </p>
      ))}
    </div>
  )
}
