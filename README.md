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

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install gistit --marketplace Alchemist483/timmys-claude-skillsnmods
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```bash
claude plugin install gistit --marketplace Alchemist483/timmys-claude-skillsnmods
```

If you installed the older separate `heatmeter` mod, uninstall it: its meter is now part of gistit.

```bash
claude plugin uninstall heatmeter
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, then **Add marketplace** with `Alchemist483/timmys-claude-skillsnmods`, then **Add plugin**.

## License

MIT
