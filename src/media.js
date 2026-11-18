/**
 * Media generation for PLAN AI: images (Nano Banana), video (Gemini Omni),
 * music (Lyria), website building, desktop apps, Roblox Studio scripts, and prompt crafting.
 */

import { GEMINI_MODEL } from './gemini.js'

const API = 'https://generativelanguage.googleapis.com'

export const MEDIA_MODELS = {
  image: 'gemini-nano-banana-2.1',
  video: 'gemini-omni-1.2-flash',
  music: 'lyria-3.5',
}

export function detectIntent(text, hasAttachments = false) {
  const t = String(text || '').toLowerCase().trim()
  const createVerb = /\b(generate|make|create|draw|design|produce|render|paint|sketch|compose|write|animate|turn|convert|edit|change|transform)\b/.test(t)
  const asksAboutInput = /^(what|which|who|why|how|describe|explain|read|is|are|can|could|does|do|tell)\b/.test(t) || /\?$/.test(t)
  if (asksAboutInput && !createVerb) return 'chat'

  const appRequest = /\b(app|application|software|program|exe|electron)\b/.test(t)
  const desktopHint = /\b(pc|windows|desktop|electron|exe|offline installer)\b/.test(t)
  const nonDesktop = /\b(web|website|browser|android|ios|iphone|mobile|roblox)\b/.test(t)
  if (appRequest && desktopHint && !nonDesktop) return 'pcapp'

  const exploitTerms = /\b(solara|executor|execute script|exploit|exploiting|inject|injection|infinite yield|hydra|synapse|xeno|fluxus|script hub|auto execute|getgenv|loadstring|hookfunction|roblox admin)\b/
  if (exploitTerms.test(t) || (/\b(roblox|luau)\b/.test(t) && /\b(script|code|lua|luau|obby|game|gui|tool|remote|event|simulator|tycoon|system|mechanic|feature)\b/.test(t))) return 'roblox'
  if (/\b(prompt|prompts|midjourney|stable diffusion|sdxl|dall[\s-]?e|negative prompt)\b/.test(t)) return 'prompt'
  if (/\b(video|clip|animation|animate|animated|movie|film|footage|reel|motion)\b/.test(t)) return 'video'
  if (/\b(song|music|track|jingle|melody|lyrics|rap|beat|beats|instrumental|audio|soundtrack|chime|tune)\b/.test(t)) return 'music'
  if (/\b(website|web site|webpage|web page|landing page|html page|html|css|javascript app|react app|web app)\b/.test(t)) return 'website'
  if (/\b(image|images|picture|photo|draw|drawing|illustration|artwork|logo|poster|wallpaper|portrait|sketch|render|visual)\b/.test(t)) return 'image'
  if (hasAttachments && createVerb) return 'image'
  return 'chat'
}

function aspectFrom(text) {
  const t = String(text || '').toLowerCase()
  if (/9:16|portrait|vertical|tiktok|reel|story/.test(t)) return '9:16'
  if (/16:9|widescreen|landscape|horizontal|cinematic/.test(t)) return '16:9'
  if (/21:9|ultrawide/.test(t)) return '21:9'
  if (/4:3/.test(t)) return '4:3'
  return '1:1'
}

async function apiFetch(url, apiKey, options = {}, signal) {
  const response = await fetch(url, {
    ...options,
    signal,
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey.trim(), ...(options.headers || {}) },
  })
  let payload
  try { payload = await response.json() } catch { throw new Error(`Google returned a non-JSON response (${response.status}).`) }
  if (!response.ok) {
    const msg = payload?.error?.message || ''
    if (response.status === 429) {
      throw new Error('Google is rate-limiting this key (429). Add another key in Settings or retry shortly. Media models may also require billing.')
    }
    if (response.status === 404) throw new Error(`The media model is not available to this key (404). ${msg}`.trim())
    throw new Error(msg || `Request failed (${response.status}).`)
  }
  return payload
}

function partsOf(payload) {
  return payload?.candidates?.[0]?.content?.parts || []
}

function textFromParts(parts) {
  return parts.map((p) => p?.text || '').join('').trim()
}

function mimeTypeOf(node, fallback) {
  return node?.mimeType || node?.mime_type || fallback
}

