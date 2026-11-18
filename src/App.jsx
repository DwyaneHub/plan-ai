import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, AlertTriangle, ArrowUp, BookOpen, Briefcase, Check, CheckCircle2,
  ChevronRight, Clock, Code2, Compass, Copy, Cpu, Download, History, Layers,
  Lightbulb, Map, Menu, Plus, RotateCcw, Settings, ShieldOff, Sparkles, Sun,
  Target, Trash2, Wallet, WifiOff, X, Zap,
} from 'lucide-react'
import { EXAMPLES, generatePlan, planToMarkdown } from './engine.js'

const DOMAIN_ICONS = {
  study: BookOpen, fitness: Activity, business: Briefcase, coding: Code2,
  travel: Map, finance: Wallet, creative: Sparkles, daily: Sun, general: Compass,
}

const THINKING = [
  'Reading your objective…',
  'Extracting constraints & intent…',
  'Selecting the planning domain…',
  'Sequencing phases and milestones…',
  'Running local inference…',
  'Formatting your roadmap…',
]

const DEFAULT_SETTINGS = { days: '', hours: 1, level: 'adaptive', localOnly: true, filtersOff: true }

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function Logo({ compact = false }) {
  return (
    <div className="brand">
      <div className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path d="M12 31V9h10a7 7 0 0 1 0 14H12" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="28" cy="28" r="3" fill="currentColor" opacity=".75" />
        </svg>
      </div>
      {!compact && (
        <div className="brand-text">
          <span>PLAN<span className="brand-ai">AI</span></span>
          <small>LOCAL INTELLIGENCE</small>
        </div>
      )}
    </div>
  )
}

