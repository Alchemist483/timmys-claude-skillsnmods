import { expect, test } from 'claude-code/testing'

const BAND = { plugin: 'gistit', component: 'AbovePrompt', props: {} } as const
const LONG = 'Long reply...\n'.repeat(20)
const turn = (answer: string) => ({ answer, durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' }) as never

// the render hook is async, so the first find can race the first paint
async function texts($: any, surface: 'terminal' | 'desktop') {
  const ui = await $.ui.mount({ ...BAND, surface } as never)
  let found: { text?: string }[] = []
  for (let n = 0; n < 20 && found.length === 0; n++) {
    found = await ui.findAll({ type: 'Text' })
    if (found.length === 0) await Promise.resolve()
  }
  await ui.unmount()
  return found.map(t => t.text ?? '').join(' | ')
}

function engine(on: any, reply: unknown) {
  const calls = { model: 0 }
  // reply 'deny' stands for a request the engine refuses to send, which rejects
  on('model.complete', () => (calls.model++, reply === 'deny' ? { deny: 'model blocked' } : { value: reply }) as never)
  on('turn.complete', (_: unknown, e: any) => ({ text: e.answer }))
  on('turn.start', () => ({}) as never)
  on('ui.log', () => ({ value: undefined }) as never)
  // stands for the engine's own band beneath gistit's row
  on('ui.render', ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  return calls
}

test('a long reply gets a Haiku gist, the ask after the arrow, on every surface', async ($, on) => {
  engine(on, { isAnswered: true, text: '"Fixed the bug → review it"\nextra line', usage: {} })
  await $.turn.complete(turn(LONG))

  for (const surface of ['terminal', 'desktop'] as const) {
    const shown = await texts($, surface)
    expect(shown).toContain('Fixed the bug')
    expect(shown).toContain('review it')
    expect(shown).not.toContain('extra line')
    expect(shown).not.toContain('"')
  }
})

test('a short one-line reply is its own gist, with no model call', async ($, on) => {
  const calls = engine(on, { isAnswered: true, text: 'unused', usage: {} })
  await $.turn.complete(turn('Done, tests pass.'))

  expect(calls.model).toBe(0)
  expect(await texts($, 'desktop')).toContain('Done, tests pass.')
})

test('a failed summary leaves the band empty', async ($, on) => {
  engine(on, { isAnswered: false, reason: 'api-error', status: 500, error: 'x', usage: {} })
  await $.turn.complete(turn(LONG))

  expect(await texts($, 'desktop')).toBe('engine')
})

test('a refused summary request never leaves the placeholder up', async ($, on) => {
  engine(on, 'deny')
  await $.turn.complete(turn(LONG)).catch(() => {})

  expect(await texts($, 'desktop')).toBe('engine')
})
