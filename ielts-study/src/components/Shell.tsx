import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : undefined)

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <NavLink to="/" className="brand" aria-label="雅思航图首页">
          <span className="brand-mark" aria-hidden />
          <span className="brand-text">
            <strong>雅思航图</strong>
            <span>IELTS Study Map</span>
          </span>
        </NavLink>
        <nav className="nav-pills" aria-label="主导航">
          <NavLink to="/" end className={linkClass}>
            总览
          </NavLink>
          <NavLink to="/module/listening" className={linkClass}>
            听力
          </NavLink>
          <NavLink to="/module/reading" className={linkClass}>
            阅读
          </NavLink>
          <NavLink to="/module/writing" className={linkClass}>
            写作
          </NavLink>
          <NavLink to="/module/speaking" className={linkClass}>
            口语
          </NavLink>
          <NavLink to="/module/vocabulary" className={linkClass}>
            词汇
          </NavLink>
          <NavLink to="/progress" className={linkClass}>
            进度
          </NavLink>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  )
}
