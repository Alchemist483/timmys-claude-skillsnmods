# Timmy's Claude Skills and Mods

This is a collection of the mods and skills I make for Claude Code. Each one is small, does one job, and is built to look like part of the app, in the desktop app's Code tab and in the terminal.

## Mods

### gistit

After every reply, gistit shows one short line just above the box where you type. The line says what just happened and, when Claude needs something from you, what is waiting on you (after a `→`). You can see the gist at a glance without reading the whole reply. That helps most on a phone.

Short replies are shown as they are. Longer replies are summarized by Claude Haiku, using your own Claude account. That costs a few hundred tokens per reply and can add up to about a second when a turn ends.

### heatmeter

heatmeter adds a slim row above the prompt. It shows how full the context window is, as a small bar that goes from green to red. It also shows how many files Claude has changed this session and how long the session has been running. When the context passes 80%, a tiny ⟳ icon appears. Click it to compact the conversation.

Files changed through shell commands aren't counted, only Claude's own edits.

## Install

At the prompt of a terminal Claude Code session:

```
/plugin install gistit --marketplace Alchemist483/timmys-claude-skillsnmods
/plugin install heatmeter --marketplace Alchemist483/timmys-claude-skillsnmods
```

Answer `y` to add the marketplace, then pick a scope.

From a shell:

```bash
claude plugin install gistit --marketplace Alchemist483/timmys-claude-skillsnmods
claude plugin install heatmeter --marketplace Alchemist483/timmys-claude-skillsnmods
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, then **Add marketplace** with `Alchemist483/timmys-claude-skillsnmods`, then **Add plugin**.

## License

MIT
