# PLAN AI

A clean, Claude-style AI chat that runs in your browser, powered by your own Gemini API key.

## Features

- Simple chat interface with streaming responses
- Multiple saved conversations in the sidebar
- Markdown rendering (headings, lists, code blocks, tables)
- Your Gemini API key is stored only in your browser's localStorage
- No backend, no account, no telemetry

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. Click **API key** in the bottom-left of the sidebar and paste a Gemini key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Deploy

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/deploy.yml`.

## Stack

React + Vite, Gemini `generateContent` / `streamGenerateContent` API, `react-markdown`.
