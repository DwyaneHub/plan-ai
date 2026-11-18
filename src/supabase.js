/**
 * Supabase auth + cloud chat sync for PLAN AI.
 * The Gemini API key is never synced — it stays in this browser only.
 */

import { createClient } from '@supabase/supabase-js'

const CONFIG_KEY = 'planai.supabase'
const TABLE = 'chats'

const DEFAULT_BLOCKED_DOMAINS = [
  'mailinator.com', 'mailinator.net', 'mailinator.org',
  'tempmail.com', 'temp-mail.org', 'tempmail.net',
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'trashmail.com', 'trashmail.net', 'throwawaymail.com',
  'yopmail.com', 'yopmail.net', 'dispostable.com', 'fakeinbox.com',
  'sharklasers.com', 'getairmail.com', 'mailtemp.net', 'mintemail.com',
  'mytrashmail.com', 'spam4.me', 'tempinbox.com', 'tempr.email',
  'discard.email', 'disposable.email', 'tempmail.io', 'tempbox.io',
  'inboxkitten.com', 'mohmal.com', 'nada.email', 'eyepaste.com',
]

export function loadSupabaseConfig() {
  try {
    return { url: '', anonKey: '', blockedDomains: [], ...JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}') }
  } catch {
    return { url: '', anonKey: '', blockedDomains: [] }
  }
}

export function saveSupabaseConfig(config) {
  const clean = {
    url: String(config?.url || '').trim().replace(/\/+$/, ''),
    anonKey: String(config?.anonKey || '').trim(),
    blockedDomains: (config?.blockedDomains || []).map((d) => String(d).trim().toLowerCase()).filter(Boolean),
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(clean))
  clientKey = ''
  client = null
  return clean
}

export function clearSupabaseConfig() {
  localStorage.removeItem(CONFIG_KEY)
  clientKey = ''
  client = null
}

export function isSupabaseConfigured(config = loadSupabaseConfig()) {
  return Boolean(config.url && config.anonKey)
}

let client = null
let clientKey = ''

export function getSupabase() {
  const config = loadSupabaseConfig()
  if (!isSupabaseConfigured(config)) return null
  const key = `${config.url}|${config.anonKey}`
  if (!client || clientKey !== key) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
    clientKey = key
  }
  return client
}

export function isDisposableEmail(email, extraDomains = []) {
  const domain = String(email || '').split('@')[1]?.toLowerCase().trim()
  if (!domain) return false
  const blocked = new Set([...DEFAULT_BLOCKED_DOMAINS, ...extraDomains])
  return Array.from(blocked).some((d) => domain === d || domain.endsWith(`.${d}`))
}

export async function signInWithGoogle() {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Add your Supabase URL and anon key in Settings first.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
  })
  if (error) throw error
}

export async function signOut() {
  const supabase = getSupabase()
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getCurrentUser() {
  const supabase = getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data?.user || null
}

export function subscribeToAuth(callback) {
  const supabase = getSupabase()
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
  return () => data?.subscription?.unsubscribe()
}

function compactForCloud(chats) {
  const serialized = JSON.stringify(chats)
  if (serialized.length < 2_000_000) return chats
  return chats.map((chat) => ({
    ...chat,
    messages: chat.messages.map(({ media, attachments, ...message }) => message),
  }))
}

export async function fetchCloudChats(user) {
  const supabase = getSupabase()
  if (!supabase || !user) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) throw error
  return Array.isArray(data?.data) ? data.data : null
}

export async function pushCloudChats(user, chats) {
  const supabase = getSupabase()
  if (!supabase || !user) return
  const { error } = await supabase
    .from(TABLE)
    .upsert(
      { user_id: user.id, data: compactForCloud(chats), updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  if (error) throw error
}
