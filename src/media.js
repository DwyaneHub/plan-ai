/**
 * Media generation for PLAN AI: images (Nano Banana), video (Gemini Omni),
 * music (Lyria), and prompt crafting. Uses the visitor's own Gemini key.
 */

const API = 'https://generativelanguage.googleapis.com'

export const MEDIA_MODELS = {
  image: 'gemini-nano-banana-2.1',
  video: 'gemini-omni-1.2-flash',
  music: 'lyria-3.5',
}

export function detectIntent(text) {
  const t = String(text || '').toLowerCase()
  if (/\b(prompt|prompts|midjourney|stable diffusion|sdxl|dall[\s-]?e|negative prompt)\b/.test(t)) return 'prompt'
  if (/\b(video|clip|animation|animate|animated|movie|film|footage|reel|motion)\b/.test(t)) return 'video'
  if (/\b(image|images|picture|photo|draw|drawing|illustration|artwork|logo|poster|wallpaper|portrait|sketch|render|visual)\b/.test(t)) return 'image'
  if (/\b(song|music|track|jingle|melody|lyrics|rap|beat|beats|instrumental|audio|soundtrack|chime|tune)\b/.test(t)) return 'music'
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
      throw new Error('Google is limiting media generation on this key. Media models require billing — enable it in Google AI Studio, then retry.')
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

export async function generateImage({ apiKey, prompt, signal }) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
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

export async function generateMusic({ apiKey, prompt, signal }) {
  const body = { contents: [{ parts: [{ text: prompt }] }] }
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
