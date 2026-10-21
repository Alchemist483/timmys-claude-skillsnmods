import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Files, Gist } from '../types'

const gist = atom({ plugin: 'gistit', key: 'gist' } as const, null as Gist)
const percent = atom({ plugin: 'gistit', key: 'percent' } as const, null as number | null)
const files = atom({ plugin: 'gistit', key: 'files' } as const, [] as Files)
const started = atom({ plugin: 'gistit', key: 'startedAt' } as const, null as number | null)

const COMPACT_AT = 80

const SYSTEM = `You write the gist of an AI coding assistant's reply for a busy reader on a phone, in the reply's own language.
Format: <what was done, max 10 words> → <what the reader must do, 2-5 words>
Leave out " → ..." when the reply asks nothing of the reader.
Before the arrow say ONLY what was done; never mention there what the reader still has to do.
Examples:
Fixed the login bug, all tests pass → review the diff
Renamed the loader and updated its three callers
Output only the line: no quotes, no markdown, no preamble.`

// shortcut: head + tail only (outcome and asks sit at the end), send more if gists miss mid-reply questions
const excerpt = (a: string) => (a.length <= 2000 ? a : `${a.slice(0, 300)}\n…\n${a.slice(-1700)}`)
// an ask Haiku put on its own line is joined back; the first non-empty line is the gist
const clean = (t: string) =>
  (t.replace(/\s*\n\s*(?=→)/, ' ').split('\n').map(l => l.replace(/^["'`*\s]+|["'`*\s]+$/g, '')).find(Boolean) ?? '')

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

const snapshot = async ($: EngineInterface) => {
  const text = await read($, gist)
  const pct = await read($, percent) // null: unknown (fresh or just compacted)
  const touched = (await read($, files)).length
  const s = await read($, started)
  const elapsed = s === null ? '0m' : duration((await $.clock.now()) - s)
  const i = text ? text.lastIndexOf(' → ') : -1
  const done = text && i >= 0 ? text.slice(0, i) : text
  const waiting = text && i >= 0 ? text.slice(i + 3) : ''
  return { done, waiting, pct, stats: `${touched} ${touched === 1 ? 'file' : 'files'} · ${elapsed}` }
}

const meter = ($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0], pct: number | null) => {
  const E = $.ui.resolve(e)
  const { Text, Button } = E
  const fill = pct ?? 0
  return [
    'Svg' in E ? (
      <E.Svg source={svgBar(fill)} alt={`context ${pct ?? 'unknown'}% used`} width={64} height={6} />
    ) : (
      <Text>
        {Array.from({ length: 10 }, (_, n) => (
          <Text color={n * 10 >= fill ? 'inactive' : n < 6 ? 'success' : n < 8 ? 'warning' : 'error'}>{n * 10 < fill ? '▰' : '▱'}</Text>
        ))}
      </Text>
    ),
    <Text color="inactive" size="footnote" tabular>
      {pct === null ? '—' : `${pct}%`}
    </Text>,
    pct !== null && pct >= COMPACT_AT ? (
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
    ) : null,
  ]
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    await update($, started, () => usage.startedAt)
    await update($, percent, () => usage.context.percent ?? null)
    $.clock.every(60_000, () => $.ui.invalidate('ui.render')) // keeps the minutes moving
    return next(e)
  })

  // /clear ends the conversation with no new session.start or turn.start
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      const now = await $.clock.now()
      await update($, gist, () => null)
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

  // a stale gist would describe the previous turn
  on('turn.start', async ($, e, next) => {
    if (!e.agentId) await update($, gist, () => null)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const answer = e.answer.trim()
    if (e.agentId || e.isAborted || !answer) return result

    // already a gist: no model call; a short question is itself what waits on the reader
    if (answer.length <= 120 && !answer.includes('\n')) {
      await update($, gist, () => (answer.endsWith('?') ? ` → ${answer}` : answer))
      return result
    }

    await update($, gist, () => '…') // instant placeholder while Haiku writes the real one
    let text = ''
    let why = 'empty reply'
    try {
      // awaited: work left running after the hook returns is dropped with its dispatch
      const r = await $.model.complete({
        model: 'haiku',
        system: SYSTEM,
        prompt: excerpt(answer),
        maxTokens: 80, // a cap, not a target: room for a German line with its ask
        effort: 'low',
        timeoutMs: 6000, // a later gist is useless and would hold the turn open
      })
      if (r.isAnswered) text = clean(r.text)
      else why = r.reason === 'aborted' ? 'timed out' : r.reason
    } catch {
      why = 'request refused' // e.g. Haiku blocked by policy: the call rejects
    }
    // a failure says so in the band rather than leaving it blank
    await update($, gist, () => text || `gist unavailable (${why})`)
    return result
  })

  // the band above the prompt: line 1 the gist, line 2 the ask on the left and the meter on the right
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const v = await snapshot($)
    const below = await next(e) // a survey or another plugin's rows stay, drawn under ours
    const { Box, Text } = $.ui.resolve(e)
    const waiting = e.props.hasSurvey ? '' : v.waiting // a choice box already asks
    return (
      <Box flexDirection="column" paddingX={1}>
        {v.done ? (
          <Text color="inactive" size="footnote" wrap="truncate-end">
            <Text color="claude">✦ </Text>
            {v.done}
          </Text>
        ) : null}
        <Box flexDirection="row" justifyContent="space-between" alignItems="center" gap={2}>
          <Box flexShrink={1} minWidth={0}>
            {waiting ? (
              <Text color="claude" size="footnote" weight="medium" wrap="truncate-end">→ {waiting}</Text>
            ) : null}
          </Box>
          <Box flexDirection="row" alignItems="center" gap={1} flexShrink={0}>
            {meter($, e, v.pct)}
            <Text color="inactive" size="footnote" tabular>· {v.stats}</Text>
          </Box>
        </Box>
        {below}
      </Box>
    )
  })
}
