# PLAN AI

A self-contained AI planning app built with React + Vite. It runs its own local model entirely in the browser — **no API key, no account, no external endpoint, no content filters**.

## What it does

Give it any goal and it returns a structured roadmap:

- Detects the domain (learning, fitness, business, coding, travel, finance, creative, lifestyle, general)
- Extracts constraints like duration, daily hours, and experience level from your prompt
- Builds phased execution steps, milestones, risk radar, and field notes
- Reveals the result progressively with an on-device "reasoning" animation
- Saves plans locally and lets you copy or download them as Markdown

## Privacy / model notes

`src/engine.js` is the model. It is a custom deterministic planner: intent parsing, constraint extraction, domain routing, and weighted plan assembly with seeded variation. It never calls `fetch`, needs no credentials, and sends nothing anywhere. The "unrestricted" setting means there is no moderation/gatekeeping layer in the app — every prompt produces a plan.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Keyboard shortcuts

- `Enter` — generate plan
- `Shift + Enter` — newline
- `Cmd/Ctrl + N` — new plan
