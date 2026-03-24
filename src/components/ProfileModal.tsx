import { useState, useEffect, useRef } from 'react'
import type { SavedFormState } from './BirthForm.tsx'
import { loadProfiles, addProfile, updateProfile, deleteProfile, exportProfiles, importProfiles } from '../utils/profiles.ts'
import type { Profile } from '../utils/profiles.ts'
import { getFourPillars, toHangul } from '@orrery/core/pillars'

interface Props {
  open: boolean
  onClose: () => void
  getCurrentFormState: () => SavedFormState | null
  onSelect: (data: SavedFormState) => void
}

function formatSummary(data: SavedFormState): string {
  const date = `${data.year}-${String(data.month).padStart(2, '0')}-${String(data.day).padStart(2, '0')}`
  const time = data.unknownTime
    ? '시간모름'
    : `${String(data.hour).padStart(2, '0')}:${String(data.minute).padStart(2, '0')}`
  const gender = data.gender === 'M' ? '남' : '여'
  const city = data.city?.name ?? '직접입력'
  const [, , dp] = getFourPillars(data.year, data.month, data.day, data.hour, data.minute)
  const ilju = toHangul(dp[0]) + toHangul(dp[1]) + '일주'
  return `${date} ${time} ${gender} ${city} ${ilju}`
}

