import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Files } from '../types'

const percent = atom({ plugin: 'heatmeter', key: 'percent' } as const, null as number | null)
const files = atom({ plugin: 'heatmeter', key: 'files' } as const, [] as Files)
const started = atom({ plugin: 'heatmeter', key: 'startedAt' } as const, null as number | null)

const COMPACT_AT = 80

const svgBar = (pct: number) => {
  const w = Math.round((64 * pct) / 100)
  // userSpaceOnUse: the fill's end shows the colour of its level, green → amber → red
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="6" viewBox="0 0 64 6">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" x2="64"><stop offset="0" stop-color="#4ade80"/><stop offset=".6" stop-color="#fbbf24"/><stop offset="1" stop-color="#f87171"/></linearGradient></defs>
<rect width="64" height="6" rx="3" fill="#888" fill-opacity=".25"/><rect width="${w}" height="6" rx="3" fill="url(#g)"/></svg>`
}

const duration = (ms: number) => {
  const m = Math.max(0, Math.floor(ms / 60000))
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await update($, started, () => usage.startedAt)
    await update($, percent, () => usage.context.percent ?? null)
    $.clock.every(60_000, () => $.ui.invalidate('ui.render')) // keeps the minutes moving
    return next(e)
  })

  // /clear ends the conversation with no new session.start
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      const now = await $.clock.now()
      await update($, files, () => [])
      await update($, percent, () => null)
      await update($, started, () => now)
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, percent, () => e.context.percent ?? null)
    return next(e)
  })

  // shortcut: counts Edit/Write only, files changed through Bash are missed
  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const r = await next(e)
    if (!r.deny && !r.isError) await update($, files, f => (f.includes(e.file_path) ? f : [...f, e.file_path]))
    return r
  }).catch(($, e, next) => next(e)) // a counting bug must never block a tool call

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const pct = await read($, percent) // null: unknown (fresh or just compacted)
    const touched = (await read($, files)).length
    const s = await read($, started)
    const elapsed = s === null ? '0m' : duration((await $.clock.now()) - s)
    const below = await next(e) // another band row (gistit) keeps its place under this one

    const E = $.ui.resolve(e)
    const { Box, Text, Button } = E
    const fill = pct ?? 0
    const bar =
      'Svg' in E ? (
        <E.Svg source={svgBar(fill)} alt={`context ${pct ?? 'unknown'}% used`} width={64} height={6} />
      ) : (
        <Text>
          {Array.from({ length: 10 }, (_, i) => (
            <Text color={i * 10 >= fill ? 'inactive' : i < 6 ? 'success' : i < 8 ? 'warning' : 'error'}>{i * 10 < fill ? '▰' : '▱'}</Text>
          ))}
        </Text>
      )

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" justifyContent="flex-end" alignItems="center" gap={1} paddingX={1}>
          {pct !== null && pct >= COMPACT_AT && !e.props.isWorking ? (
            <Button
              key="compact"
              label="Compact context"
              plain
              onPress={async () => {
                await $.session.compact()
                await update($, percent, () => null) // no reading until the next response
              }}
            >
              <Text color="warning">⟳</Text>
            </Button>
          ) : null}
          {bar}
          <Text color="inactive" size="footnote" tabular>
            {pct === null ? '—' : `${pct}%`} · {touched} {touched === 1 ? 'file' : 'files'} · {elapsed}
          </Text>
        </Box>
        {below}
      </Box>
    )
  })
}
