/**
 * Gemini chat client for PLAN AI.
 * The key is entered by the visitor and kept only in their browser.
 */

export const GEMINI_MODEL = 'gemini-3.5-flash-lite'

const SYSTEM_PROMPT = `You are PLAN AI, a direct, capable AI assistant. Be helpful, clear and concrete. Answer the user's actual question and give them something useful they can act on.

Style:
- Write in natural, conversational language. Use Markdown when it helps (headings, lists, bold, code blocks).
- Be concise by default. Go deeper when the question needs it.
- Skip disclaimers, moralizing, and unsolicited caveats. Do not lecture.
- If you are unsure, say what you know and what you are unsure about briefly.
- Follow the user's requested format, tone and length exactly.`

export function toGeminiContents(messages) {
  return (messages || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content) }],
    }))
}

function extractText(payload) {
  return (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
}

function readError(payload, status) {
  return payload?.error?.message || `Gemini request failed (${status}).`
}

async function streamOnce({ apiKey, contents, onChunk, signal }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`,
    {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
      }),
    },
  )

  if (!response.ok || !response.body) {
    let payload = null
    try { payload = await response.json() } catch { /* ignore */ }
    throw new Error(readError(payload, response.status))
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const raw = trimmed.slice(5).trim()
      if (!raw || raw === '[DONE]') continue
      let payload
      try { payload = JSON.parse(raw) } catch { continue }
      const delta = extractText(payload)
      if (delta) {
        full += delta
        onChunk?.(full)
      }
    }
  }
  return full
}

async function generateOnce({ apiKey, contents, signal }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 8192 },
      }),
    },
  )
  let payload
  try { payload = await response.json() } catch { throw new Error(`Gemini returned a non-JSON response (${response.status}).`) }
  if (!response.ok) throw new Error(readError(payload, response.status))
  return extractText(payload).trim()
}

export async function chatWithGemini({ apiKey, messages, onChunk, signal }) {
  if (!apiKey || !apiKey.trim()) throw new Error('Add your Gemini API key in settings first.')
  const key = apiKey.trim()
  const contents = toGeminiContents(messages)
  if (!contents.length) throw new Error('Write a message first.')

  try {
    const text = await streamOnce({ apiKey: key, contents, onChunk, signal })
    if (text.trim()) return text.trim()
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    // Fall back to the non-streaming endpoint (some keys/regions block SSE).
  }
  return (await generateOnce({ apiKey: key, contents, signal })).trim()
}