function collectMedia(node, out = [], seen = new Set()) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((n) => collectMedia(n, out, seen))
    return out
  }

  const inline = node.inlineData || node.inline_data
  if (inline?.data && !seen.has(inline.data.slice(0, 80))) {
    seen.add(inline.data.slice(0, 80))
    out.push({
      type: guessType(mimeTypeOf(inline, node.type)),
      data: inline.data,
      mime: mimeTypeOf(inline, node.type) || 'application/octet-stream',
    })
  }

  for (const key of ['output_image', 'output_video', 'output_audio']) {
    const value = node[key]
    if (value?.data && !seen.has(value.data.slice(0, 80))) {
      seen.add(value.data.slice(0, 80))
      const type = key.split('_')[1]
      out.push({ type, data: value.data, mime: value.mimeType || value.mime_type || defaultMime(type) })
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === 'inlineData' || key === 'inline_data' || key.startsWith('output_')) continue
    if (value && typeof value === 'object') collectMedia(value, out, seen)
  }
  return out
}

function collectText(node, out = []) {
  if (!node || typeof node !== 'object') return out
  if (Array.isArray(node)) {
    node.forEach((n) => collectText(n, out))
    return out
  }
  for (const key of ['output_text', 'text', 'lyrics']) {
    if (typeof node[key] === 'string' && node[key].trim()) out.push(node[key].trim())
  }
  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === 'object' && key !== 'inlineData' && key !== 'inline_data') collectText(value, out)
  }
  return out
}

function guessType(mime = '') {
  const m = String(mime).toLowerCase()
  if (m.startsWith('image/')) return 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (/video|omni/.test(m)) return 'video'
  if (/audio|lyria|mp3|wav/.test(m)) return 'audio'
  return 'image'
}

function defaultMime(type) {
  return type === 'video' ? 'video/mp4' : type === 'audio' ? 'audio/mpeg' : 'image/png'
}

export async function generateImage({ apiKey, prompt, attachments = [], signal }) {
  const requestParts = [{ text: prompt }]
  for (const a of attachments || []) {
    if (a?.data) requestParts.push({ inlineData: { mimeType: a.mimeType || 'image/png', data: a.data } })
  }
  const body = {
    contents: [{ parts: requestParts }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio: aspectFrom(prompt) },
    },
  }
  const payload = await apiFetch(`${API}/v1/models/${MEDIA_MODELS.image}:generateContent`, apiKey, { method: 'POST', body: JSON.stringify(body) }, signal)
  const parts = partsOf(payload)
  const media = parts
    .filter((p) => p?.inlineData?.data)
    .map((p) => ({ type: 'image', data: p.inlineData.data, mime: mimeTypeOf(p.inlineData, 'image/png') }))
  if (!media.length) throw new Error('No image came back. Try a more descriptive prompt.')
  return { text: textFromParts(parts) || 'Here is your image.', media }
}

export async function generateMusic({ apiKey, prompt, attachments = [], signal }) {
  const requestParts = [{ text: prompt }]
  for (const a of attachments || []) {
    if (a?.data) requestParts.push({ inlineData: { mimeType: a.mimeType || 'image/png', data: a.data } })
  }
  const body = { contents: [{ parts: requestParts }] }
  const payload = await apiFetch(`${API}/v1/models/${MEDIA_MODELS.music}:generateContent`, apiKey, { method: 'POST', body: JSON.stringify(body) }, signal)
  const parts = partsOf(payload)
  const media = []
  for (const p of parts) {
    if (p?.inlineData?.data) media.push({ type: 'audio', data: p.inlineData.data, mime: mimeTypeOf(p.inlineData, 'audio/mpeg') })
  }
  if (!media.length) {
    const fromTree = collectMedia(payload).filter((m) => m.type === 'audio')
    if (!fromTree.length) throw new Error('No audio came back. Try a more descriptive music prompt.')
    media.push(...fromTree)
  }
  const lyrics = textFromParts(parts) || collectText(payload).join('\n\n')
  return { text: lyrics ? `**Lyrics / notes**\n\n${lyrics}` : 'Here is your track.', media }
}

const WEBSITE_SYSTEM = `You are an expert web developer. Build a complete, polished, single-file website.
Return ONLY one self-contained HTML document with inline <style> and <script> blocks.
No markdown fences, no explanations, no notes before or after the HTML.
Keep the whole document under 25,000 characters so it always finishes. Never stop in the middle of a tag.
Make it responsive, accessible, visually refined, and actually usable. Use no external assets unless they are loaded from a public CDN.`

