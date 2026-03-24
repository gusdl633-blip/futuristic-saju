import { useState, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react'
import type { BirthInput, Gender, JasiMethod } from '@orrery/core/types'
import { isKoreanDaylightTime } from '@orrery/core/natal'
import type { City } from '@orrery/core/cities'
import { SEOUL } from '@orrery/core/cities'
import CityCombobox from './CityCombobox.tsx'
import logo from '../assets/icon-512.png'

export interface BirthFormHandle {
  getCurrentState(): SavedFormState
}

interface Props {
  onSubmit: (input: BirthInput) => void
  externalState?: SavedFormState | null
  onExternalStateConsumed?: () => void
}

const STORAGE_KEY = 'orrery-birth-input'

export interface SavedFormState {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  gender: Gender
  unknownTime: boolean
  jasiMethod: JasiMethod
  city: City | null
  manualCoords: boolean
  latitude: number
  longitude: number
}

function loadSaved(): SavedFormState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedFormState
  } catch {
    return null
  }
}

const now = new Date()
const currentYear = now.getFullYear()
const saved = loadSaved()

const fieldClass =
  'w-full h-10 pl-3 pr-8 rounded-xl text-base text-[var(--text-primary)] bg-[var(--surface-elevated)]/80 ' +
  'border border-[var(--border-glow)] appearance-none bg-[length:16px_16px] bg-[position:right_8px_center] bg-no-repeat ' +
  "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%235ce1e6%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] " +
  'focus:outline-none focus:border-[var(--neon-primary-muted)] focus:shadow-[var(--shadow-glow-soft)] ' +
  'transition-all disabled:opacity-40 disabled:cursor-not-allowed'

