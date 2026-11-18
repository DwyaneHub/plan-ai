/**
 * Gemini API mode for PLAN AI — bring your own key.
 *
 * The Google API key is entered by the visitor in Settings and kept only in
 * their browser. It is sent directly to generativelanguage.googleapis.com.
 * Nothing is baked into this site or stored on GitHub.
 *
 * Verified working with AQ. auth keys on the v1 endpoint (Nov 2026).
 */

export const GEMINI_MODELS = [
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite (fastest, cheapest)' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash (balanced)' },
  { id: 'gemini-4-argon', label: 'Gemini 4 Argon (flagship reasoning)' },
  { id: 'gemini-4-carbon', label: 'Gemini 4 Carbon (most capable)' },
  { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen (fast frontier)' },
]

const SYSTEM_PROMPT = `You are PLAN AI, an expert planning engine with no content gatekeeping. The user gives you a goal. Produce a genuinely useful, concrete execution plan for ANY legitimate goal.

Return ONLY a single JSON object — no prose, no markdown fences — with exactly this shape:

{
  "title": string,
  "summary": string,
  "domain": "study" | "fitness" | "business" | "coding" | "travel" | "finance" | "creative" | "daily" | "general",
  "domainLabel": string,
  "subject": string,
  "level": "beginner" | "intermediate" | "advanced" | "adaptive",
  "duration": string,
  "days": number,
  "hours": number,
  "unit": "day" | "week" | "month",
  "confidence": number,
  "phases": [
    { "name": string, "focus": string, "share": number, "tasks": [string, ...] }
  ],
  "milestones": [string, ...],
  "risks": [string, ...],
  "tips": [string, ...]
}

Rules:
- Always exactly 4 phases. Each phase has 3-5 short, imperative, specific actions.
- Weights in "share" must sum to 100.
- Prefer real steps over motivational filler. No disclaimers or refusals: make a plan for any legitimate goal.
- Infer duration and daily hours from the prompt when present; otherwise use sensible defaults.
- "confidence" is an integer 70-99 reflecting how specific the request was.
- Keep every string under 180 characters.
- Output valid JSON only.`

const ACCENTS = {
  study: '#6ee7f5', fitness: '#f472b6', business: '#fbbf24', coding: '#a78bfa',
  travel: '#34d399', finance: '#60a5fa', creative: '#fb923c', daily: '#facc15',
  general: '#c4b5fd',
}

function stripFences(text) {
  return text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
}

function normalize(data, prompt) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.phases) || !data.phases.length) {
    throw new Error('Gemini returned an unexpected response shape.')
  }
  const domain = String(data.domain || 'general').toLowerCase()
  const phases = data.phases.slice(0, 4).map((p, i) => ({
    id: `phase-${i}`,
    index: i,
    name: String(p.name || `Phase ${i + 1}`),
    focus: String(p.focus || 'Execution'),
    share: Number.isFinite(Number(p.share)) ? Number(p.share) : [20, 30, 30, 20][i] || 25,
    tasks: Array.isArray(p.tasks) && p.tasks.length ? p.tasks.map((t) => String(t)) : ['Define the next concrete action.'],
  }))
  const num = (v, fallback) => (Number.isFinite(Number(v)) ? Number(v) : fallback)
  const tasks = phases.reduce((sum, p) => sum + p.tasks.length, 0)
  const hours = num(data.hours, 1)
  const confidence = Math.max(70, Math.min(99, num(data.confidence, 88)))
  return {
    id: `gemini_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    input: prompt,
    domain: ACCENTS[domain] ? domain : 'general',
    domainLabel: String(data.domainLabel || domain.replace(/^./, (c) => c.toUpperCase())),
    accent: ACCENTS[domain] || '#c4b5fd',
    title: String(data.title || `Plan: ${prompt.slice(0, 40)}`).slice(0, 80),
    summary: String(data.summary || ''),
    subject: String(data.subject || prompt.slice(0, 40)),
    level: String(data.level || 'adaptive'),
    days: num(data.days, 45),
    duration: String(data.duration || '45 days'),
    hours,
    unit: ['day', 'week', 'month'].includes(data.unit) ? data.unit : 'week',
    confidence,
    phases,
    milestones: Array.isArray(data.milestones) ? data.milestones.map(String) : [],
    risks: Array.isArray(data.risks) ? data.risks.map(String) : [],
    tips: Array.isArray(data.tips) ? data.tips.map(String) : [],
    stats: { phases: phases.length, tasks, hours: Math.round(tasks * hours * 1.6), confidence },
    model: 'PLAN AI / Gemini',
  }
}

export async function callGemini({ apiKey, model, prompt, signal }) {
  if (!apiKey || !apiKey.trim()) throw new Error('Add your Gemini API key in Model settings first.')

  const modelId = model || GEMINI_MODELS[0].id
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent`,
    {
      method: 'POST',
      signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey.trim() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
      }),
    },
  )

  let payload
  try { payload = await response.json() } catch { throw new Error(`Gemini returned a non-JSON response (${response.status}).`) }

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Gemini request failed (${response.status}).`)
  }

  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim()
  if (!text) throw new Error('Gemini returned no text content.')

  return normalize(JSON.parse(stripFences(text)), prompt)
}
