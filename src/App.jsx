import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowUp, Check, Menu, Plus, Settings, Sparkles, Trash2, X } from 'lucide-react'
import { chatWithGemini } from './gemini.js'

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

function Message({ role, content }) {
  const body = (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
      }}
    >
      {content}
    </ReactMarkdown>
  )
  if (role === 'user') {
    return (
      <div className="message user">
        <div className="user-bubble">{content}</div>
      </div>
    )
  }
  return (
    <div className="message assistant">
      <div className="assistant-avatar"><Star size={16} /></div>
      <div className="markdown">{body}</div>
    </div>
  )
}

export default function App() {
  const [chats, setChats] = useState(() => loadJSON(CHATS_KEY, []))
  const [activeId, setActiveId] = useState(() => loadJSON(ACTIVE_KEY, null))
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [settings, setSettings] = useState(() => ({ apiKey: '', ...loadJSON(SETTINGS_KEY, {}) }))
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')

  const textarea = useRef(null)
  const endRef = useRef(null)
  const toastTimer = useRef(null)

  const activeChat = useMemo(() => chats.find((c) => c.id === activeId) || null, [chats, activeId])
  const hasKey = Boolean((settings.apiKey || '').trim())

  useEffect(() => {
    try { localStorage.setItem(CHATS_KEY, JSON.stringify(chats)) } catch { /* storage unavailable */ }
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
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [chats, streamText, streaming])

  const send = useCallback(async (raw) => {
    const text = String(raw || '').trim()
    if (!text || streaming) return

    if (!hasKey) {
      setShowSettings(true)
      notify('Add your Gemini API key to start chatting')
      return
    }

    const userMsg = { role: 'user', content: text, id: `u_${Date.now()}` }
    const isNew = !activeChat
    const id = activeChat?.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const messages = [...(activeChat?.messages || []), userMsg]

    if (isNew) {
      const chat = {
        id,
        title: text.replace(/\s+/g, ' ').slice(0, 44),
        createdAt: new Date().toISOString(),
        messages,
      }
      setChats((prev) => [chat, ...prev])
      setActiveId(id)
    } else {
      setChats((prev) => prev.map((c) => c.id === id ? { ...c, messages } : c))
    }

    setDraft('')
    setSidebarOpen(false)
    setStreaming(true)
    setStreamText('')

    try {
      const answer = await chatWithGemini({
        apiKey: settings.apiKey,
        messages,
        onChunk: (full) => setStreamText(full),
      })
      setChats((prev) => prev.map((c) => c.id === id
        ? { ...c, messages: [...c.messages, { role: 'assistant', content: answer, id: `a_${Date.now()}` }] }
        : c))
    } catch (err) {
      const detail = err?.message || 'Something went wrong.'
      setChats((prev) => prev.map((c) => c.id === id
        ? { ...c, messages: [...c.messages, { role: 'assistant', content: `⚠️ ${detail}`, id: `a_${Date.now()}` }] }
        : c))
      notify('Gemini request failed')
    } finally {
      setStreaming(false)
      setStreamText('')
      setTimeout(() => textarea.current?.focus(), 30)
    }
  }, [streaming, hasKey, activeChat, settings.apiKey, notify])

  const newChat = useCallback(() => {
    setActiveId(null)
    setDraft('')
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
    notify('Everything cleared')
  }, [notify])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newChat()
      }
      if (e.key === 'Escape') setShowSettings(false)
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
          <button className="icon-btn top-settings" onClick={() => setShowSettings(true)} aria-label="Settings"><Settings size={18} /></button>
        </header>

        <div className="messages">
          {!activeChat && !streaming ? (
            <div className="welcome">
              <div className="welcome-icon"><Star size={30} /></div>
              <h1>What can I help with?</h1>
              <p>Ask anything. Get a straight answer.</p>
              {!hasKey && (
                <button className="key-prompt" onClick={() => setShowSettings(true)}>
                  Add your Gemini API key to start <ArrowUp size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="thread">
              {(activeChat?.messages || []).map((m) => <Message key={m.id} role={m.role} content={m.content} />)}
              {streaming && (
                streamText
                  ? <Message role="assistant" content={streamText} />
                  : <div className="message assistant thinking"><div className="assistant-avatar"><Star size={16} /></div><div className="dots"><i /><i /><i /></div></div>
              )}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="composer-wrap">
          <div className="composer">
            <textarea
              ref={textarea}
              value={draft}
              rows={1}
              placeholder="Message PLAN AI..."
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send(draft)
                }
              }}
            />
            <button className="send-btn" onClick={() => send(draft)} disabled={!draft.trim() || streaming} aria-label="Send">
              {streaming ? <span className="spinner" /> : <ArrowUp size={17} />}
            </button>
          </div>
        </div>
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} onClear={clearAll} />
      )}
      {toast && <div className="toast"><Check size={14} /> {toast}</div>}
    </div>
  )
}
