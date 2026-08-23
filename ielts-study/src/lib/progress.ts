import type { LessonStatus, ModuleId } from '../data/curriculum'
import { MODULES } from '../data/curriculum'

export const STORAGE_KEY = 'ielts-study-progress-v1'
export const PROGRESS_VERSION = 1 as const

export interface LessonProgress {
  status: LessonStatus
  score?: number
  completedAt?: string
  notes?: string
  lastVisitedAt?: string
}

export interface ProgressState {
  version: typeof PROGRESS_VERSION
  profile: {
    displayName: string
    targetBand: number
    examDate: string
  }
  streak: {
    current: number
    best: number
    lastStudyDate: string | null
  }
  modules: Record<ModuleId, Record<string, LessonProgress>>
  updatedAt: string
}

function emptyModules(): ProgressState['modules'] {
  const modules = {} as ProgressState['modules']
  for (const mod of MODULES) {
    modules[mod.id] = {}
  }
  return modules
}

export function createDefaultProgress(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    profile: {
      displayName: '学习者',
      targetBand: 6.5,
      examDate: '',
    },
    streak: {
      current: 0,
      best: 0,
      lastStudyDate: null,
    },
    modules: emptyModules(),
    updatedAt: new Date().toISOString(),
  }
}

function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10)
}

function yesterdayKey(d = new Date()): string {
  const y = new Date(d)
  y.setDate(y.getDate() - 1)
  return y.toISOString().slice(0, 10)
}

export function touchStreak(state: ProgressState, when = new Date()): ProgressState {
  const today = todayKey(when)
  const last = state.streak.lastStudyDate
  if (last === today) return state

  let current = 1
  if (last === yesterdayKey(when)) {
    current = state.streak.current + 1
  }

  return {
    ...state,
    streak: {
      current,
      best: Math.max(state.streak.best, current),
      lastStudyDate: today,
    },
    updatedAt: when.toISOString(),
  }
}

export function loadProgress(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultProgress()
    const parsed = JSON.parse(raw) as ProgressState
    if (parsed.version !== PROGRESS_VERSION || !parsed.modules) {
      return createDefaultProgress()
    }
    const merged = createDefaultProgress()
    return {
      ...merged,
      ...parsed,
      profile: { ...merged.profile, ...parsed.profile },
      streak: { ...merged.streak, ...parsed.streak },
      modules: { ...merged.modules, ...parsed.modules },
    }
  } catch {
    return createDefaultProgress()
  }
}

export function saveProgress(state: ProgressState): void {
  const next = { ...state, updatedAt: new Date().toISOString() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}

export function exportProgress(state: ProgressState): string {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString(),
  }
  return JSON.stringify(payload, null, 2)
}

export function parseImportPayload(raw: string): ProgressState {
  const data = JSON.parse(raw) as ProgressState & { exportedAt?: string }
  if (!data || typeof data !== 'object') {
    throw new Error('文件格式无效')
  }
  if (data.version !== PROGRESS_VERSION) {
    throw new Error(`不支持的进度版本：${String(data.version)}，需要 v${PROGRESS_VERSION}`)
  }
  if (!data.modules || typeof data.modules !== 'object') {
    throw new Error('缺少 modules 字段')
  }
  const base = createDefaultProgress()
  return {
    ...base,
    ...data,
    version: PROGRESS_VERSION,
    profile: { ...base.profile, ...(data.profile ?? {}) },
    streak: { ...base.streak, ...(data.streak ?? {}) },
    modules: { ...base.modules, ...data.modules },
    updatedAt: new Date().toISOString(),
  }
}

export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function countCompleted(state: ProgressState): number {
  let n = 0
  for (const mod of MODULES) {
    for (const lesson of mod.lessons) {
      if (state.modules[mod.id]?.[lesson.id]?.status === 'completed') n += 1
    }
  }
  return n
}

export function moduleCompletion(state: ProgressState, moduleId: ModuleId): {
  done: number
  total: number
  percent: number
} {
  const mod = MODULES.find((m) => m.id === moduleId)
  const total = mod?.lessons.length ?? 0
  let done = 0
  for (const lesson of mod?.lessons ?? []) {
    if (state.modules[moduleId]?.[lesson.id]?.status === 'completed') done += 1
  }
  return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}
