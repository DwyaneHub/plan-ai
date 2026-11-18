# PLAN AI

A clean, Claude-style AI chat that runs in your browser, powered by Gemini.

Live app: https://dwyanehub.github.io/plan-ai/

## Features

- Simple chat interface with streaming responses and saved conversations
- Markdown rendering (headings, lists, code blocks, tables) with copy buttons
- Image attachments: paste, drag/drop, or use the paperclip
- Image, video, music, and website generation from chat
- **Roblox Studio script mode** — writes legitimate Luau with exact paste/test steps in Studio
- Multiple Gemini API keys with automatic failover when one is rate-limited
- Optional Supabase Google sign-in and cloud chat sync (keys never sync)
- Disposable-email blocking for cloud accounts
- Installable app (PWA) on Android, iPhone/iPad, Windows, macOS, and Linux
- Offline app shell caching, so the interface opens without a connection

## API keys

A shared Gemini key is built into the app, so it works immediately without setup.

**That key is public in the browser bundle.** Anyone can see and use it. Add your own keys in **Settings → API keys** for higher limits and failover. Your own keys stay in this browser's localStorage and go directly to Google.

## Roblox Studio mode

Ask for something like “write a Roblox script that gives the player a sword when they touch a part.” PLAN AI returns working Luau plus a “How to use in Studio” section naming where to paste it and how to test it with Play.

This mode only produces scripts for official Roblox Studio (Script / LocalScript / ModuleScript objects). It does not produce executor/injection scripts.

## Install the app

Open https://dwyanehub.github.io/plan-ai/

- **Android (Chrome):** menu → **Install app** / **Add to Home screen**
- **iPhone/iPad (Safari):** Share → **Add to Home Screen**
- **Windows/macOS/Linux (Chrome or Edge):** click the install icon in the address bar, or menu → **Cast, save, and share** → **Install page as app**

## Run locally

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` are deployed to GitHub Pages by `.github/workflows/deploy.yml`.

Cloud sync setup instructions are in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).

## Stack

React + Vite, Gemini `generateContent` / `streamGenerateContent` API, `react-markdown`, Supabase Auth/Postgres, Web App Manifest + Service Worker.
