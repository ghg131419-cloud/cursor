import {
  createDefaultProgress,
  exportProgress,
  parseImportPayload,
} from './progress'

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg)
}

const base = createDefaultProgress()
base.profile.displayName = 'Tester'
base.modules.listening['lis-1'] = {
  status: 'completed',
  score: 100,
  completedAt: new Date().toISOString(),
  notes: 'hello',
}

const json = exportProgress(base)
const roundTrip = parseImportPayload(json)

assert(roundTrip.profile.displayName === 'Tester', 'displayName preserved')
assert(roundTrip.modules.listening['lis-1']?.status === 'completed', 'lesson status preserved')
assert(roundTrip.modules.listening['lis-1']?.notes === 'hello', 'notes preserved')

let failed = false
try {
  parseImportPayload('{"version":999,"modules":{}}')
} catch {
  failed = true
}
assert(failed, 'rejects unsupported version')

console.log('progress.selftest: ok')