export default function ProfileModal({ open, onClose, getCurrentFormState, onSelect }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [savingNew, setSavingNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const newNameInputRef = useRef<HTMLInputElement>(null)
  const editNameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setProfiles(loadProfiles())
      setSavingNew(false)
      setNewName('')
      setEditingId(null)
      setConfirmDeleteId(null)
      setError(null)
      dialogRef.current?.showModal()
    } else {
      dialogRef.current?.close()
    }
  }, [open])

  useEffect(() => {
    if (savingNew) newNameInputRef.current?.focus()
  }, [savingNew])

  useEffect(() => {
    if (editingId) editNameInputRef.current?.focus()
  }, [editingId])

  useEffect(() => {
    if (!confirmDeleteId) return
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(timer)
  }, [confirmDeleteId])

  function refresh() {
    setProfiles(loadProfiles())
  }

  function handleSaveNew() {
    const trimmed = newName.trim()
    if (!trimmed) return
    const state = getCurrentFormState()
    if (!state) return
    try {
      addProfile(trimmed, state)
      setSavingNew(false)
      setNewName('')
      setError(null)
      refresh()
    } catch {
      setError('저장 공간이 부족합니다. 불필요한 프로필을 삭제해주세요.')
    }
  }

  function handleRename(id: string) {
    const trimmed = editName.trim()
    if (!trimmed) {
      setEditingId(null)
      return
    }
    updateProfile(id, { name: trimmed })
    setEditingId(null)
    refresh()
  }

  function handleDelete(id: string) {
    if (confirmDeleteId === id) {
      deleteProfile(id)
      setConfirmDeleteId(null)
      refresh()
    } else {
      setConfirmDeleteId(id)
    }
  }

  function handleSelect(data: SavedFormState) {
    onSelect(data)
    onClose()
  }

  function handleExport() {
    const json = exportProfiles()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'orrery-profiles.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const added = importProfiles(reader.result as string)
        setError(null)
        if (added > 0) {
          refresh()
        }
      } catch {
        setError('파일을 읽을 수 없습니다. 올바른 JSON 파일인지 확인해주세요.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose()
  }

  const inputClass =
    'h-9 px-3 rounded-xl text-sm text-[var(--text-primary)] ' +
    'bg-[var(--surface-deep)] border border-[var(--border-glow)] ' +
    'focus:outline-none focus:border-[var(--neon-primary-muted)] focus:shadow-[var(--shadow-glow-soft)] transition-all'

  const btnPrimary =
    'px-2.5 py-1 text-sm rounded-lg border transition-all border-[var(--neon-primary-muted)] bg-[var(--neon-primary-dim)] text-[var(--neon-primary)] hover:shadow-[var(--shadow-glow-soft)]'
  const btnSecondary =
    'px-2.5 py-1 text-sm rounded-lg border transition-all border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-glow)]'

  return (
    <dialog
      ref={dialogRef}
      onClick={handleDialogClick}
      onCancel={onClose}
      className="m-auto rounded-2xl p-5 shadow-[var(--shadow-glow-soft)] w-[min(28rem,calc(100vw-2rem))] overflow-hidden"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">프로필 관리</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors"
          aria-label="닫기"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
        프로필은 브라우저 저장소(LocalStorage)에 보관됩니다.{' '}
        <button type="button" onClick={handleExport} disabled={profiles.length === 0} className="underline text-[var(--neon-cyan)] hover:text-[var(--text-primary)] disabled:opacity-40 disabled:no-underline transition-colors">
         보내기
        </button>
        {' / '}
        <button type="button" onClick={() => fileInputRef.current?.click()} className="underline text-[var(--neon-cyan)] hover:text-[var(--text-primary)] transition-colors">
          가져오기
        </button>
      </p>
      <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

      {savingNew ? (
        <form
          onSubmit={e => { e.preventDefault(); handleSaveNew() }}
          className="flex gap-2 mb-4"
        >
          <input
            ref={newNameInputRef}
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="별칭 입력"
            className={`${inputClass} flex-1`}
          />
          <button type="submit" disabled={!newName.trim()} className={`${btnPrimary} disabled:opacity-40`}>
            저장
          </button>
          <button type="button" onClick={() => setSavingNew(false)} className={btnSecondary}>
            취소
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setSavingNew(true)}
          className="w-full mb-4 py-2.5 border border-dashed border-[var(--border-glow)] rounded-xl text-sm text-[var(--text-muted)] hover:border-[var(--neon-primary-muted)] hover:text-[var(--neon-primary)] transition-all"
        >
          <span>+ 입력한 정보로 새 프로필 추가</span>
          <span className="block text-xs text-[var(--text-muted)] mt-0.5">
            {open && getCurrentFormState() && formatSummary(getCurrentFormState()!)}
          </span>
        </button>
      )}

      {error && (
        <div className="mb-3 px-3 py-2 rounded-xl border border-[color-mix(in_srgb,#f472b6_50%,transparent)] bg-[color-mix(in_srgb,#f472b6_12%,transparent)] text-sm text-[#fda4af]">
          {error}
        </div>
      )}

      <div className="max-h-[60vh] overflow-y-auto">
        {profiles.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-muted)] py-6">
            저장된 프로필이 없습니다.
          </p>
        ) : (
          <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
            {profiles.map(profile => (
              <div
                key={profile.id}
                onClick={() => editingId !== profile.id && handleSelect(profile.data)}
                className="py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-[var(--neon-primary-dim)]/30 rounded-xl px-1 -mx-1 transition-colors"
              >
                {editingId === profile.id ? (
                  <form
                    onSubmit={e => { e.preventDefault(); handleRename(profile.id) }}
                    onClick={e => e.stopPropagation()}
                    className="flex gap-2"
                  >
                    <input
                      ref={editNameInputRef}
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={() => handleRename(profile.id)}
                      onKeyDown={e => { if (e.key === 'Escape') { setEditingId(null) } }}
                      className={`${inputClass} flex-1 h-7 text-sm`}
                    />
                  </form>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {profile.name}
                    </span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => { setEditingId(profile.id); setEditName(profile.name) }}
                        className="p-1 text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors"
                        title="별칭 수정"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(profile.id)}
                        className={confirmDeleteId === profile.id
                          ? 'px-1.5 py-0.5 text-xs rounded-lg border border-[color-mix(in_srgb,#f472b6_50%,transparent)] bg-[color-mix(in_srgb,#f472b6_15%,transparent)] text-[#fda4af] transition-colors'
                          : 'p-1 text-[var(--text-muted)] hover:text-[#fda4af] transition-colors'}
                      >
                        {confirmDeleteId === profile.id ? '확인?' : (
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {formatSummary(profile.data)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  )
}
