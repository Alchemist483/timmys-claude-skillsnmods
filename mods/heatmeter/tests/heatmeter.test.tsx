import { expect, test } from 'claude-code/testing'

const BAND = { plugin: 'heatmeter', component: 'AbovePrompt', props: {} } as const

// the render hook is async, so the first find can race the first paint
async function texts($: any, surface: 'terminal' | 'desktop') {
  const ui = await $.ui.mount({ ...BAND, surface } as never)
  let found: { text?: string }[] = []
  for (let n = 0; n < 20 && found.length === 0; n++) {
    found = await ui.findAll({ type: 'Text' })
    if (found.length === 0) await Promise.resolve()
  }
  const compact = await ui.find({ type: 'Button', key: 'compact' })
  await ui.unmount()
  return { shown: found.map(t => t.text ?? '').join(' | '), compact }
}

function engine(on: any, pct: number) {
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 200000, percent: pct }, rateLimits: [] } }) as never)
  on('session.start', (_: unknown, e: any) => ({ cwd: e.cwd }))
  on('clock.every', () => ({ value: { cancel() {} } }) as never)
  on('clock.now', () => ({ value: 5 * 60000 }) as never)
  on('tool.call', () => ({ result: {} }) as never)
  // stands for the engine's own band beneath the plugin
  on('ui.render', ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
}

test('the row shows context, files and time, and counts each edited file once', async ($, on) => {
  engine(on, 42)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'x', new_string: 'y' } as never)
  await $.tool.call({ tool: 'Edit', file_path: '/a.ts', old_string: 'y', new_string: 'z' } as never)
  await $.tool.call({ tool: 'Write', file_path: '/b.ts', content: '' } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const { shown, compact } = await texts($, surface)
    expect(shown).toContain('42% · 2 files · 5m')
    expect(compact).toBeUndefined()
  }
})

test('the compact icon appears at 80% context', async ($, on) => {
  engine(on, 85)
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true } as never)

  const { compact } = await texts($, 'desktop')
  expect(compact).toBeDefined()
})

test('before session.start the row shows unknown context and no runaway clock', async ($, on) => {
  engine(on, 0)

  const { shown } = await texts($, 'desktop')
  expect(shown).toContain('— · 0 files · 0m')
})