function closeTagPair(html, tag) {
  const opens = (html.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length
  const closes = (html.match(new RegExp(`</${tag}>`, 'gi')) || []).length
  return html + `</${tag}>`.repeat(Math.max(0, opens - closes))
}

function normalizeHtml(raw) {
  let html = String(raw || '').trim()
  const fenceAt = html.indexOf('```')
  if (fenceAt !== -1) {
    let inside = html.slice(fenceAt + 3).replace(/^(?:html|htm)?\s*/i, '')
    const closeAt = inside.lastIndexOf('```')
    html = (closeAt !== -1 ? inside.slice(0, closeAt) : inside).trim()
  }
  if (!html) return ''
  html = html.replace(/<[^>]*$/, '').trim()
  if (!/^\s*<!doctype|<html[\s>]/i.test(html)) {
    html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PLAN AI Website</title>
</head>
<body>
${html}`
  }
  html = closeTagPair(html, 'style')
  html = closeTagPair(html, 'script')
  html = closeTagPair(html, 'body')
  html = closeTagPair(html, 'html')
  return html
}

export async function generateWebsite({ apiKey, prompt, attachments = [], signal }) {
  const parts = [{ text: `Build a website for this request:\n\n${prompt}` }]
  for (const a of attachments || []) {
    if (a?.data) parts.push({ inlineData: { mimeType: a.mimeType || 'image/png', data: a.data } })
  }
  const body = {
    systemInstruction: { parts: [{ text: WEBSITE_SYSTEM }] },
    contents: [{ parts }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 32768 },
  }
  const payload = await apiFetch(`${API}/v1/models/${GEMINI_MODEL}:generateContent`, apiKey, { method: 'POST', body: JSON.stringify(body) }, signal)
  const raw = textFromParts(partsOf(payload)) || collectText(payload).join('\n')
  const html = normalizeHtml(raw)
  if (!html) throw new Error('No website code came back. Try a clearer request.')
  return { text: html, media: [], website: html }
}

const ROBLOX_SYSTEM = `You are PLAN AI's Roblox Studio script writer. You help with legitimate Roblox development using official Roblox Studio tools only.

Rules:
- Write complete, working Luau code meant to be pasted into a Script, LocalScript, or ModuleScript inside Roblox Studio.
- Never write exploit scripts, executor scripts, injection code, bypasses, or anything meant to run outside official Roblox Studio. Never output loadstring, game:HttpGet, script hubs, HttpService remote loading, or any code that fetches and runs external scripts. If asked for that, say in one short sentence that you only support Studio development, then give the closest legitimate Studio version of what they want.
- Format the answer as: a short intro, one or more fenced luau code blocks, then a "How to use in Studio" section with numbered steps that name exactly where to paste the script (for example ServerScriptService, StarterPlayerScripts, ReplicatedStorage) and how to test it with the Play button.
- Use Roblox services correctly with game:GetService, and include sensible cleanup or connections handling where needed.
- Be direct and practical. No lectures, no long disclaimers.`

export async function generateRobloxScript({ apiKey, prompt, attachments = [], signal }) {
  const parts = [{ text: `Write a Roblox Studio script for this request:\n\n${prompt}` }]
  for (const a of attachments || []) {
    if (a?.data) parts.push({ inlineData: { mimeType: a.mimeType || 'image/png', data: a.data } })
  }
  const body = {
    systemInstruction: { parts: [{ text: ROBLOX_SYSTEM }] },
    contents: [{ parts }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 16384 },
  }
  const payload = await apiFetch(`${API}/v1/models/${GEMINI_MODEL}:generateContent`, apiKey, { method: 'POST', body: JSON.stringify(body) }, signal)
  const raw = textFromParts(partsOf(payload)) || collectText(payload).join('\n')
  if (!raw) throw new Error('No script came back. Try a clearer request.')
  return { text: raw, media: [] }
}

const PC_APP_SYSTEM = `You are an expert Windows desktop app developer. Build a complete, working Electron application for Windows PC.

Return ONLY plain text in this exact format. No markdown fences, no text outside the blocks.

NAME: App Name
DESC: One sentence about what it does.
===FILE: package.json===
full file contents
===END===
===FILE: main.js===
full file contents
===END===
===FILE: index.html===
full file contents
===END===
===FILE: renderer.js===
full file contents
===END===
===FILE: README.md===
full file contents
===END===

Requirements:
- package.json uses Electron, with scripts "start": "electron ." and "dist": "electron-builder --win", and electron-builder config targeting Windows nsis and portable.
- main.js creates a BrowserWindow with contextIsolation true and nodeIntegration false.
- index.html is the complete UI with inline modern CSS, no external assets. It loads renderer.js with a normal script tag.
- renderer.js wires up all UI behavior using only browser APIs. No remote code loading, no eval, no direct require of Node modules.
- README.md gives exact steps: npm install, npm start, npm run dist, and where the Windows .exe installer appears.
- Write raw file contents between the markers. Do not escape newlines or quotes. Do not wrap files in code fences.
- Keep every file complete and working. Keep the whole response under 18,000 characters.`

function parseProject(raw) {
  const text = String(raw || '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('```'))
    .join('\n')
  const name = text.match(/^NAME:\s*(.+)$/im)?.[1]?.trim() || 'PC App'
  const description = text.match(/^DESC:\s*(.+)$/im)?.[1]?.trim() || ''
  const files = {}
  const re = /===FILE:\s*([^\n=]+)===\s*\n([\s\S]*?)\n===END===/g
  let match
  while ((match = re.exec(text))) files[match[1].trim()] = match[2].trim()
  return { name, description, files }
}

export async function generatePcApp({ apiKey, prompt, attachments = [], signal }) {
  const parts = [{ text: `Build a Windows PC desktop app for this request:\n\n${prompt}` }]
  for (const a of attachments || []) {
    if (a?.data) parts.push({ inlineData: { mimeType: a.mimeType || 'image/png', data: a.data } })
  }
  const body = {
    systemInstruction: { parts: [{ text: PC_APP_SYSTEM }] },
    contents: [{ parts }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 32768 },
  }
  const payload = await apiFetch(`${API}/v1/models/${GEMINI_MODEL}:generateContent`, apiKey, { method: 'POST', body: JSON.stringify(body) }, signal)
  const raw = textFromParts(partsOf(payload)) || collectText(payload).join('\n')
  const project = parseProject(raw)
  const files = project.files
  if (!files['package.json'] || !files['main.js'] || !files['index.html']) {
    throw new Error('The app project was incomplete. Try a clearer request.')
  }
  if (!files['renderer.js']) files['renderer.js'] = "// Add your app logic here.\nconsole.log('App ready')\n"
  if (!files['README.md']) {
    files['README.md'] = `# ${project.name}\n\n1. Unzip this folder.\n2. Run \`npm install\`.\n3. Run \`npm start\` to try the app.\n4. Run \`npm run dist\` to build a Windows installer in the \`dist\` folder.\n`
  }
  const name = project.name
  return {
    text: `**${name}** — Windows desktop app project ready.\n\n${project.description || 'Download the ZIP, then follow the README inside it to build your .exe.'}`,
    media: [],
    pcApp: { name, description: project.description || '', files },
  }
}

const wait = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
  const timer = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve() }, ms)
  const onAbort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
  signal?.addEventListener('abort', onAbort, { once: true })
})

