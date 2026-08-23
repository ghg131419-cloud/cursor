# IELTS Study — product decisions

Locked via grill-me / grilling defaults (cloud agent: proceed without multi-round wait).

| Decision | Choice |
|----------|--------|
| Audience | Chinese Academic IELTS learners aiming Band 5.5→7.0 |
| Mode | Operate — study tool, not marketing landing |
| Stack | Vite + React + TypeScript SPA, no backend |
| Modules | Listening · Reading · Writing · Speaking · Vocabulary |
| Progress | `localStorage` key `ielts-study-progress-v1` |
| Portability | JSON import / export of full progress blob |
| UI language | Chinese chrome; English practice content |
| Design | Deep teal / parchment academic look; Fraunces + Source Sans 3 |

## Progress schema

```ts
{
  version: 1,
  profile: { displayName, targetBand, examDate? },
  streak: { current, best, lastStudyDate },
  modules: {
    [moduleId]: {
      lessons: { [lessonId]: { status, score?, completedAt?, notes? } }
    }
  },
  exportedAt?: string
}
```
