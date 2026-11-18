import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowUp, Check, Cloud, Copy, Download, ExternalLink, Globe,
  LogIn, LogOut, Menu, Paperclip, Plus, RefreshCw, Settings, Sparkles, Trash2, X,
} from 'lucide-react'
import { chatWithGemini } from './gemini.js'
import {
  detectIntent, generateImage, generateMusic, generateVideo,
  generateWebsite, PROMPT_SYSTEM_HINT,
} from './media.js'
import {
  clearSupabaseConfig, fetchCloudChats, getCurrentUser, isDisposableEmail,
  isSupabaseConfigured, loadSupabaseConfig, pushCloudChats,
  saveSupabaseConfig, signInWithGoogle, signOut, subscribeToAuth,
} from './supabase.js'

const CHATS_KEY = 'planai.chats'
const ACTIVE_KEY = 'planai.activeId'
const SETTINGS_KEY = 'planai.settings'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function attachmentSrc(attachment) {
  return `data:${attachment?.mimeType || 'image/png'};base64,${attachment?.data || ''}`
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('Could not read that image.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not open that image.'))
      img.onload = () => {
        const max = 1280
        const scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1))
        const width = Math.max(1, Math.round((img.width || 1) * scale))
        const height = Math.max(1, Math.round((img.height || 1) * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Image processing is unavailable in this browser.'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        resolve({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || 'image.jpg',
          mimeType: 'image/jpeg',
          data: dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : '',
        })
      }
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}

async function copyToClipboard(text) {
  const value = String(text || '')
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const el = document.createElement('textarea')
      el.value = value
      el.setAttribute('readonly', '')
      el.style.position = 'fixed'
      el.style.top = '-1000px'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      el.remove()
      return ok
    } catch {
      return false
    }
  }
}

function Star({ size = 20, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1.6c.5 0 .9.35 1.03.84l1.2 4.55c.18.7.73 1.25 1.43 1.43l4.55 1.2a1.06 1.06 0 0 1 0 2.06l-4.55 1.2c-.7.18-1.25.73-1.43 1.43l-1.2 4.55a1.06 1.06 0 0 1-2.06 0l-1.2-4.55c-.18-.7-.73-1.25-1.43-1.43l-4.55-1.2a1.06 1.06 0 0 1 0-2.06l4.55-1.2c.7-.18 1.25-.73 1.43-1.43l1.2-4.55c.13-.49.53-.84 1.03-.84Z" />
      <path d="M19.4 15.1c.3 0 .55.2.63.49l.42 1.63c.1.4.4.7.8.8l1.63.42a.64.64 0 0 1 0 1.24l-1.63.42c-.4.1-.7.4-.8.8l-.42 1.63a.64.64 0 0 1-1.24 0l-.42-1.63c-.1-.4-.4-.7-.8-.8l-1.63-.42a.64.64 0 0 1 0-1.24l1.63-.42c.4-.1.7-.4.8-.8l.42-1.63c.08-.29.33-.49.63-.49Z" opacity=".7" />
    </svg>
  )
}

function groupChats(chats) {
  const groups = { Today: [], Yesterday: [], Earlier: [] }
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  chats.forEach((c) => {
    const d = new Date(c.createdAt)
    const label = d.toDateString() === today.toDateString()
      ? 'Today'
      : d.toDateString() === yesterday.toDateString() ? 'Yesterday' : 'Earlier'
    groups[label].push(c)
  })
  return groups
}

function SettingsModal({ settings, onChange, onClose, onClear }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2>API key</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="modal-intro">
          PLAN AI runs on Gemini. Your key is saved only in this browser and is sent directly to Google — never to us.
        </p>
        <label className="field">
          <span>Gemini API key</span>
          <input
            type="password"
            autoComplete="off"
            spellCheck="false"
            placeholder="AQ.... or AIza..."
            value={settings.apiKey || ''}
            onChange={(e) => onChange({ ...settings, apiKey: e.target.value })}
            autoFocus
          />
          <small>
            Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>
          </small>
        </label>
        <button className="primary-btn" onClick={onClose}>Done</button>
        <button className="danger-link" onClick={onClear}><Trash2 size={14} /> Clear all chats and key</button>
      </div>
    </div>
  )
}

