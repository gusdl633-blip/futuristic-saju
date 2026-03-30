import { useState, useRef, useEffect, useCallback } from 'react'
import type { City } from '../../packages/core/src/cities.js'
import { KOREAN_CITIES, filterCities, formatCityName } from '../../packages/core/src/cities.js'

interface Props {
  selectedCity: City | null
  onSelect: (city: City) => void
}

const inputClass = 'input-neon w-full h-10 px-3 text-base transition-all'

const DEFAULT_CITIES = KOREAN_CITIES.slice(0, 8) as City[]

export default function CityCombobox({ selectedCity, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = query ? filterCities(query) : DEFAULT_CITIES
  const koreanResults = results.filter(c => !c.country)
  const worldResults = results.filter(c => !!c.country)
  const flatResults = results

  useEffect(() => {
    if (highlightIndex < 0 || !listRef.current) return
    const items = listRef.current.querySelectorAll('[role="option"]')
    items[highlightIndex]?.scrollIntoView({ block: 'nearest' })
  }, [highlightIndex])

  const close = useCallback(() => {
    setIsOpen(false)
    setHighlightIndex(-1)
    setQuery('')
  }, [])

  function handleFocus() {
    setIsOpen(true)
    setQuery('')
    setHighlightIndex(-1)
  }

  function handleInput(value: string) {
    setQuery(value)
    setIsOpen(true)
    setHighlightIndex(-1)
  }

  function selectCity(city: City) {
    onSelect(city)
    close()
    inputRef.current?.blur()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        e.preventDefault()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(i => (i + 1) % flatResults.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(i => (i - 1 + flatResults.length) % flatResults.length)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIndex >= 0 && highlightIndex < flatResults.length) {
          selectCity(flatResults[highlightIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        close()
        inputRef.current?.blur()
        break
    }
  }

  function handleOptionMouseDown(e: React.MouseEvent, city: City) {
    e.preventDefault()
    selectCity(city)
  }

  function handleBlur(e: React.FocusEvent) {
    if (containerRef.current?.contains(e.relatedTarget as Node)) return
    close()
  }

  const listboxId = 'city-listbox'

  function renderOptions() {
    if (flatResults.length === 0) {
      return (
        <li className="px-3 py-2 text-base text-[var(--text-muted)] text-center">
          검색 결과 없음
        </li>
      )
    }

    const items: React.ReactNode[] = []
    let optionIndex = 0

    if (koreanResults.length > 0) {
      items.push(
        <li key="header-kr" className="px-3 pt-1.5 pb-1 text-xs font-medium text-[var(--neon-cyan)]" role="presentation">
          한국
        </li>,
      )
      for (const city of koreanResults) {
        const idx = optionIndex++
        items.push(renderOption(city, idx))
      }
    }

    if (worldResults.length > 0) {
      if (koreanResults.length > 0) {
        items.push(
          <li key="divider" className="border-t border-[var(--border-subtle)] my-1" role="presentation" />,
        )
      }
      items.push(
        <li key="header-world" className="px-3 pt-1.5 pb-1 text-xs font-medium text-[var(--neon-cyan)]" role="presentation">
          세계
        </li>,
      )
      for (const city of worldResults) {
        const idx = optionIndex++
        items.push(renderOption(city, idx))
      }
    }

    return items
  }

  function renderOption(city: City, index: number) {
    const isHighlighted = index === highlightIndex
    const label = formatCityName(city)
    return (
      <li
        key={`${city.name}-${city.country ?? 'kr'}`}
        role="option"
        aria-selected={isHighlighted}
        className={`px-3 py-2 text-base cursor-pointer transition-colors ${
          isHighlighted
            ? 'bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] border-l-2 border-[var(--neon-primary)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)]'
        }`}
        onMouseDown={e => handleOptionMouseDown(e, city)}
        onMouseEnter={() => setHighlightIndex(index)}
      >
        {label}
      </li>
    )
  }

  const displayValue = isOpen ? query : (selectedCity ? formatCityName(selectedCity) : '')

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={highlightIndex >= 0 ? `city-option-${highlightIndex}` : undefined}
        autoComplete="off"
        className={inputClass}
        placeholder="도시 이름을 입력하세요"
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={e => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--neon-cyan-muted)]"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>

      {isOpen && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-[rgba(255,255,255,0.1)] bg-[var(--card-bg)] backdrop-blur-xl shadow-[var(--shadow-glow-soft)] py-1 dark:bg-[rgba(20,26,42,0.92)]"
        >
          {renderOptions()}
        </ul>
      )}
    </div>
  )
}
