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
      // fallback
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
      onClick={handleClick}
      className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300 whitespace-nowrap"
    >
      {copied ? '복사됨 ✓' : label}
    </button>
  )
}
