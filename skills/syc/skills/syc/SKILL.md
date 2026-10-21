---
name: syc
description: Anti-sycophancy check ("Project Sick Offend"). Gets a blind, independent verdict on an idea, plan, claim, draft or decision from a fresh subagent that cannot see what the user believes or wants. Use when the user types /syc, asks for an objective / unbiased / honest second opinion, asks "am I wrong?", "is this actually good?", or wants Claude to stop just agreeing.
---

# /syc: blind second opinion

Sycophancy is driven by the model knowing the user's opinion. This skill hides it, then forces a counterfactual check. Keep everything short.

## Step 1: Write a neutral brief (you, the main Claude)

Turn what the user wants judged into a brief of at most ~150 words:

- **Third person.** "Someone proposes...", "A person claims...". Never "I", "my", "the user".
- **Strip the stance.** Remove the user's opinion, hopes, excitement, effort spent, and any hint of the answer they want. Remove loaded words ("great", "obviously", "just").
- **Keep the facts.** Include the actual content (or file paths to read), constraints, and the goal it is meant to serve.
- If the material is long (code, a document), point to the file paths instead of pasting.

Show the user the brief in one short italic line before spawning, so they can see nothing leaked.

## Step 2: Spawn one fresh subagent

Use the Agent tool with `subagent_type: syc:syc-reviewer` and the brief alone as the prompt, wrapped in `<brief>...</brief>`. Pass no `model` or `effort`: the agent definition (`agents/syc-reviewer.md` in this plugin) pins Opus at high effort, the reasoning steps, and the four-line output. It has only the Read tool, which keeps its startup context small. Never use `fork` or `general-purpose` for this.

Do not add "be harsh", "be critical" or "don't be sycophantic" to the prompt. Those instructions make models over-correct into contrarianism. The goal is calibrated, not negative: if the thing is good, the verdict should say so.

## Step 3: Report

Render the subagent's four lines in exactly this layout, keeping its words unchanged:

```
### ❌ NO · Likely
**Keep the job and test sales on the side**

- 👍 **For:** Low startup cost and flexible hours
- 👎 **Against:** Crowded market and free AI makes prompts cheap
- 🔄 **Flip if:** Side sales already beat your salary for months
```

(Use ✅ YES / ❌ NO / ⚖️ DEPENDS and the strength word Certain / Likely / Lean / Toss-up exactly as the subagent gave them.) This block is the whole reply after the brief line: no recap, no token stats, no next steps, no reassurance. You may add at most one line below it if you disagree, starting with "Note:", and say why.

## Pushback rule (applies afterwards too)

If the user pushes back on the verdict, change position only if they give new evidence or a new argument. Disagreement alone is not a reason to flip. If they do give new information, you may rerun /syc with an updated brief.
