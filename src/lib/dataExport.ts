import { supabase } from './supabase'
import { getBriefingProfile } from './briefingProfile'
import { getFamilyMembers, ageDecimal } from './family'
import { getAnchorEvent, daysUntilDate } from './anchorEvents'
import { getTrainingGoals, getCurrentTrainingWeek } from './training'
import { getAllPrograms } from './program-tracker'
import { getProjects, getProjectWithMilestones, type Project } from './projects'

// Personal data export → Markdown brief, intended for upload into a
// Claude conversation. Self-contained: identity, anchors, all major
// time-series, training plan, projects, recent reviews, briefings.
//
// time_series_window controls the lookback for activities, recovery,
// body metrics, daily plans, and briefings. 'all' returns everything.

export interface ExportOptions {
  windowDays: number | 'all'
}

export async function exportToMarkdown(userId: string, opts: ExportOptions): Promise<string> {
  const today = new Date()
  const todayStr = today.toISOString().substring(0, 10)
  const windowLabel = opts.windowDays === 'all' ? 'all-time' : `last ${opts.windowDays}d`

  // ── Fetch in parallel ───────────────────────────────────────────────────
  const sinceDateStr = opts.windowDays === 'all'
    ? '1970-01-01'
    : new Date(today.getTime() - opts.windowDays * 86_400_000).toISOString().substring(0, 10)

  const [
    profile, family, wlw, laborDay,
    goals, currentWeek, programs,
    careerProjects, allProjects,
    activitiesRes, bodyMetricsRes, recoveryRes, dailyPlansRes,
    briefingsRes,
  ] = await Promise.all([
    getBriefingProfile(userId).catch(() => ({})),
    getFamilyMembers(userId).catch(() => []),
    getAnchorEvent(userId, 'wlw').catch(() => null),
    getAnchorEvent(userId, 'labor_day').catch(() => null),
    getTrainingGoals(userId).catch(() => []),
    getCurrentTrainingWeek(userId).catch(() => null),
    getAllPrograms(userId).catch(() => []),
    getProjects(userId, 'career').catch(() => []),
    getProjects(userId).catch(() => []),
    supabase
      .from('activities')
      .select('activity_date, activity_type, title, distance_miles, duration_seconds, elevation_feet, avg_hr, notes')
      .eq('user_id', userId)
      .gte('activity_date', sinceDateStr)
      .order('activity_date', { ascending: false }),
    supabase
      .from('body_metrics')
      .select('measured_at, weight_lbs, body_fat_pct, muscle_mass_pct')
      .eq('user_id', userId)
      .gte('measured_at', sinceDateStr)
      .order('measured_at', { ascending: false }),
    supabase
      .from('recovery_signals')
      .select('signal_date, rhr, hrv_ms, sleep_duration_hours, drinks_consumed, recovery_score, recovery_tier, steps_count')
      .eq('user_id', userId)
      .gte('signal_date', sinceDateStr)
      .order('signal_date', { ascending: false }),
    supabase
      .from('daily_plans')
      .select('plan_date, family_creative_done, family_creative_note, home_done, home_note, career_done, career_note, projects_done, projects_note, mood_score, thinking_prompt, thinking_prompt_answer')
      .eq('user_id', userId)
      .gte('plan_date', sinceDateStr)
      .order('plan_date', { ascending: false }),
    supabase
      .from('daily_plans')
      .select('plan_date, morning_briefing, weekend_briefing')
      .eq('user_id', userId)
      .gte('plan_date', sinceDateStr)
      .or('morning_briefing.not.is.null,weekend_briefing.not.is.null')
      .order('plan_date', { ascending: false })
      .limit(14),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activities = ((activitiesRes as any).data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bodyMetrics = ((bodyMetricsRes as any).data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recovery = ((recoveryRes as any).data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dailyPlans = ((dailyPlansRes as any).data ?? []) as any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const briefings = ((briefingsRes as any).data ?? []) as any[]

  // Career goes in its own section; everything else is rolled into Personal.
  const careerIds = new Set(careerProjects.map(p => p.id))
  const otherProjects = allProjects.filter(p => !careerIds.has(p.id))
  const careerDetail = await Promise.all(
    careerProjects.map(p => getProjectWithMilestones(p.id).catch(() => null)),
  )
  const projectsDetail = await Promise.all(
    otherProjects.map(p => getProjectWithMilestones(p.id).catch(() => null)),
  )

  // ── Build the Markdown ──────────────────────────────────────────────────
  const lines: string[] = []
  const w = (s: string) => lines.push(s)

  w(`# adadv3nture — Mission Control Export`)
  w(``)
  w(`_Exported ${todayStr} · time-series window: ${windowLabel}_`)
  w(``)
  w(`> You're my coach across body, training, career, family, and personal projects. This file is a snapshot of my current state and recent data. Use it to answer questions about trends, suggest training adjustments, prioritize career moves and projects, and flag patterns I should pay attention to. When you need data outside what's here, say so; don't invent numbers.`)
  w(``)
  w(`---`)
  w(``)

  // ── Identity & profile ────────────────────────────────────────────────
  w(`## Identity & Profile`)
  w(``)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = profile
  if (p.identity) w(`- **Identity**: ${p.identity}`)
  if (p.current_focus) w(`- **Current focus**: ${p.current_focus}`)
  if (p.health_context?.length) {
    w(`- **Health context**:`)
    for (const item of p.health_context) w(`  - ${item}`)
  }
  if (p.goals?.length) {
    w(`- **Goals**:`)
    for (const item of p.goals) w(`  - ${item}`)
  }
  if (p.tone_notes?.length) {
    w(`- **Tone / how I work**:`)
    for (const item of p.tone_notes) w(`  - ${item}`)
  }
  if (p.weekend_identity) w(`- **Weekend identity**: ${p.weekend_identity}`)
  w(``)

  // ── Family ────────────────────────────────────────────────────────────
  if (family.length > 0) {
    w(`### Family`)
    w(``)
    w(`| Role | Name | Birthday | Age today | Vibe |`)
    w(`|---|---|---|---|---|`)
    for (const m of family) {
      w(`| ${m.role} | ${m.name} | ${m.birthday} | ${ageDecimal(m.birthday)}y | ${m.vibe ?? ''} |`)
    }
    w(``)
  }

  // ── Anchors ───────────────────────────────────────────────────────────
  w(`## Anchors & Deadlines`)
  w(``)
  w(`| Slug | Title | Date | Days out | Notes |`)
  w(`|---|---|---|---|---|`)
  for (const a of [wlw, laborDay].filter(Boolean)) {
    if (!a) continue
    const days = daysUntilDate(a.event_date)
    w(`| ${a.slug} | ${a.title} | ${a.event_date} | ${days >= 0 ? days : 'past'} | ${[a.location, a.notes].filter(Boolean).join(' · ')} |`)
  }
  w(``)

  // ── Training ──────────────────────────────────────────────────────────
  w(`## Training`)
  w(``)
  if (currentWeek) {
    w(`**This week** (${currentWeek.phase_label}, derived from upcoming events):`)
    w(``)
    w(`| Metric | Target |`)
    w(`|---|---|`)
    if (currentWeek.target_run_miles != null) w(`| Run miles | ${currentWeek.target_run_miles} |`)
    if (currentWeek.target_long_run_miles != null) w(`| Long run miles | ${currentWeek.target_long_run_miles} |`)
    if (currentWeek.target_cycling_miles != null) w(`| Cycling miles | ${currentWeek.target_cycling_miles} |`)
    if (currentWeek.target_strength_sessions != null) w(`| Strength sessions | ${currentWeek.target_strength_sessions} |`)
    w(``)
  }
  if (goals.length > 0) {
    w(`**Upcoming events:**`)
    w(``)
    w(`| Event | Date | Type | Distance | Location | Anchor | Status |`)
    w(`|---|---|---|---|---|---|---|`)
    for (const g of goals) {
      w(`| ${g.event_name} | ${g.event_date} | ${g.event_type} | ${g.distance_label ?? ''} | ${g.location ?? ''} | ${g.is_anchor ? '★' : ''} | ${g.status} |`)
    }
    w(``)
  }
  if (programs.length > 0) {
    w(`**Active programs:**`)
    w(``)
    for (const pr of programs) {
      w(`- ${pr.program_name}${pr.instructor ? ` (${pr.instructor})` : ''} — W${pr.current_week}D${pr.current_day} of ${pr.total_weeks ?? '?'}, last completed ${pr.last_completed_date ?? 'never'}.`)
    }
    w(``)
  }

  // ── Career projects ───────────────────────────────────────────────────
  if (careerDetail.length > 0) {
    w(`## Career Projects`)
    w(``)
    for (const cd of careerDetail) {
      if (!cd) continue
      const pp = cd.project as Project
      w(`### ${pp.title}`)
      const meta: string[] = []
      if (pp.status) meta.push(pp.status)
      if (pp.progress_pct != null) meta.push(`${pp.progress_pct}% complete`)
      if (pp.deadline_date) meta.push(`hard deadline ${pp.deadline_date}`)
      if (pp.soft_deadline_date) meta.push(`soft deadline ${pp.soft_deadline_date}`)
      if (meta.length) w(`_${meta.join(' · ')}_`)
      if (pp.description) w(``), w(pp.description)
      if (pp.next_action) w(``), w(`**Next action:** ${pp.next_action}`)
      if (cd.milestones.length > 0) {
        w(``)
        w(`**Milestones:**`)
        for (const m of cd.milestones) w(`- ${m.done ? '✓' : '·'} ${m.title}`)
      }
      if (cd.contacts.length > 0) {
        w(``)
        w(`**Contacts:**`)
        for (const c of cd.contacts) w(`- **${c.name}** — ${[c.title, c.relationship_note].filter(Boolean).join(' · ')}`)
      }
      if (cd.updates.length > 0) {
        w(``)
        w(`**Recent updates:**`)
        for (const u of cd.updates.slice(0, 8)) w(`- ${u.created_at.substring(0, 10)}: ${u.note}`)
      }
      w(``)
    }
  }

  // ── Personal projects ──────────────────────────────────────────────────
  if (projectsDetail.length > 0) {
    w(`## Personal Projects`)
    w(``)
    for (const cd of projectsDetail) {
      if (!cd) continue
      const pp = cd.project as Project
      w(`### ${pp.title}`)
      const meta: string[] = []
      if (pp.status) meta.push(pp.status)
      if (pp.progress_pct != null) meta.push(`${pp.progress_pct}% complete`)
      if (pp.deadline_date) meta.push(`deadline ${pp.deadline_date}`)
      if (meta.length) w(`_${meta.join(' · ')}_`)
      if (pp.description) w(``), w(pp.description)
      if (pp.next_action) w(``), w(`**Next action:** ${pp.next_action}`)
      if (cd.milestones.length > 0) {
        w(``)
        w(`**Milestones:**`)
        for (const m of cd.milestones) w(`- ${m.done ? '✓' : '·'} ${m.title}`)
      }
      w(``)
    }
  }

  // ── Body metrics ──────────────────────────────────────────────────────
  if (bodyMetrics.length > 0) {
    w(`## Body Metrics (Withings, ${windowLabel})`)
    w(``)
    w(`| Date | Weight (lbs) | Body fat % | Muscle % |`)
    w(`|---|---|---|---|`)
    for (const m of bodyMetrics) {
      w(`| ${m.measured_at.substring(0, 10)} | ${m.weight_lbs ?? ''} | ${m.body_fat_pct ?? ''} | ${m.muscle_mass_pct ?? ''} |`)
    }
    w(``)
  }

  // ── Recovery signals ──────────────────────────────────────────────────
  if (recovery.length > 0) {
    w(`## Recovery Signals (${windowLabel})`)
    w(``)
    w(`| Date | RHR | HRV (ms) | Sleep (h) | Drinks | Steps | Recovery score | Tier |`)
    w(`|---|---|---|---|---|---|---|---|`)
    for (const r of recovery) {
      w(`| ${r.signal_date} | ${r.rhr ?? ''} | ${r.hrv_ms ?? ''} | ${r.sleep_duration_hours ?? ''} | ${r.drinks_consumed ?? ''} | ${r.steps_count ?? ''} | ${r.recovery_score ?? ''} | ${r.recovery_tier ?? ''} |`)
    }
    w(``)
  }

  // ── Activities ────────────────────────────────────────────────────────
  if (activities.length > 0) {
    w(`## Activities (Strava, ${windowLabel})`)
    w(``)
    w(`| Date | Type | Title | Distance (mi) | Duration (min) | Elev (ft) | Avg HR |`)
    w(`|---|---|---|---|---|---|---|`)
    for (const a of activities) {
      const dur = a.duration_seconds != null ? Math.round(a.duration_seconds / 60) : ''
      w(`| ${a.activity_date} | ${a.activity_type} | ${a.title ?? ''} | ${a.distance_miles ?? ''} | ${dur} | ${a.elevation_feet ?? ''} | ${a.avg_hr ?? ''} |`)
    }
    w(``)
  }

  // ── Portfolio review ──────────────────────────────────────────────────
  if (dailyPlans.length > 0) {
    w(`## Daily Plan Review (${windowLabel})`)
    w(``)
    w(`| Date | Mood (1-5) | Career | Family | Home | Projects | Notes |`)
    w(`|---|---|---|---|---|---|---|`)
    for (const d of dailyPlans) {
      const notes = [
        d.career_note && `career: ${d.career_note}`,
        d.family_creative_note && `family: ${d.family_creative_note}`,
        d.home_note && `home: ${d.home_note}`,
        d.projects_note && `projects: ${d.projects_note}`,
      ].filter(Boolean).join(' / ')
      w(`| ${d.plan_date} | ${d.mood_score ?? ''} | ${d.career_done ? '✓' : '·'} | ${d.family_creative_done ? '✓' : '·'} | ${d.home_done ? '✓' : '·'} | ${d.projects_done ? '✓' : '·'} | ${notes} |`)
    }
    w(``)
  }

  // ── Recent briefings (full text) ──────────────────────────────────────
  if (briefings.length > 0) {
    w(`## Recent Morning Briefings`)
    w(``)
    w(`_For tone / voice calibration._`)
    w(``)
    for (const b of briefings) {
      const text = b.morning_briefing ?? b.weekend_briefing
      if (!text) continue
      w(`### ${b.plan_date}${b.weekend_briefing ? ' (weekend)' : ''}`)
      w(``)
      w(`> ${text.replace(/\n/g, '\n> ')}`)
      w(``)
    }
  }

  // ── Recent thinking prompts ───────────────────────────────────────────
  const thinkingPromptAnswers = dailyPlans
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((d: any) => d.thinking_prompt && d.thinking_prompt_answer)
    .slice(0, 7)
  if (thinkingPromptAnswers.length > 0) {
    w(`## Recent Thinking Prompts (Q & my answer)`)
    w(``)
    for (const d of thinkingPromptAnswers) {
      w(`**${d.plan_date}** — ${d.thinking_prompt}`)
      w(`> ${(d.thinking_prompt_answer as string).replace(/\n/g, '\n> ')}`)
      w(``)
    }
  }

  w(`---`)
  w(``)
  w(`_End of export._`)

  return lines.join('\n')
}

export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
