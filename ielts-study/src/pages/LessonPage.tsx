import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getLesson, getModule, type ModuleId } from '../data/curriculum'
import { useProgress } from '../state/ProgressContext'

export function LessonPage() {
  const { moduleId = '', lessonId = '' } = useParams()
  const mod = getModule(moduleId as ModuleId)
  const lesson = getLesson(moduleId as ModuleId, lessonId)
  const { progress, visitLesson, markLesson } = useProgress()
  const [selected, setSelected] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (mod && lesson) {
      visitLesson(mod.id, lesson.id)
      setNotes(progress.modules[mod.id]?.[lesson.id]?.notes ?? '')
      setSelected(null)
      setSubmitted(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when route lesson changes
  }, [moduleId, lessonId])

  if (!mod || !lesson) {
    return (
      <div className="panel">
        <h2>课时不存在</h2>
        <Link className="btn" to="/">
          返回总览
        </Link>
      </div>
    )
  }

  const lp = progress.modules[mod.id]?.[lesson.id]
  const quiz = lesson.quiz

  function submitQuiz() {
    if (selected === null || !quiz) return
    setSubmitted(true)
    const score = selected === quiz.answerIndex ? 100 : 0
    markLesson(mod!.id, lesson!.id, {
      status: 'completed',
      score,
    })
  }

  function completeWithoutQuiz() {
    markLesson(mod!.id, lesson!.id, { status: 'completed', score: 100 })
  }

  function saveNotes() {
    markLesson(mod!.id, lesson!.id, { notes })
  }

  return (
    <div className="lesson-body">
      <div className="panel">
        <p className="meta">
          <Link to={`/module/${mod.id}`}>{mod.name}</Link> · {lesson.titleEn} · 约{' '}
          {lesson.minutes} 分钟
        </p>
        <h2>{lesson.title}</h2>
        <p>{lesson.summary}</p>
        <p>{lesson.content}</p>

        {quiz ? (
          <div className="quiz">
            <h3>小测</h3>
            <p>{quiz.question}</p>
            <div className="quiz-options">
              {quiz.options.map((opt, index) => {
                let cls = selected === index ? 'selected' : ''
                if (submitted) {
                  if (index === quiz.answerIndex) cls = 'correct'
                  else if (selected === index) cls = 'wrong'
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    className={cls}
                    disabled={submitted}
                    onClick={() => setSelected(index)}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            <div className="actions-row">
              {!submitted ? (
                <button className="btn" type="button" onClick={submitQuiz} disabled={selected === null}>
                  提交并标记完成
                </button>
              ) : (
                <div className="feedback">
                  {selected === quiz.answerIndex ? '回答正确。' : '再看一眼解析。'}
                  {quiz.explanation}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="actions-row">
            <button className="btn" type="button" onClick={completeWithoutQuiz}>
              {lp?.status === 'completed' ? '已完成（再次确认）' : '标记本课完成'}
            </button>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>学习笔记</h3>
        <label>
          写给未来的自己
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="易错点、同义替换、发音提醒…"
          />
        </label>
        <div className="actions-row">
          <button className="btn secondary" type="button" onClick={saveNotes}>
            保存笔记
          </button>
          <Link className="btn ghost" to={`/module/${mod.id}`}>
            返回模块
          </Link>
        </div>
        {lp?.score !== undefined && (
          <p className="muted" style={{ marginTop: '0.85rem', marginBottom: 0 }}>
            最近得分：{lp.score}
            {lp.completedAt ? ` · 完成于 ${new Date(lp.completedAt).toLocaleString()}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
