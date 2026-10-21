# Timmy's Claude Skills and Mods

This is a collection of the mods and skills I make for Claude Code. Each one is small, does one job, and is built to look like part of the app, in the desktop app's Code tab and in the terminal.

## Mods

### gistit

gistit adds two slim lines just above the box where you type:

```
✦ Fixed the login bug, all tests pass
→ review the diff                     ▬▬▬▭▭  42% · 3 files · 25m
```

- **The gist:** after every reply, one short line says what just happened. You can see it at a glance without reading the whole reply, which helps most on a phone.
- **What's waiting on you:** when Claude needs something from you, it shows in orange after the `→`.
- **The meter:** how full the context window is, as a small bar from green to red, plus how many files Claude has changed and how long the session has run. Past 80% context, a tiny ⟳ appears. Click it to compact the conversation.

Short replies are shown as they are. Longer replies are summarized by Claude Haiku, using your own Claude account. That costs a few hundred tokens per reply and can add up to a second or two when a turn ends. If a summary fails, the line says why.

Only Claude's own edits count as changed files, not changes made through shell commands. In the desktop app, the band is hidden while one of the app's choice boxes is open.

## Skills

### syc

AI models tend to agree with you. They pick up on what you hope to hear and lean toward it. `/syc` gets you a second opinion that can't do that:

```
/syc I'm thinking of quitting my job to sell AI prompts on Etsy, I'm so excited about this
```

```
❌ NO · Likely
Keep the job and test sales on the side

👍 For: Low startup cost and flexible hours
👎 Against: Crowded market and free AI makes prompts cheap
🔄 Flip if: Side sales already beat your salary for months
```

- **Blind:** Claude rewrites your question as a short, neutral note about "someone", with your opinion and excitement taken out. You see that note first, so you can check nothing slipped through.
- **Fresh reviewer:** a separate Claude that can't see your conversation judges the note. It first argues for the opposite answer, then decides.
- **One look:** yes, no or depends, how sure it is (Certain, Likely, Lean or Toss-up), the best point each way, and what would change its mind. If nothing realistic would, it says so.

It never tells the reviewer to "be harsh", because research shows that only makes models disagree for the sake of it. A good idea should get a yes. Each check runs on Claude Opus and uses about 4,000 tokens.

## Install

At the prompt of a terminal Claude Code session (swap in `syc` for the skill):

```
/plugin install gistit --marketplace Alchemist483/timmys-claude-skillsnmods
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```bash
claude plugin install gistit --marketplace Alchemist483/timmys-claude-skillsnmods
```

```bash
claude plugin install syc --marketplace Alchemist483/timmys-claude-skillsnmods
```

If you installed the older separate `heatmeter` mod, uninstall it: its meter is now part of gistit.

```bash
claude plugin uninstall heatmeter
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, then **Add marketplace** with `Alchemist483/timmys-claude-skillsnmods`, then **Add plugin**.

## License

MIT
