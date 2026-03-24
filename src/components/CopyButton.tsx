import { useState } from 'react'

interface Props {
  getText: () => string | Promise<string>
  label?: React.ReactNode
}

export default function CopyButton({ getText, label = '복사' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    const text = await getText()
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="px-3 py-1.5 text-sm rounded-xl border border-[var(--border-glow)] bg-[var(--surface-elevated)]/60 text-[var(--text-secondary)] hover:border-[var(--neon-primary-muted)] hover:text-[var(--neon-primary)] hover:shadow-[var(--shadow-glow-soft)] transition-all whitespace-nowrap"
    >
      {copied ? '복사됨 ✓' : label}
    </button>
  )
}
