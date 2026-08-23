import { Link } from 'react-router-dom'
import { MODULES, totalLessons } from '../data/curriculum'
import { moduleCompletion } from '../lib/progress'
import { useProgress } from '../state/ProgressContext'

export function HomePage() {
  const { progress, completedCount } = useProgress()
  const total = totalLessons()
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100)

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <h1>雅思航图</h1>
          <p>
            把听说读写与词汇收成一张可推进的学习地图。进度自动保存在本机，随时导出备份或换设备导入继续。
          </p>
          <div className="hero-actions">
            <Link className="btn" to="/module/listening">
              开始今日学习
            </Link>
            <Link className="btn secondary" to="/progress">
              管理进度
            </Link>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <strong>{percent}%</strong>
            <span>课程完成度</span>
          </div>
          <div className="stat">
            <strong>{progress.streak.current}</strong>
            <span>连续学习天数</span>
          </div>
          <div className="stat">
            <strong>{progress.profile.targetBand.toFixed(1)}</strong>
            <span>目标分数</span>
          </div>
        </div>
      </section>

      <div className="section-title">
        <div>
          <h2>五大模块</h2>
          <p>已完成 {completedCount} / {total} 课</p>
        </div>
      </div>

      <div className="module-grid">
        {MODULES.map((mod, index) => {
          const { done, total: t, percent: p } = moduleCompletion(progress, mod.id)
          return (
            <Link
              key={mod.id}
              to={`/module/${mod.id}`}
              className="module-link"
              style={{ animationDelay: `${0.05 * index}s`, borderTop: `3px solid ${mod.accent}` }}
            >
              <span className="eyebrow">{mod.nameEn}</span>
              <h3>{mod.name}</h3>
              <p>{mod.blurb}</p>
              <div className="progress-track" aria-label={`${mod.name}进度 ${p}%`}>
                <span style={{ width: `${p}%`, background: mod.accent }} />
              </div>
              <p className="muted" style={{ marginTop: '0.55rem', marginBottom: 0 }}>
                {done}/{t} 课完成
              </p>
            </Link>
          )
        })}
      </div>
    </>
  )
}