const BirthForm = forwardRef<BirthFormHandle, Props>(function BirthForm({ onSubmit, externalState, onExternalStateConsumed }, ref) {
  const [year, setYear] = useState(saved?.year ?? currentYear - 20)
  const [month, setMonth] = useState(saved?.month ?? now.getMonth() + 1)
  const [day, setDay] = useState(saved?.day ?? now.getDate())
  const [hour, setHour] = useState(saved?.hour ?? now.getHours())
  const [minute, setMinute] = useState(saved?.minute ?? now.getMinutes())
  const [gender, setGender] = useState<Gender>(saved?.gender ?? 'M')
  const [unknownTime, setUnknownTime] = useState(saved?.unknownTime ?? false)
  const [jasiMethod, setJasiMethod] = useState<JasiMethod>(saved?.jasiMethod ?? 'unified')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [selectedCity, setSelectedCity] = useState<City | null>(saved?.city ?? SEOUL)
  const [manualCoords, setManualCoords] = useState(saved?.manualCoords ?? false)
  const [latitude, setLatitude] = useState(saved?.latitude ?? SEOUL.lat)
  const [longitude, setLongitude] = useState(saved?.longitude ?? SEOUL.lon)

  useImperativeHandle(ref, () => ({
    getCurrentState: (): SavedFormState => ({
      year, month, day, hour, minute, gender, unknownTime, jasiMethod,
      city: selectedCity, manualCoords, latitude, longitude,
    }),
  }))

  useEffect(() => {
    if (!externalState) return
    const s = externalState
    setYear(s.year)
    setMonth(s.month)
    setDay(s.day)
    setHour(s.hour)
    setMinute(s.minute)
    setGender(s.gender)
    setUnknownTime(s.unknownTime)
    setJasiMethod(s.jasiMethod)
    setSelectedCity(s.city)
    setManualCoords(s.manualCoords)
    setLatitude(s.latitude)
    setLongitude(s.longitude)
    onExternalStateConsumed?.()
    onSubmit({
      year: s.year, month: s.month, day: s.day,
      hour: s.unknownTime ? 12 : s.hour,
      minute: s.unknownTime ? 0 : s.minute,
      gender: s.gender,
      unknownTime: s.unknownTime,
      ...(!s.unknownTime && { jasiMethod: s.jasiMethod }),
      latitude: s.latitude,
      longitude: s.longitude,
    })
  }, [externalState]) // eslint-disable-line react-hooks/exhaustive-deps

  const isKDT = useMemo(() => isKoreanDaylightTime(year, month, day), [year, month, day])

  function handleCitySelect(city: City) {
    setSelectedCity(city)
    setLatitude(city.lat)
    setLongitude(city.lon)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const state: SavedFormState = {
      year, month, day, hour, minute, gender, unknownTime, jasiMethod,
      city: selectedCity, manualCoords, latitude, longitude,
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* quota exceeded — ignore */ }
    onSubmit({
      year, month, day,
      hour: unknownTime ? 12 : hour,
      minute: unknownTime ? 0 : minute,
      gender,
      unknownTime,
      ...(!unknownTime && { jasiMethod }),
      latitude,
      longitude,
    })
  }

  const toggleTrack =
    'w-9 h-[20px] rounded-full relative transition-all border border-[var(--border-glow)] ' +
    'after:content-[\'\'] after:absolute after:top-[2px] after:left-[2px] after:w-4 after:h-4 after:rounded-full after:bg-[var(--text-primary)] after:transition-transform after:shadow-sm'

  return (
    <form
      onSubmit={handleSubmit}
      className="panel-neon p-5 sm:p-6 border-[var(--border-glow)]"
    >
      <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
        <div className="flex flex-col items-center shrink-0">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl blur-xl opacity-40 bg-[var(--neon-primary)] pointer-events-none"
              aria-hidden
            />
            <img
              src={logo}
              alt="혼천의"
              className="relative w-40 sm:w-48 md:w-56 drop-shadow-[0_0_20px_rgba(61,255,156,0.25)]"
            />
          </div>
          <span className="text-sm text-[var(--neon-cyan)] font-hanja mt-2 tracking-wide">渾天儀</span>
        </div>

        <div className="w-full min-w-0 space-y-4">
          <fieldset>
            <legend className="text-xs font-medium tracking-wider uppercase text-[var(--neon-cyan-muted)] mb-2 block">
              생년월일 (양력)
            </legend>
            <div className="grid grid-cols-3 gap-2">
              <select value={year} onChange={e => setYear(Number(e.target.value))} className={fieldClass}>
                {Array.from({ length: currentYear - 1900 + 1 }, (_, i) => {
                  const y = currentYear - i
                  return <option key={y} value={y}>{y}년</option>
                })}
              </select>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className={fieldClass}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}월</option>
                ))}
              </select>
              <select value={day} onChange={e => setDay(Number(e.target.value))} className={fieldClass}>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}일</option>
                ))}
              </select>
            </div>
          </fieldset>

          {isKDT && (
            <div className="px-3 py-2.5 rounded-xl border border-[var(--neon-cyan-muted)] bg-[var(--neon-primary-dim)] text-sm text-[var(--text-secondary)] leading-relaxed">
              88올림픽 하계표준시(KDT, UTC+10) 구간입니다. 계산에 자동 반영됩니다.
            </div>
          )}

          <fieldset>
            <div className="flex items-center justify-between mb-2">
              <legend className="text-xs font-medium tracking-wider uppercase text-[var(--neon-cyan-muted)]">
                출생 시각
              </legend>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unknownTime}
                  onChange={e => setUnknownTime(e.target.checked)}
                  className="sr-only peer"
                />
                <div
                  className={`${toggleTrack} bg-[var(--surface-elevated)] peer-checked:bg-[var(--neon-primary-dim)] peer-checked:border-[var(--neon-primary-muted)] peer-checked:after:translate-x-4`}
                />
                <span className="text-sm text-[var(--text-muted)]">시간 모름</span>
              </label>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
              <select value={hour} onChange={e => setHour(Number(e.target.value))} disabled={unknownTime} className={fieldClass}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}시</option>
                ))}
              </select>
              <select value={minute} onChange={e => setMinute(Number(e.target.value))} disabled={unknownTime} className={fieldClass}>
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}분</option>
                ))}
              </select>
              <div className="flex h-10 rounded-xl p-0.5 border border-[var(--border-glow)] bg-[var(--surface-deep)]">
                {(['M', 'F'] as const).map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`px-4 rounded-lg text-sm font-medium transition-all ${
                      gender === g
                        ? 'bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] border border-[var(--neon-primary-muted)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {g === 'M' ? '남' : '여'}
                  </button>
                ))}
              </div>
            </div>
          </fieldset>

          <fieldset>
            <div className="flex items-center justify-between mb-2">
              <legend className="text-xs font-medium tracking-wider uppercase text-[var(--neon-cyan-muted)]">
                출생 위치 (시간 보정)
              </legend>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={manualCoords}
                  onChange={e => {
                    setManualCoords(e.target.checked)
                    if (!e.target.checked && selectedCity) {
                      setLatitude(selectedCity.lat)
                      setLongitude(selectedCity.lon)
                    }
                  }}
                  className="sr-only peer"
                />
                <div
                  className={`${toggleTrack} bg-[var(--surface-elevated)] peer-checked:bg-[var(--neon-primary-dim)] peer-checked:border-[var(--neon-primary-muted)] peer-checked:after:translate-x-4`}
                />
                <span className="text-sm text-[var(--text-muted)]">좌표 직접 입력</span>
              </label>
            </div>
            {manualCoords ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">위도</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={latitude}
                    onChange={e => setLatitude(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-glow)] bg-[var(--surface-elevated)]/80 text-[var(--text-primary)] focus:outline-none focus:border-[var(--neon-primary-muted)] focus:shadow-[var(--shadow-glow-soft)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[var(--text-muted)] mb-1">경도</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={longitude}
                    onChange={e => setLongitude(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-glow)] bg-[var(--surface-elevated)]/80 text-[var(--text-primary)] focus:outline-none focus:border-[var(--neon-primary-muted)] focus:shadow-[var(--shadow-glow-soft)] transition-all"
                  />
                </div>
              </div>
            ) : (
              <CityCombobox selectedCity={selectedCity} onSelect={handleCitySelect} />
            )}
          </fieldset>

          {!unknownTime && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-sm text-[var(--neon-cyan)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                고급 · 자시법
              </button>
              {showAdvanced && (
                <fieldset className="mt-3">
                  <legend className="sr-only">자시법</legend>
                  <div className="flex h-10 rounded-xl p-0.5 border border-[var(--border-glow)] bg-[var(--surface-deep)] w-fit">
                    {([
                      { value: 'unified' as const, label: '통자시' },
                      { value: 'split' as const, label: '야자시' },
                    ]).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setJasiMethod(opt.value)}
                        className={`px-4 rounded-lg text-sm font-medium transition-all ${
                          jasiMethod === opt.value
                            ? 'bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] border border-[var(--neon-primary-muted)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-[var(--text-muted)] leading-relaxed">
                    {jasiMethod === 'unified'
                      ? '23:30부터 子시, 일주를 다음날로 넘깁니다.'
                      : '23:30~00:00(야자시)은 子시이나 일주는 당일을 유지합니다.'}
                  </p>
                </fieldset>
              )}
            </div>
          )}

          <button
            type="submit"
            className="mt-2 w-full h-12 rounded-xl font-semibold text-[#030712] bg-[var(--neon-primary)] hover:brightness-110 shadow-[0_0_28px_rgba(61,255,156,0.35)] active:scale-[0.99] transition-all"
          >
            명식 계산
          </button>

          <p className="text-center text-xs text-[var(--text-muted)] leading-relaxed">
            계산은 기기 안에서만 이루어지며, 입력 정보는 서버로 전송되지 않습니다.
          </p>
        </div>
      </div>
    </form>
  )
})

export default BirthForm
