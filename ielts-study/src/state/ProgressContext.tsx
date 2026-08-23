import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { LessonStatus, ModuleId } from '../data/curriculum'
import {
  countCompleted,
  createDefaultProgress,
  downloadJson,
  exportProgress,
  loadProgress,
  parseImportPayload,
  saveProgress,
  touchStreak,
  type ProgressState,
} from '../lib/progress'

interface ProgressContextValue {
  progress: ProgressState
  completedCount: number
  updateProfile: (patch: Partial<ProgressState['profile']>) => void
  markLesson: (
    moduleId: ModuleId,
    lessonId: string,
    patch: { status?: LessonStatus; score?: number; notes?: string },
  ) => void
  visitLesson: (moduleId: ModuleId, lessonId: string) => void
  exportToFile: () => void
  importFromFile: (file: File) => Promise<void>
  resetAll: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressState>(() => loadProgress())

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  const updateProfile = useCallback((patch: Partial<ProgressState['profile']>) => {
    setProgress((prev) => ({
      ...prev,
      profile: { ...prev.profile, ...patch },
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const visitLesson = useCallback((moduleId: ModuleId, lessonId: string) => {
    setProgress((prev) => {
      const stamped = touchStreak(prev)
      const current = stamped.modules[moduleId]?.[lessonId]
      const status: LessonStatus =
        current?.status === 'completed' ? 'completed' : 'in_progress'
      return {
        ...stamped,
        modules: {
          ...stamped.modules,
          [moduleId]: {
            ...stamped.modules[moduleId],
            [lessonId]: {
              ...current,
              status,
              lastVisitedAt: new Date().toISOString(),
            },
          },
        },
      }
    })
  }, [])

  const markLesson = useCallback(
    (
      moduleId: ModuleId,
      lessonId: string,
      patch: { status?: LessonStatus; score?: number; notes?: string },
    ) => {
      setProgress((prev) => {
        const stamped = touchStreak(prev)
        const current = stamped.modules[moduleId]?.[lessonId]
        const status = patch.status ?? current?.status ?? 'in_progress'
        return {
          ...stamped,
          modules: {
            ...stamped.modules,
            [moduleId]: {
              ...stamped.modules[moduleId],
              [lessonId]: {
                ...current,
                ...patch,
                status,
                completedAt:
                  status === 'completed'
                    ? new Date().toISOString()
                    : current?.completedAt,
              },
            },
          },
        }
      })
    },
    [],
  )

  const exportToFile = useCallback(() => {
    const json = exportProgress(progress)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJson(`ielts-progress-${stamp}.json`, json)
  }, [progress])

  const importFromFile = useCallback(async (file: File) => {
    const text = await file.text()
    const next = parseImportPayload(text)
    setProgress(next)
  }, [])

  const resetAll = useCallback(() => {
    setProgress(createDefaultProgress())
  }, [])

  const value = useMemo(
    () => ({
      progress,
      completedCount: countCompleted(progress),
      updateProfile,
      markLesson,
      visitLesson,
      exportToFile,
      importFromFile,
      resetAll,
    }),
    [
      progress,
      updateProfile,
      markLesson,
      visitLesson,
      exportToFile,
      importFromFile,
      resetAll,
    ],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
