# College Application Portfolio (Template)

A working plan-and-tracker for a student's path from 9th grade through college
applications — built around three things that actually move the needle for
selective admissions: course rigor, a genuine "spike" of depth in one or two
areas, and an application narrative that only that student could have written.

This is a **template**. Copy it, fill in the brackets, and delete this notice.
It's a living document — update it every semester as grades, activities, and
interests evolve.

## Getting Started

1. Use this repository as a template (or clone it) to start your own copy.
2. Run the dashboard (see below) — the first time you open it, a **setup
   wizard** pops up asking for the student's name, school, current grade,
   current school year, courses, clubs, and a few other basics. Fill it in
   once and it fills the dashboard header/snapshot and computes the right
   school-year label for every grade (9th through 12th) automatically,
   everywhere that year appears — in the checklist and in the linked docs.
   Reopen it anytime with the "Edit Profile" button.
3. The wizard only handles those repeated, structured fields. The rest of the
   `[bracketed placeholders]` — course names in tables, the essay/college-list
   prose, etc. — are narrative and still need filling in by hand, directly in
   the markdown files.
4. Read `03-Extracurriculars/activity-strategy.md` first — it explains the
   "spike" concept that the rest of the plan is built around, and asks the
   questions that shape everything else here.

## Folder Guide

- **01-Academic-Plan/** — 4-year course sequencing, current course notes, GPA tracking
- **02-Standardized-Testing/** — PSAT/SAT roadmap, prep resources, score targets
- **03-Extracurriculars/** — activity strategy, leadership tracker, the "spike" strategy
- **04-College-List/** — target schools, reach/target/safety balance, what each looks for
- **05-Essays-and-Portfolio/** — creative portfolio (writing, design, music, research — whatever applies), essay brainstorming
- **06-Timeline/** — master year-by-year, month-by-month checklist through senior fall
- **07-Resources/** — links, tools, contacts, programs to research locally

## The Core Strategy in One Paragraph

For a strong-but-not-world-famous applicant, selective admissions comes down to
three things: (1) the most rigorous course load the student's school offers,
with grades to match; (2) a genuine, deep "spike" in one or two areas rather
than a long shallow list of activities — pick the intersection of what the
student is already drawn to and what they'd do even if no one was grading it;
and (3) an essay/application narrative that ties that spike back to something
only they could have written. Everything in this template supports one of
those three pillars — fill in the specifics for your own student and let the
structure do the organizing.

## Dashboard

A local dashboard tracks checklist status in a real SQLite database
(`portfolio.db`, created automatically, not committed to git) instead of
browser storage, so progress is consistent no matter which browser you use on
your machine.

To run it: double-click [start-dashboard.bat](start-dashboard.bat) (or run
`python server.py` from this folder), which opens
[http://localhost:8766/dashboard.html](http://localhost:8766/dashboard.html).
(Port 8766, not the more common 8765, specifically so this can run alongside
another local dev server without a port conflict.) Requires Python 3 — no
other install needed (standard library only). The
student profile from the setup wizard lives in the same `portfolio.db`.
Checklist item text is defined in [server.py](server.py); edit it there — and
in `06-Timeline/master-timeline.md` to keep the human-readable doc in sync —
to match your own student's plan.

## A Note on Privacy

This template ships with placeholder content only. Once you fill it in with a
real student's name, school, and activities, treat the repository as
containing personal information about that student (and possibly a minor) —
keep it private unless you specifically intend to share it.
