/**
 * PLAN AI — local inference engine (v1)
 * -------------------------------------
 * Runs entirely in the browser. No API key, no network calls, no cloud
 * moderation layer. Input is parsed into an intent + constraints, then a
 * domain-specific planner assembles a structured execution roadmap.
 */

const DOMAINS = {
  study: {
    label: 'Learning',
    icon: 'book',
    accent: '#6ee7f5',
    keywords: ['learn', 'study', 'course', 'exam', 'revision', 'homework', 'degree', 'certification', 'math', 'physics', 'language', 'spanish', 'english', 'coding bootcamp', 'memorize', 'tutorial'],
    defaultDays: 60,
    phases: [
      { name: 'Map the terrain', focus: 'Scope + baseline', tasks: [
        'Define exactly what "done" means for {subject} and write it in one sentence.',
        'Collect the best single resource (course, book, or syllabus) and stop searching after that.',
        'Take a 15-minute baseline test to find what you already know.',
        'Split the syllabus into {phaseCount} topic blocks and assign one to each phase.',
      ]},
      { name: 'Build foundations', focus: 'Core concepts', tasks: [
        'Study one topic block per {unit} using active recall, not re-reading.',
        'Write every new idea in your own words inside a single markdown notebook.',
        'Do {hours}h of focused practice daily with a timer and zero tab switching.',
        'End each session with 5 flashcards of the things you got wrong.',
      ]},
      { name: 'Deliberate practice', focus: 'Weak spots', tasks: [
        'Rank your topics by difficulty and spend 60% of time on the bottom two.',
        'Complete {practiceCount} timed problem sets without notes.',
        'Explain the hardest concept out loud as if teaching a beginner.',
        'Review all missed questions from the previous {unit}.',
      ]},
      { name: 'Consolidate + prove it', focus: 'Test readiness', tasks: [
        'Run a full mock test under real conditions and score it honestly.',
        'Rebuild your notes from memory only, then diff against the originals.',
        'Create a one-page cheat sheet you could reproduce from scratch.',
        'Schedule the next review {reviewIn} to prevent decay.',
      ]},
    ],
    milestones: ['Baseline score recorded', 'First topic block completed', 'Half of syllabus covered', 'Mock test passed target'],
    tips: ['Spaced repetition beats cramming every time.', 'If you cannot explain it simply, you do not know it yet.', 'Consistency at low intensity beats rare heroic sessions.'],
    risks: ['Resource hopping — pick one and stay.', 'Passive reading disguised as studying.', 'Ignoring weak areas because they feel bad.'],
  },
  fitness: {
    label: 'Fitness',
    icon: 'activity',
    accent: '#f472b6',
    keywords: ['gym', 'workout', 'fitness', 'muscle', 'weight loss', 'lose weight', 'run', 'marathon', 'cardio', 'strength', 'abs', 'bodyweight', 'yoga', 'training', 'health', 'diet'],
    defaultDays: 90,
    phases: [
      { name: 'Assessment', focus: 'Baseline + setup', tasks: [
        'Record starting weight, measurements, and 3 photos on day one.',
        'Pick {subject} as the primary goal and make it measurable.',
        'Learn proper form for the 5 core movements before adding load.',
        'Set a fixed workout window {hours}h daily and protect it.',
      ]},
      { name: 'Base building', focus: 'Habit + capacity', tasks: [
        'Train 3-4 times per {unit} at a difficulty you can recover from.',
        'Walk 8,000 steps daily and keep it boringly consistent.',
        'Eat protein at every meal and track intake for two weeks.',
        'Sleep 7+ hours — treat it as part of the program.',
      ]},
      { name: 'Progressive overload', focus: 'Intensity', tasks: [
        'Add one small increment (weight, reps, or time) each week.',
        'Add one interval or conditioning session per {unit}.',
        'Deload every 4th week to let joints and CNS catch up.',
        'Log every session so progress is visible, not guessed.',
      ]},
      { name: 'Peak + maintain', focus: 'Result + sustainability', tasks: [
        'Test your target metric and compare it to the baseline.',
        'Transition to the minimum sustainable version of the routine.',
        'Plan a maintenance calories strategy instead of an all-or-nothing crash.',
        'Write the next 90-day goal while momentum is high.',
      ]},
    ],
    milestones: ['Baseline captured', '4 consistent weeks', 'First measurable PR', 'Goal metric reached'],
    tips: ['The best program is the one you repeat for months.', 'Recovery is where the adaptation happens.', 'Track inputs, not just the scale.'],
    risks: ['Changing programs every week.', 'Doing too much too soon.', 'Using poor form to chase numbers.'],
  },
  business: {
    label: 'Business',
    icon: 'briefcase',
    accent: '#fbbf24',
    keywords: ['business', 'startup', 'launch', 'product', 'customer', 'revenue', 'sales', 'market', 'brand', 'company', 'saas', 'side hustle', 'freelance', 'agency', 'sell'],
    defaultDays: 90,
    phases: [
      { name: 'Discovery', focus: 'Problem + market', tasks: [
        'Write a one-sentence problem statement for {subject}.',
        'Interview 10 target users and ask about past behavior, not opinions.',
        'Research three existing alternatives and list their weakest point.',
        'Define the smallest audience that would be genuinely upset if this vanished.',
      ]},
      { name: 'Validation', focus: 'Demand proof', tasks: [
        'Build a one-page landing page with a single clear call to action.',
        'Pre-sell or collect 20 waitlist emails before building anything heavy.',
        'Set a price early — free feedback is not validation.',
        'Kill or pivot features nobody asked for.',
      ]},
      { name: 'Build the MVP', focus: 'Ship fast', tasks: [
        'List every feature, then cut 70% of it.',
        'Ship a working version in {unit} and put it in real hands.',
        'Instrument one metric that tells you if anyone cares.',
        'Fix only the top three friction points from real usage.',
      ]},
      { name: 'Launch + iterate', focus: 'Growth loop', tasks: [
        'Write the launch story: problem, insight, result.',
        'Distribute where your audience already is, not everywhere.',
        'Turn every support conversation into product copy.',
        'Review numbers weekly and double down on the one channel that works.',
      ]},
    ],
    milestones: ['10 interviews done', 'First 20 signups', 'MVP in users hands', 'First paying customer'],
    tips: ['A problem with no pain is not a business.', 'Distribution matters more than polish at the start.', 'Talk to users after every release.'],
    risks: ['Building in isolation for months.', 'Treating compliments as demand.', 'Premature scaling spend.'],
  },
  coding: {
    label: 'Engineering',
    icon: 'code',
    accent: '#a78bfa',
    keywords: ['code', 'coding', 'program', 'developer', 'javascript', 'python', 'react', 'web app', 'api', 'software', 'algorithm', 'github', 'frontend', 'backend', 'build app'],
    defaultDays: 75,
    phases: [
      { name: 'Environment + fundamentals', focus: 'Setup + syntax', tasks: [
        'Set up a clean dev environment and one editor you will actually use.',
        'Learn the core syntax of {subject} by building tiny scripts.',
        'Master the command line basics: navigate, run, and debug.',
        'Create a GitHub account and commit something every day.',
      ]},
      { name: 'First real builds', focus: 'Apply immediately', tasks: [
        'Build 3 small projects with no tutorial, starting from a blank file.',
        'Read documentation daily instead of copying answers.',
        'Learn to debug with logs and breakpoints before asking for help.',
        'Write a README for each project explaining decisions.',
      ]},
      { name: 'Depth + systems', focus: 'Architecture', tasks: [
        'Study data structures and patterns relevant to {subject}.',
        'Refactor an old project to be cleaner and testable.',
        'Add tests to one project and make them pass in CI.',
        'Deploy one project to a public URL.',
      ]},
      { name: 'Portfolio + ship', focus: 'Proof of work', tasks: [
        'Polish your top 3 projects with screenshots and live links.',
        'Write technical posts explaining one hard thing you solved.',
        'Contribute one small fix to an open-source repo.',
        'Set the next learning target based on the gap you found.',
      ]},
    ],
    milestones: ['First commit', '3 projects shipped', 'Something deployed live', 'Portfolio page published'],
    tips: ['Build more, watch less.', 'Shipping beats perfection for learning.', 'Read other peoples code constantly.'],
    risks: ['Tutorial hell.', 'Switching languages before finishing one.', 'Avoiding debugging.'],
  },
  travel: {
    label: 'Travel',
    icon: 'map',
    accent: '#34d399',
    keywords: ['travel', 'trip', 'vacation', 'visit', 'flight', 'hotel', 'itinerary', 'backpack', 'tour', 'holiday', 'road trip', 'country', 'city'],
    defaultDays: 45,
    phases: [
      { name: 'Define the trip', focus: 'Where + why', tasks: [
        'Decide the single main purpose of going to {subject}.',
        'Set hard dates and a total budget ceiling.',
        'Pick a home base and map the top 5 must-see places.',
        'Check passport, visa, and entry requirements immediately.',
      ]},
      { name: 'Book the big pieces', focus: 'Logistics', tasks: [
        'Book transport first — it is the biggest price swing.',
        'Reserve accommodation with free cancellation where possible.',
        'Group activities by neighborhood to avoid wasted travel time.',
        'Buy travel insurance and store copies of documents offline.',
      ]},
      { name: 'Prepare', focus: 'Packing + readiness', tasks: [
        'Build a packing list and cut it by a third.',
        'Download offline maps and translation packs.',
        'Sort payments: one card, some cash, no relying on one method.',
        'Share your itinerary with someone you trust.',
      ]},
      { name: 'Go + capture', focus: 'Experience', tasks: [
        'Keep one flexible day with nothing scheduled.',
        'Try one thing you would not do at home.',
        'Take photos, then put the phone away for the good parts.',
        'Write a short trip log while it is still fresh.',
      ]},
    ],
    milestones: ['Dates locked', 'Transport booked', 'Packing complete', 'Trip underway'],
    tips: ['Plan the outline, leave the middle loose.', 'Learn ten local phrases before you arrive.', 'The best days are rarely the planned ones.'],
    risks: ['Over-scheduling every hour.', 'Booking non-refundable too early.', 'Forgetting offline backups.'],
  },
  finance: {
    label: 'Finance',
    icon: 'wallet',
    accent: '#60a5fa',
    keywords: ['money', 'save', 'budget', 'invest', 'debt', 'finance', 'salary', 'savings', 'retire', 'stock', 'expense', 'frugal', 'net worth'],
    defaultDays: 120,
    phases: [
      { name: 'Audit', focus: 'See the truth', tasks: [
        'List every account, balance, and recurring payment in one place.',
        'Track all spending for 30 days without judging it.',
        'Calculate your real monthly surplus for {subject}.',
        'Write down the exact number you are aiming for.',
      ]},
      { name: 'Stop the leaks', focus: 'Cash flow', tasks: [
        'Cancel or downgrade three subscriptions you barely use.',
        'Automate a transfer to savings on payday.',
        'Set a spending cap for the two categories that leak most.',
        'Build a small emergency buffer before anything else.',
      ]},
      { name: 'Accelerate', focus: 'Debt + growth', tasks: [
        'Pick a payoff method and apply every extra dollar to one target.',
        'Increase income with one specific, bounded side project.',
        'Automate contributions so motivation is irrelevant.',
        'Review fees and move money to lower-cost options.',
      ]},
      { name: 'Compound + review', focus: 'Long game', tasks: [
        'Rebalance once per quarter, not daily.',
        'Track net worth monthly on the same date.',
        'Raise your automatic savings rate by 1%.',
        'Write the next 12-month target now.',
      ]},
    ],
    milestones: ['Full spending audit', '30-day tracking done', 'Emergency buffer hit', 'Net worth baseline set'],
    tips: ['You cannot manage what you do not measure.', 'Automate everything you can.', 'Boring and consistent wins.'],
    risks: ['Lifestyle inflation.', 'Checking investments too often.', 'No emergency cushion.'],
  },
  creative: {
    label: 'Creative',
    icon: 'sparkles',
    accent: '#fb923c',
    keywords: ['write', 'writing', 'design', 'draw', 'art', 'music', 'video', 'podcast', 'novel', 'song', 'photography', 'creative', 'portfolio', 'content'],
    defaultDays: 60,
    phases: [
      { name: 'Collect input', focus: 'Reference library', tasks: [
        'Gather 20 examples of work you wish you made for {subject}.',
        'Write down what specifically makes three of them great.',
        'Set a daily creation slot of {hours}h, no exceptions.',
        'Define a finishing rule so projects do not live forever as drafts.',
      ]},
      { name: 'Skill drills', focus: 'Technique', tasks: [
        'Copy one reference study per {unit} to learn the mechanics.',
        'Practice the weakest technical skill in short focused bursts.',
        'Make 10 rough versions before allowing yourself one polished one.',
        'Keep a swipe file of ideas, lines, and shapes.',
      ]},
      { name: 'First full piece', focus: 'Finish', tasks: [
        'Start the piece before you feel ready.',
        'Set an ugly first draft deadline and honor it.',
        'Get feedback from one trusted person, not a crowd.',
        'Revise once for structure, once for detail, then stop.',
      ]},
      { name: 'Release + repeat', focus: 'Audience', tasks: [
        'Publish the finished piece somewhere real.',
        'Write a short note about what you learned making it.',
        'Start the next piece the same week.',
        'Build a simple recurring schedule you can sustain.',
      ]},
    ],
    milestones: ['Reference library built', '10 drills complete', 'First draft finished', 'Piece published'],
    tips: ['Quantity first, quality follows.', 'Finished beats perfect.', 'Make the thing you want to exist.'],
    risks: ['Endless research.', 'Comparing draft one to someone’s final work.', 'Never shipping.'],
  },
  daily: {
    label: 'Lifestyle',
    icon: 'sun',
    accent: '#facc15',
    keywords: ['routine', 'habit', 'morning', 'organized', 'clean', 'productivity', 'focus', 'procrastinate', 'schedule', 'discipline', 'life', 'better'],
    defaultDays: 30,
    phases: [
      { name: 'Observe', focus: 'Current state', tasks: [
        'Log how you spend a normal day for three days.',
        'Identify the two moments where {subject} usually breaks down.',
        'Write down the one habit that would make everything else easier.',
        'Choose a tiny version so small it feels silly to skip.',
      ]},
      { name: 'Install', focus: 'Minimal habit', tasks: [
        'Attach the new habit to an existing daily action.',
        'Do it at the same time and in the same place every day.',
        'Use a visible streak tracker — never miss twice.',
        'Keep the habit under {hours}h so it survives bad days.',
      ]},
      { name: 'Expand', focus: 'Stack + tune', tasks: [
        'Add a second small habit only after the first is automatic.',
        'Remove one recurring source of friction from your environment.',
        'Set a weekly review slot to adjust what is not working.',
        'Protect one block of deep focus per {unit}.',
      ]},
      { name: 'Maintain', focus: 'Identity', tasks: [
        'Rewrite the habit as an identity statement.',
        'Make the environment do the reminding.',
        'Plan a fallback routine for travel and illness.',
        'Pick the next area to improve.',
      ]},
    ],
    milestones: ['3-day log complete', '7-day streak', 'Habit feels automatic', 'Second habit stacked'],
    tips: ['Environment beats willpower.', 'Shrink the habit, not the ambition.', 'Never miss twice.'],
    risks: ['Changing too much at once.', 'All-or-nothing thinking.', 'Relying on motivation.'],
  },
  general: {
    label: 'General',
    icon: 'compass',
    accent: '#6ee7f5',
    keywords: [],
    defaultDays: 45,
    phases: [
      { name: 'Clarify', focus: 'Define the target', tasks: [
        'Write a concrete definition of success for {subject}.',
        'List what you already have and what is missing.',
        'Set a realistic deadline and write it down.',
        'Identify the single biggest constraint.',
      ]},
      { name: 'Design', focus: 'Choose the path', tasks: [
        'Brainstorm three approaches without filtering.',
        'Pick the one with the lowest cost of being wrong.',
        'Break it into the smallest testable actions.',
        'Schedule the first action into your calendar.',
      ]},
      { name: 'Execute', focus: 'Momentum', tasks: [
        'Work in focused blocks of {hours}h with no interruptions.',
        'Ship something tangible every {unit}.',
        'Review progress weekly and cut what is not moving.',
        'Ask for feedback early rather than late.',
      ]},
      { name: 'Review', focus: 'Lock the result', tasks: [
        'Compare the outcome against your original definition of success.',
        'Write down what worked and what you would skip next time.',
        'Turn the win into a repeatable checklist.',
        'Set the next goal before momentum fades.',
      ]},
    ],
    milestones: ['Success defined', 'Approach chosen', 'First result shipped', 'Outcome reviewed'],
    tips: ['Start before you feel ready.', 'Small visible progress beats invisible perfection.', 'Write decisions down.'],
    risks: ['Vague goals.', 'Waiting for perfect information.', 'No review checkpoint.'],
  },
}

