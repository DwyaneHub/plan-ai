# PLAN AI

A clean, Claude-style AI chat that runs in your browser, powered by your own Gemini API keys.

Live app: https://dwyanehub.github.io/plan-ai/

## Features

- Simple chat interface with streaming responses and saved conversations
- Markdown rendering (headings, lists, code blocks, tables) with copy buttons
- Image attachments: paste, drag/drop, or use the paperclip
- Image, video, music, and website generation from chat
- Multiple Gemini API keys with automatic failover when one is rate-limited
- Optional Supabase Google sign-in and cloud chat sync (your keys never sync)
- Disposable-email blocking for cloud accounts
- **Installable app (PWA)** on Android, iPhone/iPad, Windows, macOS, and Linux
- Offline app shell caching, so the interface opens without a connection

Gemini API keys stay in this browser's localStorage and go directly to Google.

## Install the app

Open https://dwyanehub.github.io/plan-ai/ in your browser:

- **Android (Chrome):** menu → **Install app** / **Add to Home screen**
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**
- **Windows/macOS/Linux (Chrome/Edge):** click the install icon in the address bar, or menu → **Cast, save, and share** → **Install page as app**

When the browser supports it, a **Install app** button also appears at the bottom of the app's sidebar.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints. Click **API keys** in the bottom-left of the sidebar and paste one or more Gemini keys from [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

## Deploy

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/deploy.yml`.

Cloud sync setup instructions are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Stack

React + Vite, Gemini `generateContent` / `streamGenerateContent` API, `react-markdown`, Supabase Auth/Postgres, Web App Manifest + Service Worker.