function CloudModal({ config, onSave, onClear, onClose, user, onSignIn, onSignOut, onSyncNow, syncing, syncError }) {
  const [draft, setDraft] = useState(config)
  const configured = isSupabaseConfigured(config)

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal cloud-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-head">
          <h2><Cloud size={18} /> Cloud sync</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <p className="modal-intro">
          Sign in with Google to sync chats across devices. Your Gemini API key stays in this browser.
        </p>

        <label className="field">
          <span>Supabase project URL</span>
          <input
            value={draft.url || ''}
            placeholder="https://your-project.supabase.co"
            spellCheck="false"
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Anon / public key</span>
          <input
            type="password"
            value={draft.anonKey || ''}
            placeholder="eyJ..."
            spellCheck="false"
            onChange={(e) => setDraft({ ...draft, anonKey: e.target.value })}
          />
          <small>Never paste a service_role key here.</small>
        </label>
        <label className="field">
          <span>Blocked email domains</span>
          <input
            value={(draft.blockedDomains || []).join(', ')}
            placeholder="tempmail.com, mailinator.com"
            spellCheck="false"
            onChange={(e) => setDraft({ ...draft, blockedDomains: e.target.value.split(',') })}
          />
          <small>Comma-separated. Common disposable domains are always blocked.</small>
        </label>

        <button className="primary-btn" onClick={() => onSave(draft)}>Save cloud settings</button>

        {configured && (
          <div className="cloud-section">
            {user ? (
              <>
                <div className="cloud-user">
                  <Cloud size={17} />
                  <div>
                    <strong>{user.email || 'Google account'}</strong>
                    <small>Connected</small>
                  </div>
                </div>
                {syncError && <div className="cloud-error">{syncError}</div>}
                <button className="primary-btn" onClick={onSyncNow} disabled={syncing}>
                  <RefreshCw size={15} className={syncing ? 'spin' : ''} /> {syncing ? 'Syncing…' : 'Sync now'}
                </button>
                <button className="danger-link" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
              </>
            ) : (
              <button className="primary-btn google-btn" onClick={onSignIn}><LogIn size={15} /> Continue with Google</button>
            )}
          </div>
        )}

        <a
          className="setup-link"
          href="https://github.com/DwyaneHub/plan-ai/blob/main/SUPABASE_SETUP.md"
          target="_blank"
          rel="noreferrer"
        >
          Setup instructions <ExternalLink size={12} />
        </a>
        {configured && <button className="danger-link" onClick={onClear}>Forget cloud settings</button>}
      </div>
    </div>
  )
}

function WebsiteBlock({ html }) {
  const url = useMemo(() => URL.createObjectURL(new Blob([html], { type: 'text/html' })), [html])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="website-block">
      <div className="website-actions">
        <button className="copy-btn always" onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
          <ExternalLink size={13} /> Open
        </button>
        <a className="copy-btn always" href={url} download="plan-ai-website.html">
          <Download size={13} /> Download
        </a>
      </div>
      <iframe title="Generated website preview" srcDoc={html} sandbox="allow-scripts" />
      <details className="website-source">
        <summary>View HTML source</summary>
        <pre>{html}</pre>
      </details>
    </div>
  )
}

function MediaBlock({ media }) {
  const src = `data:${media.mime};base64,${media.data}`
  const ext = media.mime.includes('mp4') ? 'mp4' : media.mime.includes('mpeg') || media.mime.includes('mp3') ? 'mp3' : 'png'
  const label = media.type === 'image' ? 'Download image' : media.type === 'video' ? 'Download video' : 'Download audio'
  return (
    <div className={`media-block ${media.type}`}>
      {media.type === 'image' && <img src={src} alt="Generated by PLAN AI" />}
      {media.type === 'video' && <video src={src} controls playsInline preload="metadata" />}
      {media.type === 'audio' && <audio src={src} controls preload="metadata" />}
      <a className="media-download" href={src} download={`plan-ai-${Date.now()}.${ext}`}>{label}</a>
    </div>
  )
}