function Thinking({ stage }) {
  return (
    <div className="thinking card">
      <div className="thinking-head">
        <span className="thinking-orb"><Sparkles size={15} /></span>
        <div>
          <strong>PLAN AI is reasoning</strong>
          <span className="thinking-sub">On-device · no API key · no data leaves this tab</span>
        </div>
      </div>
      <div className="thinking-steps">
        {THINKING.map((step, i) => (
          <div key={step} className={`thinking-step ${i === stage ? 'active' : ''} ${i < stage ? 'done' : ''}`}>
            <span className="step-dot">{i < stage ? <Check size={11} /> : null}</span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <div className="thinking-bar"><span /></div>
    </div>
  )
}

function PlanDocument({ plan, reveal, onCopy, onDownload, onRegenerate }) {
  const Icon = DOMAIN_ICONS[plan.domain] || Compass
  const total = plan.phases.length + plan.milestones.length + plan.risks.length + plan.tips.length
  let cursor = 0
  const take = () => cursor++

  return (
    <article className="plan-doc card" style={{ '--accent': plan.accent }}>
      <header className="plan-header">
        <div className="plan-topline">
          <span className="domain-chip"><Icon size={14} /> {plan.domainLabel.toUpperCase()}</span>
          <span className="model-chip"><Cpu size={12} /> {plan.model}</span>
        </div>
        <h2>{plan.title}</h2>
        <p className="plan-summary">{plan.summary}</p>
        <div className="stat-row">
          <div className="stat"><Layers size={16} /><span><b>{plan.stats.phases}</b> phases</span></div>
          <div className="stat"><CheckCircle2 size={16} /><span><b>{plan.stats.tasks}</b> actions</span></div>
          <div className="stat"><Clock size={16} /><span><b>{plan.stats.hours}h</b> est. work</span></div>
          <div className="stat"><Target size={16} /><span><b>{plan.confidence}%</b> confidence</span></div>
        </div>
      </header>

      <section className="doc-section">
        <div className="section-heading">
          <span className="section-index">01</span>
          <h3>Execution roadmap</h3>
          <span className="section-line" />
        </div>
        <div className="phase-list">
          {plan.phases.map((phase, i) => {
            const idx = take()
            if (idx >= reveal) return <div key={phase.id} className="phase-skeleton" />
            return (
              <div className="phase" key={phase.id} style={{ animationDelay: `${i * 40}ms` }}>
                <div className="phase-rail">
                  <span className="phase-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="phase-connector" />
                </div>
                <div className="phase-body">
                  <div className="phase-title">
                    <h4>{phase.name}</h4>
                    <span className="phase-focus">{phase.focus}</span>
                    <span className="phase-share">{phase.share}%</span>
                  </div>
                  <div className="phase-progress"><span style={{ width: `${phase.share}%` }} /></div>
                  <ul className="task-list">
                    {phase.tasks.map((task, ti) => (
                      <li key={ti}><span className="task-box" />{task}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="doc-section">
        <div className="section-heading">
          <span className="section-index">02</span>
          <h3>Milestones</h3>
          <span className="section-line" />
        </div>
        <div className="milestone-grid">
          {plan.milestones.map((m, i) => {
            const idx = take()
            if (idx >= reveal) return null
            return (
              <div className="milestone" key={m}>
                <span className="milestone-dot" />
                <span>{m}</span>
                <small>M{i + 1}</small>
              </div>
            )
          })}
        </div>
      </section>

      <div className="doc-split">
        <section className="doc-section compact">
          <div className="section-heading">
            <span className="section-index">03</span>
            <h3>Risk radar</h3>
          </div>
          <ul className="plain-list risk">
            {plan.risks.map((r, i) => {
              const idx = take()
              return idx < reveal ? <li key={i}><AlertTriangle size={14} /> {r}</li> : null
            })}
          </ul>
        </section>
        <section className="doc-section compact">
          <div className="section-heading">
            <span className="section-index">04</span>
            <h3>Field notes</h3>
          </div>
          <ul className="plain-list tip">
            {plan.tips.map((t, i) => {
              const idx = take()
              return idx < reveal ? <li key={i}><Lightbulb size={14} /> {t}</li> : null
            })}
          </ul>
        </section>
      </div>

      <footer className="plan-footer">
        <div className="footer-meta">
          <WifiOff size={13} /> Generated offline · {plan.duration} · {plan.hours}h blocks · {plan.level} level
        </div>
        <div className="footer-actions">
          <button className="icon-btn" onClick={onCopy} title="Copy as Markdown"><Copy size={15} /></button>
          <button className="icon-btn" onClick={onDownload} title="Download .md"><Download size={15} /></button>
          <button className="icon-btn" onClick={onRegenerate} title="Regenerate"><RotateCcw size={15} /></button>
        </div>
        {reveal < total && <div className="reveal-hint">Rendering {reveal}/{total}…</div>}
      </footer>
    </article>
  )
}

function SettingsModal({ settings, onChange, onClose, onClear }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="modal-kicker">ENGINE CONFIG</span>
            <h3>Model settings</h3>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={17} /></button>
        </div>

        <div className="engine-banner">
          <Cpu size={20} />
          <div>
            <strong>PLAN-AI / local-v1</strong>
            <span>Runs in your browser. Zero requests sent anywhere.</span>
          </div>
          <span className="live-dot" />
        </div>

        <label className="field">
          <span>Default duration <em>{settings.days || 'auto'} days</em></span>
          <input type="number" min="7" max="730" placeholder="Auto-detect from prompt" value={settings.days}
            onChange={(e) => onChange({ ...settings, days: e.target.value })} />
        </label>

        <label className="field">
          <span>Focus hours per block <em>{settings.hours}h</em></span>
          <input type="range" min="0.5" max="6" step="0.5" value={settings.hours}
            onChange={(e) => onChange({ ...settings, hours: Number(e.target.value) })} />
        </label>

        <label className="field">
          <span>Experience level</span>
          <select value={settings.level} onChange={(e) => onChange({ ...settings, level: e.target.value })}>
            <option value="adaptive">Adaptive (detect from prompt)</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </label>

        <div className="toggle-row">
          <div><ShieldOff size={16} /><span><strong>Unrestricted mode</strong><small>No topic filters. Every prompt gets a plan.</small></span></div>
          <span className="switch on"><i /></span>
        </div>
        <div className="toggle-row">
          <div><WifiOff size={16} /><span><strong>Local inference only</strong><small>No API key, no external endpoint.</small></span></div>
          <span className="switch on"><i /></span>
        </div>

        <button className="danger-btn" onClick={onClear}><Trash2 size={15} /> Clear saved plans & settings</button>
      </div>
    </div>
  )
}

export default function App() {
  const [input, setInput] = useState('')
  const [plan, setPlan] = useState(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState(0)
  const [reveal, setReveal] = useState(0)
  const [history, setHistory] = useState(() => loadJSON('planai.history', []))
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...loadJSON('planai.settings', {}) }))
  const [showSettings, setShowSettings] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')

  const timeouts = useRef([])
  const interval = useRef(null)
  const toastTimer = useRef(null)
  const textarea = useRef(null)

  useEffect(() => {
    try { localStorage.setItem('planai.history', JSON.stringify(history)) } catch { /* storage unavailable */ }
  }, [history])
  useEffect(() => {
    try { localStorage.setItem('planai.settings', JSON.stringify(settings)) } catch { /* storage unavailable */ }
  }, [settings])

  useEffect(() => () => {
    timeouts.current.forEach(clearTimeout)
    if (interval.current) clearInterval(interval.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
  }, [])

  const notify = useCallback((msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }, [])

  const startReveal = useCallback((nextPlan) => {
    const total = nextPlan.phases.length + nextPlan.milestones.length + nextPlan.risks.length + nextPlan.tips.length
    if (interval.current) clearInterval(interval.current)
    let n = 0
    setReveal(0)
    interval.current = setInterval(() => {
      n += 1
      setReveal(n)
      if (n >= total) {
        clearInterval(interval.current)
        interval.current = null
      }
    }, 65)
  }, [])

  const generate = useCallback((text) => {
    const value = String(text || '').trim()
    if (!value || loading) return
    timeouts.current.forEach(clearTimeout)
    timeouts.current = []
    if (interval.current) clearInterval(interval.current)

    setPrompt(value)
    setInput('')
    setPlan(null)
    setLoading(true)
    setStage(0)
    setReveal(0)
    setSidebarOpen(false)

    const finish = (nextPlan) => {
      timeouts.current.forEach(clearTimeout)
      timeouts.current = []
      setPlan(nextPlan)
      setLoading(false)
      setStage(THINKING.length - 1)
      setHistory((prev) => [nextPlan, ...prev.filter((p) => p.id !== nextPlan.id)].slice(0, 30))
      startReveal(nextPlan)
    }

    const nextPlan = generatePlan(value, {
      days: settings.days ? Number(settings.days) : undefined,
      hours: settings.hours,
      level: settings.level,
    })

    THINKING.forEach((_, i) => {
      timeouts.current.push(setTimeout(() => setStage(i), i * 300))
    })

    timeouts.current.push(setTimeout(() => finish(nextPlan), THINKING.length * 300 + 250))
  }, [loading, settings, startReveal])

  const openPlan = useCallback((saved) => {
    timeouts.current.forEach(clearTimeout)
    if (interval.current) clearInterval(interval.current)
    setPrompt(saved.input)
    setPlan(saved)
    setLoading(false)
    setSidebarOpen(false)
    setReveal(9999)
  }, [])

  const newPlan = useCallback(() => {
    timeouts.current.forEach(clearTimeout)
    if (interval.current) clearInterval(interval.current)
    setPlan(null)
    setPrompt('')
    setInput('')
    setLoading(false)
    setSidebarOpen(false)
    setTimeout(() => textarea.current?.focus(), 50)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        newPlan()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [newPlan])

  const copyMarkdown = useCallback(async () => {
    if (!plan) return
    const text = planToMarkdown(plan)
    try {
      await navigator.clipboard.writeText(text)
      notify('Plan copied as Markdown')
    } catch {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
      notify('Plan copied as Markdown')
    }
  }, [plan, notify])

  const downloadMarkdown = useCallback(() => {
    if (!plan) return
    const blob = new Blob([planToMarkdown(plan)], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${plan.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.md`
    a.click()
    URL.revokeObjectURL(url)
    notify('Markdown file downloaded')
  }, [plan, notify])

  const clearAll = useCallback(() => {
    setHistory([])
    setSettings(DEFAULT_SETTINGS)
    setShowSettings(false)
    newPlan()
    notify('Local data cleared')
  }, [newPlan, notify])

  const groupedHistory = useMemo(() => {
    const groups = { Today: [], Earlier: [] }
    const today = new Date().toDateString()
    history.forEach((p) => {
      groups[new Date(p.createdAt).toDateString() === today ? 'Today' : 'Earlier'].push(p)
    })
    return groups
  }, [history])

  const composer = (
    <div className="composer-wrap">
      <div className="composer-inner">
        <div className="composer card">
          <textarea
            ref={textarea}
            value={input}
            rows={2}
            placeholder="What do you want a plan for?  e.g. Learn Japanese in 4 months"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                generate(input)
              }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                generate(input)
              }
            }}
          />
          <div className="composer-foot">
            <div className="composer-hints">
              <span><Zap size={12} /> Enter to generate</span>
              <span className="hide-sm"><ShieldOff size={12} /> Unrestricted</span>
              <span className="hide-sm"><WifiOff size={12} /> Offline</span>
            </div>
            <button className="send-btn" onClick={() => generate(input)} disabled={!input.trim() || loading}>
              {loading ? <span className="spinner" /> : <ArrowUp size={18} />}
            </button>
          </div>
        </div>
        <div className="composer-note">PLAN AI makes plans for any goal you give it. Everything runs locally — no key, no account, no telemetry.</div>
      </div>
    </div>
  )

  return (
    <div className="app">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="icon-btn mobile-close" onClick={() => setSidebarOpen(false)}><X size={17} /></button>
        </div>

        <button className="new-plan-btn" onClick={newPlan}>
          <Plus size={16} /> New plan <span>⌘N</span>
        </button>

        <div className="sidebar-section">
          <div className="sidebar-label"><History size={13} /> RECENT PLANS</div>
          {history.length === 0 ? (
            <div className="empty-history">Your generated plans will appear here.</div>
          ) : (
            Object.entries(groupedHistory).map(([label, items]) => items.length > 0 && (
              <div key={label} className="history-group">
                <div className="history-day">{label}</div>
                {items.map((p) => {
                  const Icon = DOMAIN_ICONS[p.domain] || Compass
                  return (
                    <button key={p.id} className={`history-item ${plan?.id === p.id ? 'active' : ''}`} onClick={() => openPlan(p)}>
                      <span className="history-icon" style={{ color: p.accent }}><Icon size={14} /></span>
                      <span className="history-text">{p.subject}</span>
                      <ChevronRight size={13} className="history-chevron" />
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="engine-status">
            <span className="pulse-dot" />
            <div><strong>Engine online</strong><small>local-v1 · {history.length} plans saved</small></div>
          </div>
          <button className="settings-link" onClick={() => setShowSettings(true)}><Settings size={15} /> Model settings</button>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <main className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setSidebarOpen(true)}><Menu size={18} /></button>
          <div className="topbar-title">
            <strong>PLAN AI</strong>
            <span>/</span>
            <span>{plan ? plan.domainLabel : 'Planner'}</span>
          </div>
          <div className="topbar-badges">
            <span className="badge"><ShieldOff size={12} /> NO RESTRICTIONS</span>
            <span className="badge"><WifiOff size={12} /> NO API KEY</span>
            <span className="badge accent"><Cpu size={12} /> ON-DEVICE</span>
          </div>
          <button className="icon-btn top-settings" onClick={() => setShowSettings(true)} title="Settings"><Settings size={17} /></button>
        </header>

        <div className="scroll-area">
          {!plan && !loading ? (
            <section className="welcome">
              <div className="hero-glow" />
              <div className="hero-kicker"><span className="pulse-dot" /> LOCAL MODEL READY · V1</div>
              <h1>Turn any goal into<br /><span>a plan that moves.</span></h1>
              <p className="hero-sub">
                PLAN AI is a self-contained planning model that runs right here in your browser.
                No API key. No account. No cloud. No content gatekeeping. Just structured, actionable roadmaps.
              </p>

              <div className="hero-features">
                <div className="feature"><span className="feature-icon cyan"><Cpu size={17} /></span><div><strong>Own model</strong><small>Custom local inference engine</small></div></div>
                <div className="feature"><span className="feature-icon violet"><ShieldOff size={17} /></span><div><strong>Unrestricted</strong><small>Every prompt gets an answer</small></div></div>
                <div className="feature"><span className="feature-icon green"><Zap size={17} /></span><div><strong>Instant</strong><small>No network round-trips</small></div></div>
              </div>

              <div className="examples">
                <div className="examples-label">TRY ONE OF THESE</div>
                <div className="example-list">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => { setInput(ex); textarea.current?.focus() }} className="example-chip">
                      {ex} <ChevronRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : (
            <section className="conversation">
              <div className="prompt-bubble">
                <span className="prompt-avatar">YOU</span>
                <p>{prompt}</p>
              </div>
              {loading ? <Thinking stage={stage} /> : plan && (
                <PlanDocument
                  plan={plan}
                  reveal={reveal}
                  onCopy={copyMarkdown}
                  onDownload={downloadMarkdown}
                  onRegenerate={() => generate(prompt)}
                />
              )}
            </section>
          )}
        </div>

        {composer}
      </main>

      {showSettings && (
        <SettingsModal settings={settings} onChange={setSettings} onClose={() => setShowSettings(false)} onClear={clearAll} />
      )}
      {toast && <div className="toast"><Check size={14} /> {toast}</div>}
    </div>
  )
}