export async function generateVideo({ apiKey, prompt, signal, onProgress }) {
  const body = {
    model: MEDIA_MODELS.video,
    input: prompt,
    response_format: {
      type: 'video',
      delivery: 'inline',
      duration: '5s',
      resolution: '720p',
      aspect_ratio: aspectFrom(prompt) === '9:16' ? '9:16' : '16:9',
    },
    store: false,
  }
  let payload = await apiFetch(`${API}/v1beta/interactions`, apiKey, { method: 'POST', body: JSON.stringify(body) }, signal)
  const id = payload?.id

  const busy = (status) => ['queued', 'pending', 'in_progress', 'running', 'processing'].includes(String(status || '').toLowerCase())
  let ticks = 0
  while (busy(payload?.status) && ticks < 90) {
    onProgress?.(`Rendering video… ${ticks * 2}s`)
    await wait(2000, signal)
    if (!id) break
    payload = await apiFetch(`${API}/v1beta/interactions/${encodeURIComponent(id)}`, apiKey, { method: 'GET' }, signal)
    ticks += 1
  }

  const media = collectMedia(payload).filter((m) => m.type === 'video')
  if (!media.length) throw new Error('No video came back yet. Video jobs can take a minute — try again with a shorter prompt.')
  const text = collectText(payload).join('\n\n') || 'Here is your video.'
  return { text, media }
}

export const PROMPT_SYSTEM_HINT = 'Return only the final prompt text, with no explanation, no preamble, and no markdown fences.'
