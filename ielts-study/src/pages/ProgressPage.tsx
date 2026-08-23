import { useRef, useState } from 'react'
import { MODULES, totalLessons } from '../data/curriculum'
import { moduleCompletion } from '../lib/progress'
import { useProgress } from '../state/ProgressContext'

export function ProgressPage() {
  const {
    progress,
    completedCount,
    updateProfile,
    exportToFile,
    importFromFile,
    resetAll,
  } = useProgress()
  const fileRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2600)
  }

  async function onImport(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      await importFromFile(file)
      showToast('进度已导入并保存')
    } catch (err) {
      setError(err instanceof Error ? err.message : '导入失败')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function onReset() {
    if (window.confirm('确定清空本地学习进度？此操作不可撤销（除非你已导出备份）。')) {
      resetAll()
      showToast('进度已重置')
    }
  }

  const total = totalLessons()

  return (
    <>
      <section className="hero" style={{ marginBottom: '1.25rem' }}>
        <div className="hero-copy">
          <h1>学习进度</h1>
          <p>
            进度保存在浏览器本地（localStorage）。导出 JSON 可备份或换设备继续；导入会覆盖当前进度。
          </p>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>
              {completedCount}/{total}
            </strong>
            <span>已完成课时</span>
          </div>
          <div className="stat">
            <strong>{progress.streak.current}</strong>
            <span>连续天数（最佳 {progress.streak.best}）</span>
          </div>
          <div className="stat">
            <strong>{progress.updatedAt ? new Date(progress.updatedAt).toLocaleDateString() : '—'}</strong>
            <span>最近更新</span>
          </div>
        </div>
      </section>

      <div className="panel">
        <h2>个人目标</h2>
        <div className="field-grid">
          <label>
            称呼
            <input
              value={progress.profile.displayName}
              onChange={(e) => updateProfile({ displayName: e.target.value })}
            />
          </label>
          <label>
            目标分数
            <input
              type="number"
              min={4}
              max={9}
              step={0.5}
              value={progress.profile.targetBand}
              onChange={(e) =>
                updateProfile({ targetBand: Number(e.target.value) || 6.5 })
              }
            />
          </label>
          <label>
            考试日期
            <input
              type="date"
              value={progress.profile.examDate}
              onChange={(e) => updateProfile({ examDate: e.target.value })}
            />
          </label>
        </div>
      </div>

      <div className="panel">
        <h2>各模块完成情况</h2>
        <div className="lesson-list">
          {MODULES.map((mod) => {
            const { done, total: t, percent } = moduleCompletion(progress, mod.id)
            return (
              <div key={mod.id} className="lesson-item">
                <div>
                  <h3>
                    {mod.name} · {mod.nameEn}
                  </h3>
                  <p>
                    {done}/{t} 课 · {percent}%
                  </p>
                  <div className="progress-track" style={{ marginTop: '0.55rem' }}>
                    <span style={{ width: `${percent}%`, background: mod.accent }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="panel">
        <h2>导入 / 导出</h2>
        <p className="muted">
          导出文件包含个人目标、连续打卡与每课状态、得分与笔记。请妥善保管，勿上传到不可信平台。
        </p>
        <div className="actions-row">
          <button className="btn" type="button" onClick={exportToFile}>
            导出进度 JSON
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            导入进度 JSON
          </button>
          <button className="btn danger" type="button" onClick={onReset}>
            清空进度
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onImport(e.target.files?.[0])}
          />
        </div>
        {error && (
          <p style={{ color: 'var(--clay)', marginBottom: 0, marginTop: '0.85rem' }}>{error}</p>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}