function Message({ role, content, media = [], attachments = [], website, kind, onNotify }) {
  const copy = async (value, success) => {
    const ok = await copyToClipboard(value)
    onNotify?.(ok ? success : 'Copy failed — select the text manually')
  }

  if (role === 'user') {
    return (
      <div className="message user">
        <div className="user-wrap">
          <button className="copy-btn user-copy" onClick={() => copy(content, 'Message copied')} title="Copy message"><Copy size={13} /> Copy</button>
          <div className="user-bubble">{content}</div>
          {attachments.length > 0 && (
            <div className="attachment-row">
              {attachments.map((a, i) => (
                <a key={a.id || i} href={attachmentSrc(a)} target="_blank" rel="noreferrer" title={a.name || 'Attached image'}>
                  <img src={attachmentSrc(a)} alt={a.name || 'Attached image'} />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const body = content && kind !== 'website' ? (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        pre: ({ node, children, ...props }) => {
          const child = Array.isArray(children) ? children[0] : children
          const code = String(child?.props?.children ?? '').replace(/\n$/, '')
          return (
            <div className="code-block">
              <button className="code-copy" onClick={() => copy(code, 'Code copied')} title="Copy code">
                <Copy size={13} /> Copy
              </button>
              <pre {...props}>{children}</pre>
            </div>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
  ) : null

  return (
    <div className="message assistant">
      <div className="assistant-avatar"><Star size={16} /></div>
      <div className="assistant-body">
        <div className="message-tools">
          {kind && kind !== 'chat' && <span className="kind-tag">{kind}</span>}
          <button className="copy-btn" onClick={() => copy(content, 'Message copied')} title="Copy message"><Copy size={13} /> Copy</button>
        </div>
        {body && <div className="markdown">{body}</div>}
        {kind === 'website' && website && <WebsiteBlock html={website} />}
        {media.map((m, i) => <MediaBlock key={i} media={m} />)}
      </div>
    </div>
  )
}

export default function App() {
  const [chats, setChats] = useState(() => loadJSON(CHATS_KEY, []))
  const [activeId, setActiveId] = useState(() => loadJSON(ACTIVE_KEY, null))
  const [draft, setDraft] = useState('')
  const [attachments, setAttachments] = useState([])
  const [dragging, setDragging] = useState(false)
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [progress, setProgress] = useState('')
  const [settings, setSettings] = useState(() => ({ apiKey: '', ...loadJSON(SETTINGS_KEY, {}) }))
  const [showSettings, setShowSettings] = useState(false)
  const [showCloud, setShowCloud] = useState(false)
  const [cloudConfig, setCloudConfig] = useState(() => loadSupabaseConfig())
  const [user, setUser] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')

  const textarea = useRef(null)
  const fileInput = useRef(null)
  const endRef = useRef(null)
  const toastTimer = useRef(null)
  const chatsRef = useRef(chats)
  const hydrating = useRef(false)
  const lastSynced = useRef('')

  const activeChat = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId])
  const hasKey = Boolean((settings.apiKey || '').trim())

  useEffect(() => { chatsRef.current = chats }, [chats])

  useEffect(() => {
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify(chats))
      return
    } catch { /* media can exceed localStorage quota */ }
    const strip = (list) => list.map((c) => ({ ...c, messages: c.messages.map(({ media, attachments, ...m }) => m) }))
    try {
      localStorage.setItem(CHATS_KEY, JSON.stringify([chats[0], ...strip(chats.slice(1))].filter(Boolean)))
    } catch {
      try { localStorage.setItem(CHATS_KEY, JSON.stringify(strip(chats))) } catch { /* storage unavailable */ }
    }
  }, [chats])
  useEffect(() => {
    try { localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeId)) } catch { /* storage unavailable */ }
  }, [activeId])
  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) } catch { /* storage unavailable */ }
  }, [settings])
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  const notify = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  useEffect(() => {
    let active = true
    const applyUser = async (nextUser) => {
      if (!active) return
      if (nextUser && isDisposableEmail(nextUser.email, cloudConfig.blockedDomains)) {
        notify('Temporary email addresses are not allowed')
        await signOut().catch(() => {})
        setUser(null)
        return
      }
      setUser(nextUser)
      setSyncError('')
      if (!nextUser) return

      hydrating.current = true
      try {
        const cloud = await fetchCloudChats(nextUser)
        if (cloud && cloud.length) {
          setChats(cloud)
          lastSynced.current = JSON.stringify(cloud)
        } else {
          const initial = chatsRef.current
          await pushCloudChats(nextUser, initial)
          lastSynced.current = JSON.stringify(initial)
        }
      } catch (err) {
        setSyncError(err?.message || 'Cloud sync failed')
      } finally {
        hydrating.current = false
      }
    }

    getCurrentUser().then(applyUser).catch(() => {})
    const unsubscribe = subscribeToAuth(applyUser)
    return () => { active = false; unsubscribe() }
  }, [cloudConfig.blockedDomains, notify])

  useEffect(() => {
    if (!user || hydrating.current) return
    const serialized = JSON.stringify(chats)
    if (serialized === lastSynced.current) return
    const timer = setTimeout(async () => {
      setSyncing(true)
      try {
        await pushCloudChats(user, chats)
        lastSynced.current = serialized
        setSyncError('')
      } catch (err) {
        setSyncError(err?.message || 'Cloud sync failed')
      } finally {
        setSyncing(false)
      }
    }, 900)
    return () => clearTimeout(timer)
  }, [chats, user])

  const handleCloudSave = useCallback((next) => {
    const clean = saveSupabaseConfig(next)
    setCloudConfig(clean)
    notify('Cloud settings saved')
  }, [notify])

  const handleCloudClear = useCallback(() => {
    clearSupabaseConfig()
    setCloudConfig(loadSupabaseConfig())
    setUser(null)
    notify('Cloud settings removed')
  }, [notify])

  const handleSignIn = useCallback(async () => {
    try { await signInWithGoogle() } catch (err) { notify(err?.message || 'Sign-in failed') }
  }, [notify])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut()
      setUser(null)
      notify('Signed out')
    } catch (err) {
      notify(err?.message || 'Sign-out failed')
    }
  }, [notify])

  const syncNow = useCallback(async () => {
    if (!user) return
    setSyncing(true)
    try {
      await pushCloudChats(user, chatsRef.current)
      lastSynced.current = JSON.stringify(chatsRef.current)
      setSyncError('')
      notify('Chats synced')
    } catch (err) {
      setSyncError(err?.message || 'Cloud sync failed')
      notify(err?.message || 'Cloud sync failed')
    } finally {
      setSyncing(false)
    }
  }, [user, notify])

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => String(f.type || '').startsWith('image/'))
    if (!files.length) {
      notify('Only image files can be attached')
      return
    }
    if (files.length > 5) notify('Up to 5 images per message')
    try {
      const loaded = await Promise.all(files.slice(0, 5).map(readImageFile))
      setAttachments((prev) => [...prev, ...loaded].slice(0, 5))
      if (loaded.length) notify(`${loaded.length} image${loaded.length > 1 ? 's' : ''} attached`)
    } catch (err) {
      notify(err?.message || 'Could not attach that image')
    }
  }, [notify])

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chats, streamText, streaming])

  const send = useCallback(async (raw) => {
    const text = String(raw || '').trim()
    const sentAttachments = attachments.map((a) => ({ ...a }))
    if ((!text && !sentAttachments.length) || streaming) return

    if (!hasKey) {
      setShowSettings(true)
      notify('Add your Gemini API key to start chatting')
      return
    }

    const promptText = text || 'What do you see in this image?'
    const userMsg = {
      role: 'user',
      content: promptText,
      attachments: sentAttachments,
      id: `u_${Date.now()}`,
    }
    const isNew = !activeChat
    const id = activeChat?.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const messages = [...(activeChat?.messages || []), userMsg]

    if (isNew) {
      const chat = {
        id,
        title: promptText.replace(/\s+/g, ' ').slice(0, 44),
        createdAt: new Date().toISOString(),
        messages,
      }
      setChats((prev) => [chat, ...prev])
      setActiveId(id)
    } else {
      setChats((prev) => prev.map((c) => c.id === id ? { ...c, messages } : c))
    }

    setDraft('')
    setAttachments([])
    setSidebarOpen(false)
    setStreaming(true)
    setStreamText('')
    setProgress('')

    const intent = text ? detectIntent(text, sentAttachments.length > 0) : 'chat'
    const labels = {
      image: 'Generating image…',
      video: 'Starting video…',
      music: 'Composing song…',
      website: 'Building website…',
      prompt: 'Writing prompt…',
      chat: 'Thinking…',
    }
    setProgress(labels[intent] || 'Thinking…')

    try {
      let result
      if (intent === 'image') {
        result = await generateImage({ apiKey: settings.apiKey, prompt: promptText, attachments: sentAttachments })
      } else if (intent === 'music') {
        result = await generateMusic({ apiKey: settings.apiKey, prompt: promptText, attachments: sentAttachments })
      } else if (intent === 'video') {
        result = await generateVideo({ apiKey: settings.apiKey, prompt: promptText, onProgress: setProgress })
      } else if (intent === 'website') {
        result = await generateWebsite({ apiKey: settings.apiKey, prompt: promptText, attachments: sentAttachments })
      } else {
        let apiMessages = messages
        if (intent === 'prompt') {
          apiMessages = [
            ...messages.slice(0, -1),
            {
              role: 'user',
              content: `Write one highly detailed, production-ready generative media prompt for this request. ${PROMPT_SYSTEM_HINT}\n\nRequest: ${promptText}`,
              attachments: userMsg.attachments,
            },
          ]
        }
        const answer = await chatWithGemini({
          apiKey: settings.apiKey,
          messages: apiMessages,
          onChunk: (full) => setStreamText(full),
        })
        result = { text: answer, media: [] }
      }
      setStreamText('')
      setChats((prev) => prev.map((c) => c.id === id
        ? {
            ...c,
            messages: [...c.messages, {
              role: 'assistant',
              content: result.text,
              media: result.media || [],
              website: result.website || null,
              kind: intent,
              id: `a_${Date.now()}`,
            }],
          }
        : c))
    } catch (err) {
      const detail = err?.message || 'Something went wrong.'
      setChats((prev) => prev.map((c) => c.id === id
        ? { ...c, messages: [...c.messages, { role: 'assistant', content: `⚠️ ${detail}`, kind: intent, id: `a_${Date.now()}` }] }
        : c))
      notify(detail)
    } finally {
      setStreaming(false)
      setStreamText('')
      setProgress('')
      setTimeout(() => textarea.current?.focus(), 30)
    }
  }, [streaming, hasKey, activeChat, settings.apiKey, attachments, notify])

  const newChat = useCallback(() => {
    setActiveId(null)
    setDraft('')
    setAttachments([])
    setSidebarOpen(false)
    setTimeout(() => textarea.current?.focus(), 30)
  }, [])

  const openChat = useCallback((id) => {
    setActiveId(id)
    setSidebarOpen(false)
  }, [])

  const deleteChat = useCallback((id, e) => {
    e.stopPropagation()
    setChats((prev) => prev.filter((c) => c.id !== id))
    if (activeId === id) setActiveId(null)
  }, [activeId])

  const clearAll = useCallback(() => {
    setChats([])
    setActiveId(null)
    setSettings({ apiKey: '' })
    setShowSettings(false)
    setShowCloud(false)
    lastSynced.current = ''
    if (user) pushCloudChats(user, []).catch(() => {})
    notify('Everything cleared')
  }, [notify, user])

  const copyChat = useCallback(async () => {
    const lines = (activeChat?.messages || [])
      .map((m) => `${m.role === 'user' ? 'You' : 'PLAN AI'}:\n${m.content || ''}`)
      .join('\n\n')
    if (!lines.trim()) {
      notify('Nothing to copy yet')
      return
    }
    const ok = await copyToClipboard(lines)
    notify(ok ? 'Conversation copied' : 'Copy failed — select the text manually')
  }, [activeChat, notify])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newChat()
      }
      if (e.key === 'Escape') { setShowSettings(false); setShowCloud(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newChat])

  const grouped = useMemo(() => groupChats(chats), [chats])

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand"><span className="brand-icon"><Star size={17} /></span><span>PLAN AI</span></div>
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>

        <button className="new-chat" onClick={newChat}>
          <Plus size={16} /> New chat
        </button>

        <div className="chat-list">
          {chats.length === 0 && <div className="empty-history">Your chats will appear here.</div>}
          {Object.entries(grouped).map(([label, items]) => items.length > 0 && (
            <div className="chat-group" key={label}>
              <div className="group-label">{label}</div>
              {items.map((c) => (
                <button
                  key={c.id}
                  className={`chat-item ${activeId === c.id ? 'active' : ''}`}
                  onClick={() => openChat(c.id)}
                >
                  <span className="chat-title">{c.title}</span>
                  <span className="chat-delete" onClick={(e) => deleteChat(c.id, e)} role="button" aria-label="Delete chat"><X size={14} /></span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-bottom">
          <button className="settings-link" onClick={() => setShowCloud(true)}>
            <Cloud size={16} /> Cloud sync {user && <span className="key-dot" />}
          </button>
          <button className="settings-link" onClick={() => setShowSettings(true)}>
            <Settings size={16} /> API key {hasKey && <span className="key-dot" />}
          </button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="topbar-title">
            <strong>PLAN AI</strong>
            <span className="model-pill">Gemini</span>
            <span className="free-pill">UNRESTRICTED</span>
          </div>
          <div className="top-actions">
            <button className="icon-btn" onClick={() => setShowCloud(true)} title="Cloud sync" aria-label="Cloud sync">
              <Cloud size={17} /> {user && <span className="top-dot" />}
            </button>
            <button className="icon-btn" onClick={copyChat} title="Copy whole conversation" aria-label="Copy conversation"><Copy size={17} /></button>
            <button className="icon-btn top-settings" onClick={() => setShowSettings(true)} aria-label="Settings"><Settings size={18} /></button>
          </div>
        </header>

        <div className="messages">
          {!activeChat && !streaming ? (
            <div className="welcome">
              <div className="welcome-icon"><Star size={30} /></div>
              <h1>What can I help with?</h1>
              <p>Chat, images, video, music, websites, prompts — just ask.</p>
              {!hasKey && (
                <button className="key-prompt" onClick={() => setShowSettings(true)}>
                  Add your Gemini API key to start <ArrowUp size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="thread">
              {(activeChat?.messages || []).map((m) => <Message key={m.id} {...m} onNotify={notify} />)}
              {streaming && (
                streamText
                  ? <Message role="assistant" content={streamText} onNotify={notify} />
                  : (
                      <div className="message assistant thinking">
                        <div className="assistant-avatar"><Star size={16} /></div>
                        <div className="thinking-inner">
                          <div className="dots"><i /><i /><i /></div>
                          <span className="progress-label">{progress}</span>
                        </div>
                      </div>
                    )
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <div
            className={`composer ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addFiles(e.dataTransfer.files)
            }}
          >
            <input
              ref={fileInput}
              className="file-input"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {attachments.length > 0 && (
              <div className="attachment-preview">
                {attachments.map((a) => (
                  <div className="attach-thumb" key={a.id}>
                    <img src={attachmentSrc(a)} alt={a.name || 'Attached image'} />
                    <button className="attach-remove" onClick={() => removeAttachment(a.id)} title="Remove image" aria-label="Remove image"><X size={11} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="composer-row">
              <button
                type="button"
                className="icon-btn attach-btn"
                onClick={() => fileInput.current?.click()}
                disabled={streaming}
                title="Attach images"
                aria-label="Attach images"
              >
                <Paperclip size={18} />
              </button>
              <textarea
                ref={textarea}
                value={draft}
                rows={1}
                placeholder="Ask, attach an image, or request a website..."
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(draft)
                  }
                }}
              />
              <button
                className="send-btn"
                onClick={() => send(draft)}
                disabled={(!draft.trim() && !attachments.length) || streaming}
                aria-label="Send"
              >
                {streaming ? <span className="spinner" /> : <ArrowUp size={17} />}
              </button>
            </div>
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} onClear={clearAll} />
      )}
      {showCloud && (
        <CloudModal
          config={cloudConfig}
          onSave={handleCloudSave}
          onClear={handleCloudClear}
          onClose={() => setShowCloud(false)}
          user={user}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          onSyncNow={syncNow}
          syncing={syncing}
          syncError={syncError}
        />
      )}
      {toast && <div className="toast"><Check size={14} /> {toast}</div>}
    </div>
  )
}
