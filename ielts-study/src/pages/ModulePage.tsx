import { Link, useParams } from 'react-router-dom'
import { getModule, type ModuleId } from '../data/curriculum'
import { moduleCompletion } from '../lib/progress'
import { useProgress } from '../state/ProgressContext'

const statusLabel = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
} as const

export function ModulePage() {
  const { moduleId = '' } = useParams()
  const mod = getModule(moduleId as ModuleId)
  const { progress } = useProgress()

  if (!mod) {
    return (
      <div className="panel">
        <h2>模块不存在</h2>
        <Link className="btn" to="/">
          返回总览
        </Link>
      </div>
    )
  }

  const { done, total, percent } = moduleCompletion(progress, mod.id)

  return (
    <>
      <section className="hero" style={{ marginBottom: '1.5rem' }}>
        <div className="hero-copy">
          <p className="muted" style={{ marginBottom: '0.4rem' }}>
            {mod.nameEn}
          </p>
          <h1>{mod.name}</h1>
          <p>{mod.blurb}</p>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{percent}%</strong>
            <span>本模块完成度</span>
          </div>
          <div className="stat">
            <strong>
              {done}/{total}
            </strong>
            <span>已完成课时</span>
          </div>
        </div>
      </section>

      <div className="lesson-list">
        {mod.lessons.map((lesson) => {
          const lp = progress.modules[mod.id]?.[lesson.id]
          const status = lp?.status ?? 'not_started'
          const badgeClass =
            status === 'completed' ? 'done' : status === 'in_progress' ? 'doing' : ''
          return (
            <Link
              key={lesson.id}
              to={`/module/${mod.id}/lesson/${lesson.id}`}
              className="lesson-item"
            >
              <div>
                <h3>{lesson.title}</h3>
                <p>
                  {lesson.titleEn} · 约 {lesson.minutes} 分钟 · {lesson.summary}
                </p>
              </div>
              <span className={`badge ${badgeClass}`}>{statusLabel[status]}</span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