const STOPWORDS = new Set(['a', 'an', 'the', 'my', 'me', 'i', 'to', 'of', 'in', 'on', 'for', 'with', 'and', 'how', 'do', 'can', 'want', 'need', 'help', 'make', 'please', 'from', 'about', 'into', 'that', 'this', 'is', 'are', 'be', 'get', 'up', 'out', 'by', 'at', 'as', 'it'])

const LEAD_VERBS = ['learn', 'study', 'plan', 'build', 'start', 'launch', 'create', 'make', 'go', 'travel', 'prepare', 'write', 'get', 'become', 'organize', 'save', 'lose', 'run', 'train', 'design', 'set up', 'improve', 'quit', 'stop', 'fix', 'grow', 'open', 'find', 'do']

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function titleCase(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

function detectDomain(text) {
  const t = ` ${text.toLowerCase()} `
  let best = 'general'
  let bestScore = 0
  for (const [key, cfg] of Object.entries(DOMAINS)) {
    let score = 0
    for (const kw of cfg.keywords) {
      if (t.includes(` ${kw} `) || t.includes(kw)) score += kw.includes(' ') ? 3 : 1
    }
    if (score > bestScore) {
      bestScore = score
      best = key
    }
  }
  return best
}

function extractDays(text) {
  const t = text.toLowerCase()
  const m = t.match(/(\d+)\s*(day|week|month|year)s?/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  const unit = m[2]
  const mult = unit === 'day' ? 1 : unit === 'week' ? 7 : unit === 'month' ? 30 : 365
  return Math.max(7, Math.min(730, n * mult))
}

function extractHours(text) {
  const m = text.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\s*(?:a|per|\/)?\s*(?:day|daily)?/)
  if (!m) return null
  return Math.max(0.25, Math.min(12, parseFloat(m[1])))
}

function extractLevel(text) {
  const t = text.toLowerCase()
  if (t.includes('beginner') || t.includes('from scratch') || t.includes('never') || t.includes('zero')) return 'beginner'
  if (t.includes('advanced') || t.includes('expert') || t.includes('professional')) return 'advanced'
  if (t.includes('intermediate') || t.includes('some experience')) return 'intermediate'
  return 'adaptive'
}

function extractSubject(text) {
  let s = text.trim().replace(/[?.!]+$/, '').replace(/^(hey|hi|ok|so|please)\s+/i, '')
  const lower = s.toLowerCase()
  for (const v of LEAD_VERBS) {
    if (lower.startsWith(v + ' ')) {
      s = s.slice(v.length).trim()
      break
    }
  }
  s = s.replace(/^(me|myself|us)\s+/i, '')
  let words = s.split(/\s+/).filter((w) => !STOPWORDS.has(w.toLowerCase()))
  if (!words.length) words = s.split(/\s+/)
  // keep it compact but meaningful
  return words.slice(0, 6).join(' ').replace(/^[A-Z]/, (c) => c.toUpperCase()) || 'your goal'
}

function humanDuration(days) {
  if (days < 14) return `${days} days`
  if (days < 60) return `${Math.round(days / 7)} weeks`
  if (days < 365) return `${Math.round(days / 30)} months`
  return `${(days / 365).toFixed(1)} years`
}

function unitLabel(days) {
  if (days <= 21) return 'day'
  if (days <= 120) return 'week'
  return 'month'
}

function fill(template, ctx) {
  return template
    .replaceAll('{subject}', ctx.subject)
    .replaceAll('{duration}', ctx.duration)
    .replaceAll('{hours}', ctx.hours)
    .replaceAll('{unit}', ctx.unit)
    .replaceAll('{phaseCount}', String(ctx.phaseCount))
    .replaceAll('{practiceCount}', String(ctx.practiceCount))
    .replaceAll('{reviewIn}', ctx.reviewIn)
}

export function generatePlan(rawInput, overrides = {}) {
  const input = String(rawInput || '').trim()
  const domainKey = detectDomain(input)
  const cfg = DOMAINS[domainKey]
  const days = overrides.days || extractDays(input) || cfg.defaultDays
  const hours = extractHours(input) || overrides.hours || 1
  const level = overrides.level || extractLevel(input)
  const subject = extractSubject(input) || cfg.label
  const unit = unitLabel(days)
  const rand = rng(hash(input.toLowerCase() + domainKey + days))

  const phaseCount = days > 150 ? 5 : 4
  const basePhases = cfg.phases.slice(0, phaseCount)
  const phases = basePhases.map((p, i) => ({
    id: `phase-${i}`,
    index: i,
    name: p.name,
    focus: p.focus,
    share: [20, 30, 30, 20][i] || 20,
    tasks: p.tasks.map((task) => fill(task, {
      subject, duration: humanDuration(days), hours, unit,
      phaseCount: basePhases.length,
      practiceCount: Math.max(3, Math.round(days / 14)),
      reviewIn: unit === 'day' ? '3 days' : unit === 'week' ? '2 weeks' : '1 month',
    })),
  }))

  const totalTasks = phases.reduce((sum, p) => sum + p.tasks.length, 0)
  const estHours = Math.round(totalTasks * hours * 1.6)
  const confidence = Math.min(98, 78 + Math.round(rand() * 18) + (days ? 3 : 0))

  const title = titleCase(`${cfg.label} plan: ${subject}`.replace(/\s+/g, ' ')).slice(0, 64)
  const summary = `A ${humanDuration(days).toLowerCase()} roadmap for ${subject}, built around ${hours}h focused blocks ${unit === 'day' ? 'each day' : `per ${unit}`}. ${cfg.label} mode engaged at ${level} level. No gatekeeping, no cloud round-trip — just the next moves.`

  return {
    id: `plan_${Date.now()}_${hash(input).toString(36)}`,
    createdAt: new Date().toISOString(),
    input,
    domain: domainKey,
    domainLabel: cfg.label,
    accent: cfg.accent,
    title,
    summary,
    subject,
    level,
    days,
    duration: humanDuration(days),
    hours,
    unit,
    confidence,
    phases,
    milestones: cfg.milestones.slice(0, 4),
    tips: cfg.tips,
    risks: cfg.risks,
    stats: {
      phases: phases.length,
      tasks: totalTasks,
      hours: estHours,
      confidence,
    },
    model: 'PLAN-AI / local-v1',
  }
}

export function planToMarkdown(plan) {
  const lines = [
    `# ${plan.title}`,
    '',
    plan.summary,
    '',
    `> Model: ${plan.model} · Confidence: ${plan.confidence}% · ${plan.duration}`,
    '',
    '## Execution roadmap',
    '',
  ]
  plan.phases.forEach((phase, i) => {
    lines.push(`### ${i + 1}. ${phase.name} — ${phase.focus}`)
    phase.tasks.forEach((task) => lines.push(`- [ ] ${task}`))
    lines.push('')
  })
  lines.push('## Milestones', '')
  plan.milestones.forEach((m) => lines.push(`- [ ] ${m}`))
  lines.push('', '## Watch out for', '')
  plan.risks.forEach((r) => lines.push(`- ${r}`))
  lines.push('', '## Notes', '')
  plan.tips.forEach((t) => lines.push(`- ${t}`))
  return lines.join('\n')
}

export const EXAMPLES = [
  'Learn Spanish in 3 months',
  'Build a SaaS side hustle with 2h a day',
  'Get fit and lose 10kg in 6 months',
  'Become a React developer from scratch',
  'Plan a 2 week trip to Japan',
  'Organize my life and stop procrastinating',
]
