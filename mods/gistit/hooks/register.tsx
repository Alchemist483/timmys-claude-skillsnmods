import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Gist } from '../types'

const gist = atom({ plugin: 'gistit', key: 'gist' } as const, null as Gist)

const SYSTEM = `You write the gist of an AI coding assistant's reply for a busy reader on a phone.
Write ONE line, max ~20 words, in the reply's own language: what happened.
If the reply asks the reader for something, end with " → " and that ask in 2-5 words.
Output only the line: no quotes, no markdown, no preamble.`

// shortcut: head + tail only (outcome and asks sit at the end), send more if gists miss mid-reply questions
const excerpt = (a: string) => (a.length <= 2000 ? a : `${a.slice(0, 300)}\n…\n${a.slice(-1700)}`)
const clean = (t: string) => t.split('\n')[0]!.replace(/^["'`*\s]+|["'`*\s]+$/g, '')

export const register: Register = on => {
  // a stale gist would describe the previous turn
  on('turn.start', async ($, e, next) => {
    if (!e.agentId) await update($, gist, () => null)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const answer = e.answer.trim()
    if (e.agentId || e.isAborted || !answer) return result

    // already a gist: no model call
    if (answer.length <= 120 && !answer.includes('\n')) {
      await update($, gist, () => answer)
      return result
    }

    await update($, gist, () => '…') // instant placeholder while Haiku writes the real one
    let text = ''
    try {
      // awaited: work left running after the hook returns is dropped with its dispatch
      const r = await $.model.complete({
        model: 'haiku',
        system: SYSTEM,
        prompt: excerpt(answer),
        maxTokens: 50,
        effort: 'low',
        timeoutMs: 4000, // a later gist is useless and would hold the turn open
      })
      if (r.isAnswered) text = clean(r.text)
      else $.ui.log(`gistit: no gist (${r.reason})`)
    } finally {
      // a refused request (e.g. Haiku blocked by policy) rejects: never leave the placeholder up
      await update($, gist, () => text || null)
    }
    return result
  })

  // /clear ends the conversation with no new turn.start
  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await update($, gist, () => null)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = await read($, gist)
    if (e.props.hasSurvey || !text) return next(e)

    const below = await next(e) // another band row (heatmeter) keeps its place under this one
    const { Box, Text } = $.ui.resolve(e)
    const i = text.lastIndexOf(' → ')
    const done = i < 0 ? text : text.slice(0, i)
    const waiting = i < 0 ? '' : text.slice(i + 3)
    // theme keys, so it follows the app's own light/dark palette; one Text so the ask wraps inline
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" gap={1} paddingX={1}>
          <Text color="claude" size="footnote">✦</Text>
          <Text color="inactive" size="footnote">
            {done}
            {waiting ? <Text color="suggestion" weight="medium"> → {waiting}</Text> : null}
          </Text>
        </Box>
        {below}
      </Box>
    )
  })
}
