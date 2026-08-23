import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { HomePage } from './pages/HomePage'
import { LessonPage } from './pages/LessonPage'
import { ModulePage } from './pages/ModulePage'
import { ProgressPage } from './pages/ProgressPage'
import { ProgressProvider } from './state/ProgressContext'

export default function App() {
  return (
    <ProgressProvider>
      <HashRouter>
        <Shell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/module/:moduleId" element={<ModulePage />} />
            <Route path="/module/:moduleId/lesson/:lessonId" element={<LessonPage />} />
            <Route path="/progress" element={<ProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Shell>
      </HashRouter>
    </ProgressProvider>
  )
}
