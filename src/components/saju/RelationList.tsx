import type { AllRelations, RelationResult } from '../../../packages/core/src/types.js'
import { ELEMENT_HANJA } from '../../../packages/core/src/constants.js'
import { formatGan, formatJi, formatElementKoreanHanja, relationTypeToKorean } from '../../utils/sajuDisplay.js'
import type { Element } from '../../../packages/core/src/types.js'

interface Props {
  relations: AllRelations
  pillars: string[]
}

const PAIR_NAMES: Record<string, string> = {
  '0,1': '시-일(時-日)', '0,2': '시-월(時-月)', '0,3': '시-년(時-年)',
  '1,2': '일-월(日-月)', '1,3': '일-년(日-年)', '2,3': '월-년(月-年)',
}

type RelKind = 'good' | 'bad' | 'neutral'

function getRelKind(type: string): RelKind {
  if (type === '合' || type === '半合' || type === '三合' || type === '方合') return 'good'
  if (type === '沖' || type === '刑' || type === '害' || type === '破' || type === '怨嗔' || type === '鬼門') return 'bad'
  return 'neutral'
}

const KIND_STYLES: Record<RelKind, string> = {
  good:
    'border-[var(--neon-cyan-muted)] bg-[color-mix(in_srgb,var(--neon-cyan)_12%,transparent)] text-[var(--neon-cyan)]',
  bad:
    'border-[color-mix(in_srgb,#f472b6_45%,transparent)] bg-[color-mix(in_srgb,#f472b6_10%,transparent)] text-[#fda4af]',
  neutral:
    'border-[var(--border-subtle)] bg-[var(--surface-deep)] text-[var(--text-secondary)]',
}

function formatRelation(r: RelationResult, char1: string, char2: string) {
  const detailEl = r.detail && ELEMENT_HANJA[r.detail as Element] ? (r.detail as Element) : undefined
  const detail = detailEl
    ? formatElementKoreanHanja(detailEl)
    : r.detail ? `(${r.detail})` : ''
  const left = formatGan(char1)
  const right = formatGan(char2)
  return { text: `${left}·${right} ${relationTypeToKorean(r.type)}${detail}`, kind: getRelKind(r.type) }
}

export default function RelationList({ relations, pillars }: Props) {
  const lines: Array<{ label: string; tags: Array<{ text: string; kind: RelKind }> }> = []

  relations.pairs.forEach((rel, key) => {
    const [iStr, jStr] = key.split(',')
    const i = Number(iStr)
    const j = Number(jStr)
    const tags: Array<{ text: string; kind: RelKind }> = []

    for (const r of rel.stem) {
      tags.push(formatRelation(r, pillars[i][0], pillars[j][0]))
    }
    for (const r of rel.branch) {
      tags.push({
        ...formatRelation(r, pillars[i][1], pillars[j][1]),
        text: `${formatJi(pillars[i][1])}·${formatJi(pillars[j][1])} ${relationTypeToKorean(r.type)}${
          r.detail && ELEMENT_HANJA[r.detail as Element]
            ? formatElementKoreanHanja(r.detail as Element)
            : r.detail
              ? `(${r.detail})`
              : ''
        }`,
      })
    }

    if (tags.length > 0) {
      lines.push({ label: PAIR_NAMES[key] || key, tags })
    }
  })

  for (const rel of relations.triple) {
    const el = rel.detail && ELEMENT_HANJA[rel.detail as Element] ? formatElementKoreanHanja(rel.detail as Element) : ''
    lines.push({ label: '', tags: [{ text: `${relationTypeToKorean(rel.type)}${el} 국(局)`, kind: 'good' }] })
  }

  for (const rel of relations.directional) {
    const el = rel.detail && ELEMENT_HANJA[rel.detail as Element] ? formatElementKoreanHanja(rel.detail as Element) : ''
    lines.push({ label: '', tags: [{ text: `${relationTypeToKorean(rel.type)}${el}`, kind: 'good' }] })
  }

  if (lines.length === 0) return null

  return (
    <section>
      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">팔자관계(八字關係)</h3>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 text-base">
            {line.label && (
              <span className="text-[var(--text-muted)] w-12 shrink-0 text-sm">{line.label}</span>
            )}
            <div className="flex flex-wrap gap-1.5">
              {line.tags.map((tag, j) => (
                <span
                  key={j}
                  className={`px-2.5 py-1 rounded-lg text-sm font-medium border ${KIND_STYLES[tag.kind]}`}
                >
                  {tag.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
