# adadv3nture — What the App Should Be

> A durable framing piece, not a build spec. This describes *what the app is for* — the
> principles that should hold across seasons and features. Specific applications (e.g. summer
> mode) live in their own handoff docs and should be checked against this one, not the reverse.

---

## The Premise

**"My life in one place." The point of the app is to collect me.**

Where am I, what are my goals, what are my must-dos, and what am I losing track of?
The app gathers the scattered signal of a life — sensors, calendars, todos, one subjective
read — into a single place, and reflects back where I'm diverging from where I meant to go.

It is **not** a goal-achievement app. It is **not** a tracker that needs feeding, a timesheet,
or a gate I have to clear before it lets me in. It's a system that watches the slow-moving
stuff I can't hold in my head while parenting three kids and building a business — and helps
me stay whole and pointed somewhere while life does what life does.

---

## The Collection Layer (the substrate)

Most of "collecting me" is **passive** — it flows in whether or not I open the app:

- **Strava** → workouts / training
- **Withings** → weight + biometrics
- **Apple Watch** → sleep + recovery
- **Todo check-offs** → activity in Career, Home, Family, Projects

The only thing no sensor can read is **mood** — the one true subjective entry.

**Two rules the collection layer must honor:**

1. **Time-agnostic entry.** Every entry carries the date it's *about*, not the date it was
   made. Any signal, any category, can be entered for any prior day. I don't lose a day just
   because I didn't open the app (off-grid, traveling, etc.). I'm never "catching up" — I'm
   entering data that happens to be about Tuesday.
2. **Accrete, don't replace.** A day is assembled from many independent streams. Each source
   writes only its own slice. Logging mood for Friday on Sunday *adds* mood to Friday — it can
   never clobber the Strava run, weight, or sleep that already synced in.

**Completeness, not enforcement.** The app needs every day filled to function well, but the
syncs do most of it automatically. A day with mood unentered is the honest signal that I
didn't log it — so missing mood is what flags a day as needing a fill. The fill is an
invitation (a reminder + the day surfaced, "you forgot Friday, here's Friday"), not a wall.

---

## The Two Faculties

The app has two faculties that read the same collected data in opposite directions. Almost
every feature is an expression of one or the other.

### 1. The Watcher (backward / retrospective / diagnostic)

Reads what already happened, detects when something is dimming, and nudges. Quiet until
needed. Its value lands on the day I *missed* something.

The watcher does **not** guard goals as such. It guards **the things that, if they slip,
degrade my actual life right now:**

- **Career / Wright Adventures progress** — the runway is a present-tense reality, tied to the
  hard Labor Day (Sept 1) reckoning. This cannot slip.
- **Training as energy** — the runs/workouts are the *precondition* that powers everything
  else; I'm a better, more present dad with them. The watcher nudges a skipped run — but the
  spirit is **care** ("you feel better when you move"), not **debt** ("you owe the future race").

Everything else is **tracked but silent.** A category can be allowed to dim during a demanding
season without that being a failure — the watcher's job is to protect what genuinely can't
slip, not to demand all flames burn equally at all times.

### 2. The Suggester (forward / prospective / generative)

Reads the same history to propose the next move. It's the thing I *come to* — the front door.
Works on good days and bad: even when nothing's dim and the watcher is silent, the suggester
keeps offering.

- The adventure / next-thing-to-do card
- Training program's next session
- Inspiration photos ("on this day")
- Aspirational-goal nudges ("you're near a book hike — want to knock one out?")

**The good-day answer:** on an easy day when I don't need catching, the watcher is silent and
the suggester still works. The reassurance that all the flames are lit and nothing's quietly
fading is itself a feature — I get to *not worry*.

---

## Pilot Lights — the universal abstraction

"Keeping the pilot lights lit" is the goal. Each life category computes "lit vs. dimming" from
whatever it's made of, then reports it as one simple flame signal:

| Category | Made of | "Lit" means |
|---|---|---|
| Career / WA | opportunities (Confluence, BBSP, fractional CTO, GSEMA) | something moved |
| Training | dated events (FOCO 7/19, Hurricane 8/2, WLW 9/26) | on pace toward the next |
| Projects | each its own arc + deadline (Bottle Cap Bike → the show) | progressing to deadline |
| Home / Family | throughput | things getting done / presence happening |

Drift detection isn't a separate feature — **drift is a dimming pilot light.** The Bottle Cap
Bike slipping a month behind is just the Projects flame fading, surfaced like any other.

---

## How Goals Work (the heart of it)

Goals deliver value in **three stacked positives** — not a trade-off between journey and finish:

1. **Setting the goal** — positive framing of the future. The act of pointing myself somewhere
   ambitious is itself a good. (Dreaming with Tangier: "let's do all 50 hikes," "a park a
   month," "all the National Parks before the kids are 18.") Value delivered at the moment of
   setting.
2. **Training toward it** — the journey, good in the doing. Every run, WA session, hike banked
   is a good *as it happens*.
3. **Completing it** — the cherry on top. Real and satisfying, **the best part** — but a topping
   on two layers that already stood on their own.

**Hitting the goal is the best outcome — I like setting a goal and hitting it.** The
three-positives model is not indifference to finishing; it's that a miss removes the cherry,
not the cake. I still got the framing and the journey.

This sorts goals into two kinds the app must treat **oppositely:**

- **Operational goals** — commitments with real consequences (WA progress; the bike show, where
  if it's not done I miss the show). The watcher guards these. Slipping is real; tell me.
- **Aspirational goals** — shared family dreams (50 hikes, a park a month, the National Parks).
  These are **fun to set, track, and talk about** even when life means we don't finish them.
  The suggester feeds them; progress shows as **delight, not pace**; the watcher **never nags**
  them. Letting them breathe is correct use, not failure.

> The tell: does missing it have a *consequence* or just a *someday*? Consequence → operational.
> Someday → aspirational.

Note: **WLW is aspirational wearing operational clothing.** The race date and plan are
scaffolding for the training; if I run it, great, if not, "look at all the miles I banked."
The *training* still gets nudged — but as energy/care, not race-debt.

**The app's gestures, by layer:** make *setting* feel good (maybe host the family-dreaming
moment) · support the *journey* with suggester + gentle watcher · **celebrate** completion,
and when it doesn't come, honor layers 1 & 2 (here's the future you framed, here's what you
banked) — never a red "failed."

---

## The Briefing

"The one thing" lives here as **editorial, not structure.** Given everything competing today,
the briefing names the single highest-leverage move. It's a valuable daily *opinion* — but it's
an output, not the architecture. The briefing names one; the system tracks all.

---

## What This Is Not

- Not a goal-achievement app (that only values completion).
- Not a journey-only app that shrugs at finishing (hitting goals is the best part).
- Not a gate / timesheet / wall-on-open.
- Not a guilt machine — it never nags aspirational goals, and it lets categories dim when a
  season calls for it.

---

## Standing Open Questions (framing-level)

These aren't build tasks — they're unresolved questions about *what the app is*, worth
revisiting whenever a feature touches them:

- Does the app *host* goal-setting (a family-dreaming space) or just store goals once set?
- How do goals and their rough targets get into the app and stay current? (Drift detection is
  only as good as the app's model of where I was trying to go.)

---

*adadv3nture — "a dad adventure." Good to set, good to pursue, best to finish — and the absence
of the cherry never erases the cake.*
</content>
</invoke>
