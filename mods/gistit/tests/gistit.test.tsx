import { expect, test } from 'claude-code/testing'

const LONG = 'Long reply...\n'.repeat(20)
const turn = (answer: string) => ({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' }) as never
const START = { cwd: '/', surface: 'desktop', isInteractive: true } as never

const BAND = { plugin: 'gistit', component: 'AbovePrompt', props: {} } as const

// the render hook is async, so the first find can race the first paint
async function draw($: any, site: object, surface: 'terminal' | 'desktop') {
  const ui = await $.ui.mount({ ...site, surface } as never)
  let found: { text?: string }[] = []
  for (let n = 0; n < 20 && found.length === 0; n++) {
    found = await ui.findAll({ type: 'Text' })
    if (found.length === 0) await Promise.resolve()
  }
  const compact = await ui.find({ type: 'Button', key: 'compact' })
  await ui.unmount()
  return { shown: found.map(t => t.text ?? '').join(' | '), compact }
}
const band1 = ($: any, surface: 'terminal' | 'desktop' = 'desktop') => draw($, BAND, surface)
const band = ($: any, props: object = {}) => draw($, { ...BAND, props }, 'desktop')

// reply 'deny' stands for a request the engine refuses to send, which rejects
function engine(on: any, { reply = null as unknown, pct = 42, below = '' } = {}) {
  const calls = { model: 0 }
  // stands for whatever the engine draws in the band beneath gistit (a survey, say)
  on('ui.render', ($: any, e: any) => {
    const { Box, Text } = $.ui.resolve(e)
    return below ? <Text>{below}</Text> : <Box />
  })
  on('model.complete', () => (calls.model++, reply === 'deny' ? { deny: 'model blocked' } : { value: reply }) as never)
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('turn.start', () => ({}) as never)
  on('ui.log', () => ({ value: undefined }) as never)
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, percent: pct }, rateLimits: [] } }) as never)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: { cancel() {} } }) as never)
  on('clock.now', () => ({ value: 5 * 60000 }) as never)
  on('tool.call', () => ({ result: {} }) as never)
  return calls
}

test('the band shows the gist on line 1 and the ask beside the meter', async ($, on) => {
  engine(on, { reply: { isAnswered: true, text: 'Drafted the plan → pick one', usage: {} } })
  await $.session.start(START)
  await $.turn.complete(turn(LONG))

  const { shown } = await band($)
  expect(shown).toContain('Drafted the plan')
  expect(shown).toContain('→ pick one')
  expect(shown).toContain('42%')
  expect(shown).toContain('· 0 files · 5m')
})

test('with a choice box up, the band keeps the gist and meter, the box beneath, no repeated ask', async ($, on) => {
  engine(on, { reply: { isAnswered: true, text: 'Drafted the plan → pick one', usage: {} }, below: 'choice box' })
  await $.turn.complete(turn(LONG))

  const { shown } = await band($, { hasSurvey: true })
  expect(shown).toContain('Drafted the plan')
  expect(shown).toContain('choice box')
  expect(shown).not.toContain('→ pick one')
})

test('a long reply gets a Haiku gist and the ask on its own line, on every surface', async ($, on) => {
  engine(on, { reply: { isAnswered: true, text: '"Fixed the bug → review it"\nextra line', usage: {} } })
  await $.turn.complete(turn(LONG))

  for (const surface of ['terminal', 'desktop'] as const) {
    const { shown } = await band1($, surface)
    expect(shown).toContain('Fixed the bug')
    expect(shown).toContain('→ review it')
    expect(shown).not.toContain('extra line')
    expect(shown).not.toContain('"')
  }
})

test('a short one-line reply is its own gist, with no model call', async ($, on) => {
  const calls = engine(on)
  await $.turn.complete(turn('Done, tests pass.'))

  expect(calls.model).toBe(0)
  expect((await band1($)).shown).toContain('Done, tests pass.')
})

test('a refused summary says so instead of leaving the placeholder', async ($, on) => {
  engine(on, { reply: 'deny' })
  await $.turn.complete(turn(LONG))

  const { shown } = await band1($)
  expect(shown).toContain('gist unavailable (request refused)')
  expect(shown).not.toContain('…')
})

test('a timed-out summary says so', async ($, on) => {
  engine(on, { reply: { isAnswered: false, reason: 'aborted', usage: {} } })
  await $.turn.complete(turn(LONG))

  expect((await band1($)).shown).toContain('gist unavailable (timed out)')
})

test('a reply that opens with a blank line still yields its gist', async ($, on) => {
  engine(on, { reply: { isAnswered: true, text: '\n\nDrafted the plan → pick one', usage: {} } })
  await $.turn.complete(turn(LONG))

  expect((await band1($)).shown).toContain('Drafted the plan')
})

test('a gist with no ask draws no arrow', async ($, on) => {
  engine(on, { reply: { isAnswered: true, text: 'Renamed the loader', usage: {} } })
  await $.turn.complete(turn(LONG))

  const { shown } = await band1($)
  expect(shown).toContain('Renamed the loader')
  expect(shown).not.toContain('→')
})

test('an ask Haiku put on its own line is kept', async ($, on) => {
  engine(on, { reply: { isAnswered: true, text: 'Fixed the bug\n→ review it', usage: {} } })
  await $.turn.complete(turn(LONG))

  expect((await band1($)).shown).toContain('→ review it')
})

test('a short question reply goes to the ask line, not the gist line', async ($, on) => {
  engine(on)
  await $.turn.complete(turn('Should I also update the tests?'))

  const { shown } = await band1($)
  expect(shown).toContain('→ Should I also update the tests?')
  expect(shown).not.toContain('✦')
})

test('the meter shows context, files and time, and counts each edited file once', async ($, on) => {
  engine(on)
  await $.session.start(START)
  await $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'x', new_string: 'y' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'y', new_string: 'z' } as never)
  await $.tool.call({ tool: 'Write', file_path: '/b.ts', content: '' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const { shown, compact } = await band1($, surface)
    expect(shown).toContain('42%')
    expect(shown).toContain('2 files · 5m')
    expect(compact).toBeUndefined()
  }
})

test('the compact icon appears at 80% context', async ($, on) => {
  engine(on, { pct: 85 })
  await $.session.start(START)

  expect((await band1($)).compact).toBeDefined()
})

test('before session.start the band shows unknown context and no runaway clock', async ($, on) => {
  engine(on)

  const { shown } = await band1($)
  expect(shown).toContain('—')
  expect(shown).toContain('0 files · 0m')
})
