"""
Local server for the College Application Portfolio dashboard.

Serves dashboard.html and a small JSON API backed by a SQLite database
(portfolio.db, created next to this script) so checklist status is tracked
in a real local database instead of browser localStorage.

Usage:
    python server.py
Then open:
    http://localhost:8766/dashboard.html

Stdlib only -- no pip installs required.
"""

import json
import mimetypes
import re
import sqlite3
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "portfolio.db"
HOST = "localhost"
PORT = 8766  # 8765 is a common default for local dev servers -- 8766 avoids
             # colliding with another one you might already have running

# Single source of truth for checklist content. Edit here to add/remove/reword
# items -- and keep 06-Timeline/master-timeline.md in sync by hand, since that
# file is the human-readable version of the same plan. The database is
# reseeded (new ids inserted, missing ids left alone) every time the server
# starts, so status on existing items is never lost.
SECTIONS = [
    {
        "id": "academic-todo",
        "label": "Academic Plan",
        "title": "Ongoing To-Dos — Four-Year Course Plan",
        "items": [
            "Get the official course catalog and AP/IB course list from the counselor",
            "Ask the counselor what the most rigorous sustainable schedule looks like here",
            "Check whether the school or district offers dual enrollment with a nearby college or university",
            "Revisit the four-year plan every spring before course registration",
        ],
    },
    {
        "id": "grade-9",
        "label": "9th Grade",
        "title": "9th Grade ([9th Grade Year]) — Foundation Year",
        "items": [
            "Meet the school counselor early in the year; introduce the student's interests",
            "Confirm current course load is sustainable after first progress reports",
            "Join and actually attend the clubs that map to the student's interests — see which ones stick",
            "Check whether the school has a club/team tied to the student's primary interest; flag as a possible 10th-grade founding project if not",
            "Start the creative archive — document whatever the student's actual work is",
            "Ask if the school administers the PSAT 8/9; take it if offered",
            "No formal SAT prep yet — protect time for the student's actual activities",
            "Get the official course catalog for 10th-grade registration",
            "Find one local, right-now opportunity tied to the student's interest area (e.g. a volunteer program with no age minimum)",
        ],
    },
    {
        "id": "grade-10",
        "label": "10th Grade",
        "title": "10th Grade ([10th Grade Year])",
        "items": [
            "Register for 10th-grade courses using the four-year plan as a guide; keep rigor climbing",
            "Take PSAT 10 in the spring — first real data point",
            "Take one full-length practice SAT and one full-length practice ACT to compare",
            "Push for a first leadership role in a key club or activity",
            "If relevant, compete in a business-plan/entrepreneurship or other spike-relevant event",
            "Consider founding a club if the school doesn't have one that fits the student's spike",
            "Research summer programs for the summer before 11th grade",
            "Visit local/low-cost college campuses",
            "Rebuild the college list with real data",
            "Apply to any local pre-college summer institutes tied to the student's interest",
        ],
    },
    {
        "id": "grade-11",
        "label": "11th Grade",
        "title": "11th Grade ([11th Grade Year]) — The Most Important Year",
        "items": [
            "October: register for and sit the PSAT/NMSQT — this one counts for National Merit",
            "Begin structured SAT prep using Khan Academy's personalized plan",
            "Take the AP/Honors courses most relevant to the spike — mine these for essay material",
            "Pursue a real-world version of the spike: shadowing, volunteering, interning, or a competition",
            "Take on a genuine leadership title in the primary club/activity",
            "Continue the secondary thread — aim for a state-level or notable result if a competition structure exists",
            "Spring: sit for the SAT (finish testing by June so senior fall is free for applications)",
            "End of year: ask 2 junior-year teachers for recommendation letters before summer",
            "Build the real college list: 2-3 reach, 3-4 target, 2-3 likely/safety",
            "Start drafting the Common App personal essay over the summer before senior year",
            "Research Early Decision vs Early Action policies for top-choice schools",
            "Apply for any paid local internship programs open to rising juniors/seniors",
            "Look into state-level civic leadership programs (e.g. Boys State/Girls State) if eligible",
            "Ask the counselor about any state-run selective summer program that requires school nomination",
        ],
    },
    {
        "id": "grade-12",
        "label": "12th Grade",
        "title": "12th Grade ([12th Grade Year]) — Application Year",
        "items": [
            "August-September: finalize the college list; retake SAT if needed (before Nov 1 for ED/EA)",
            "September-October: finish and polish the Common App essay and all supplemental essays",
            "November 1: Early Decision/Early Action deadlines (if applicable)",
            "Request recommendation letters formally through the counselor's system (Naviance or equivalent)",
            "December: ED/EA decisions arrive; if deferred or denied, pivot fully to Regular Decision list",
            "January 1: Regular Decision deadlines for remaining schools",
            "File FAFSA as soon as it opens (typically October 1)",
            "File CSS Profile for any schools requiring it",
            "Research and apply for outside scholarships in parallel",
            "March-April: compare financial aid packages carefully using net price calculators",
            "Consider admitted-student visit days before committing",
            "May 1: national decision deadline — submit enrollment deposit",
        ],
    },
    {
        "id": "recurring",
        "label": "Recurring",
        "title": "Recurring Every Year",
        "items": [
            "Update this repo each semester: grades, activities, archive photos/recordings",
            "Check in with the school counselor at least once a semester",
            "Re-read the extracurricular strategy before adding any new commitment — does it deepen an existing thread?",
        ],
    },
]


# ---------------------------------------------------------------------------
# Curated program suggestions per career field, matched against the profile's
# free-text "career interest" by keyword. This is necessarily a static,
# best-effort list (the server makes no outbound network calls) -- treat it
# as a starting point to search from, not an exhaustive or current directory.
# ---------------------------------------------------------------------------

CAREER_CATEGORIES = [
    {
        "label": "Law & Government",
        "keywords": ["law", "legal", "attorney", "lawyer", "politic", "government",
                     "policy", "pre-law", "prelaw", "judici", "justice"],
        "programs": [
            "**State Mock Trial Program** — most states run one through the state bar association; ask the counselor whether the school has a team",
            "**Youth and Government (YMCA)** — a civics program active in most states",
            "**We The People: The Citizen and the Constitution** — national civics/constitutional-law competition",
            "**Teen Court** — many counties run a volunteer teen-court program with real courtroom exposure",
            "Shadow a local attorney or judge for a day — even a few hours of direct exposure is real material for essays",
        ],
    },
    {
        "label": "Business, Entrepreneurship & Finance",
        "keywords": ["business", "entrepreneur", "finance", "marketing", "econom",
                     "management", "account", "sales"],
        "programs": [
            "**DECA** — business/entrepreneurship competitions, national organization with school chapters",
            "**Junior Achievement** — business/financial-literacy programs, often run through the school",
            "A local university's pre-college **Entrepreneurship Institute** or similar summer program",
            "**SCORE or SBA** small-business mentoring — free, useful if a personal project becomes an actual micro-business",
            "A local startup accelerator or innovation hub's youth programming, if one exists nearby",
        ],
    },
    {
        "label": "Engineering & Robotics",
        "keywords": ["engineer", "robotic", "mechanic", "aerospace", "electrical eng",
                     "civil eng", "manufactur"],
        "programs": [
            "**FIRST Robotics** or **VEX Robotics** — join or help found a team at the school",
            "**Science Olympiad** — national STEM competition",
            "A local university's pre-college **engineering** summer program",
            "**Project Lead The Way (PLTW)** coursework, if the school offers it",
            "Shadow an engineer or intern at a local firm, makerspace, or fab lab",
        ],
    },
    {
        "label": "Computer Science & Technology",
        "keywords": ["computer science", "software", "programming", "coding", " tech",
                     "technology", "artificial intelligence", " ai ", "cyber", "data scien"],
        "programs": [
            "A local or virtual **high school hackathon** (Hack Club, MLH's high school events)",
            "A CS-focused club at school, or **Girls Who Code** if applicable",
            "A local university's pre-college **computer science** summer program",
            "**Congressional App Challenge** — national coding competition, one winner per congressional district",
            "An internship or shadow day at a local tech company or startup",
        ],
    },
    {
        "label": "Medicine & Health Sciences",
        "keywords": ["medic", "health", "nursing", "nurse", "doctor", "physician", "pre-med", "premed"],
        "programs": [
            "**HOSA – Future Health Professionals** — national student organization with school chapters",
            "A local hospital's **junior volunteer** program",
            "A local university's pre-college **medicine/health sciences** summer program",
            "Shadow a physician, nurse, or other healthcare professional for a day",
            "Get **CPR/first-aid certified** through the Red Cross — a concrete, real credential",
        ],
    },
    {
        "label": "Arts, Design & Creative Fields",
        "keywords": ["art", "design", "fashion", "music", "film", "theatre", "theater",
                     "creative writing", "photograph"],
        "programs": [
            "**Scholastic Art & Writing Awards** — major national competition, most fields of creative work qualify",
            "A local arts council's teen program, open studio, or gallery show",
            "A local university's pre-college **arts/design** summer program",
            "Build a public portfolio (a personal site, Behance, etc.) documenting real, dated work",
            "An internship or apprenticeship at a local studio, maker space, or community theater",
        ],
    },
    {
        "label": "Journalism, Media & Communications",
        "keywords": ["journalis", "media", "communicat", "broadcast", "publishing"],
        "programs": [
            "Write for the school newspaper or yearbook and aim for a leadership role",
            "A local newspaper or public radio station's teen internship or contributor program",
            "**National Scholastic Press Association** contests",
            "A local university's pre-college **journalism/media** summer program",
        ],
    },
    {
        "label": "Environmental Science & Sustainability",
        "keywords": ["environ", "sustainab", "ecology", "climate", "conservation"],
        "programs": [
            "A local land trust, park service, or conservation nonprofit's teen volunteer program",
            "**Envirothon** — national environmental science competition",
            "A local university's pre-college **environmental science** summer program",
            "Citizen-science projects (e.g. iNaturalist, a local water-quality monitoring group)",
        ],
    },
    {
        "label": "Education & Teaching",
        "keywords": ["teach", "education", "tutor"],
        "programs": [
            "Tutor younger students through the school or a local library program",
            "**Educators Rising** — national student organization for future teachers",
            "Volunteer as a camp counselor or after-school program aide",
        ],
    },
]


def match_career_category(career_interest):
    text = f" {career_interest.lower()} "
    for category in CAREER_CATEGORIES:
        if any(kw in text for kw in category["keywords"]):
            return category
    return None


def career_programs_block(profile):
    career = profile.get("career_interest", "").strip()
    if not career:
        return ('*Set a "Career interest" in the profile ("Edit Profile" on the '
                "dashboard) to see programs matched to it here.*")
    location = profile.get("location", "").strip() or "your area"
    category = match_career_category(career)
    lines = []
    if category:
        lines.append(f'Matched "{career}" to **{category["label"]}**:')
        lines.append("")
        lines.extend(f"- {p}" for p in category["programs"])
        lines.append(f'- Search "{location} {career} internship for high school students" for options specific to where you live')
    else:
        lines.append(f'No built-in match for "{career}" yet — try these searches instead:')
        lines.append("")
        lines.append(f'- Search "{location} {career} internship for high school students"')
        lines.append(f'- Search "{career} pre-college summer program"')
        lines.append("- Ask the school counselor whether a local professional organization in this field runs a job-shadow or mentorship program")
        lines.append("- Look for a national student organization or competition specific to this field — most established fields have one")
    return "\n".join(lines)


def inspiration_colleges_block(profile):
    schools_raw = profile.get("inspiration_schools", "").strip()
    if not schools_raw:
        return ('*Set "Inspiration colleges" in the profile ("Edit Profile" on '
                "the dashboard) to list them here.*")
    career = profile.get("career_interest", "").strip()
    schools = [s.strip() for s in re.split(r"[,;]", schools_raw) if s.strip()]
    lines = []
    for school in schools:
        # Plain parenthetical, not [bracketed] -- brackets are this template's
        # "needs manual fill-in" convention, and reusing them here made an
        # already-substituted line look like it was still an unresolved token.
        if career:
            hint = f'still to fill in by hand: which program at {school} connects to "{career}", plus location and other resources'
        else:
            hint = f"still to fill in by hand: what specifically fits — curriculum, location, department, resources"
        lines.append(f"- **{school}** — *({hint})*")
    return "\n".join(lines)


def reach_schools_block(profile):
    # "Inspiration colleges" are aspirational by design (see the note right
    # above this section in the doc itself) -- they're the natural starting
    # point for the Reach tier. There's no separate reach/target/likely input;
    # Target and Likely stay static prompts since the app has no test-score
    # or GPA data to tell a realistic target from a genuine safety.
    schools_raw = profile.get("inspiration_schools", "").strip()
    if not schools_raw:
        return ('*Set "Inspiration colleges" in the profile ("Edit Profile" on '
                "the dashboard) — they'll show up here as a starting point for Reach.*")
    schools = [s.strip() for s in re.split(r"[,;]", schools_raw) if s.strip()]
    return "\n".join(f"- **{s}** — *(from your Inspiration Colleges list)*" for s in schools)


# ---------------------------------------------------------------------------
# A tiny Markdown -> HTML renderer, just enough for this repo's docs (headers,
# bold/italic, inline code, links, tables, "- "/"1. " lists incl. "- [ ]"
# checkboxes, horizontal rules, paragraphs). No nested lists, no code blocks --
# none of the template docs use them. Kept dependency-free on purpose so the
# server needs nothing beyond the standard library.
# ---------------------------------------------------------------------------

_INLINE_CODE = re.compile(r"`([^`]+)`")
_BOLD = re.compile(r"\*\*([^*]+?)\*\*")
_ITALIC = re.compile(r"(?<!\*)\*([^*\n]+?)\*(?!\*)")
_LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")

_HEADER = re.compile(r"^(#{1,6})\s+(.*)$")
_HR = re.compile(r"^-{3,}$")
_UL_ITEM = re.compile(r"^-\s+(.*)$")
_OL_ITEM = re.compile(r"^\d+\.\s+(.*)$")
_CHECKBOX = re.compile(r"^\[([ xX])\]\s+(.*)$")
_TABLE_SEP = re.compile(r"^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$")


def _escape_html(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def _inline(text):
    text = _escape_html(text)
    text = _INLINE_CODE.sub(r"<code>\1</code>", text)
    text = _BOLD.sub(r"<strong>\1</strong>", text)
    text = _ITALIC.sub(r"<em>\1</em>", text)
    text = _LINK.sub(r'<a href="\2">\1</a>', text)
    return text


def _split_table_row(line):
    row = line.strip()
    if row.startswith("|"):
        row = row[1:]
    if row.endswith("|"):
        row = row[:-1]
    return [cell.strip() for cell in row.split("|")]


def _render_table(rows):
    header_cells = _split_table_row(rows[0])
    body_rows = [_split_table_row(r) for r in rows[2:]]
    thead = "<tr>" + "".join(f"<th>{_inline(c)}</th>" for c in header_cells) + "</tr>"
    tbody = "".join(
        "<tr>" + "".join(f"<td>{_inline(c)}</td>" for c in r) + "</tr>" for r in body_rows
    )
    return f'<div class="md-table-wrap"><table class="md-table"><thead>{thead}</thead><tbody>{tbody}</tbody></table></div>'


def _render_ul(items):
    parts = ['<ul class="md-list">']
    for text in items:
        m = _CHECKBOX.match(text)
        if m:
            checked = m.group(1).lower() == "x"
            cls = "check-item done" if checked else "check-item"
            box = "☑" if checked else "☐"
            parts.append(
                f'<li class="{cls}"><span class="md-checkbox" aria-hidden="true">{box}</span>{_inline(m.group(2))}</li>'
            )
        else:
            parts.append(f"<li>{_inline(text)}</li>")
    parts.append("</ul>")
    return "".join(parts)


def _is_block_start(line):
    s = line.strip()
    return (
        s == ""
        or _HEADER.match(s)
        or _HR.match(s)
        or _UL_ITEM.match(s)
        or _OL_ITEM.match(s)
        or s.startswith("|")
    )


def _consume_continuation(lines, i, parts):
    """Absorb indented lines that wrap the list item just started at lines[i-1]
    into `parts`, so a bullet that word-wraps across source lines renders as
    one <li> instead of the wrapped tail becoming a stray paragraph. Stops at
    a blank line, an unindented line, or the start of a new block."""
    n = len(lines)
    while i < n and lines[i].strip() != "" and lines[i][:1].isspace() and not _is_block_start(lines[i].strip()):
        parts.append(lines[i].strip())
        i += 1
    return i


def render_markdown(text):
    lines = text.replace("\r\n", "\n").split("\n")
    out = []
    i, n = 0, len(lines)
    while i < n:
        stripped = lines[i].strip()

        if stripped == "":
            i += 1
            continue

        if stripped.startswith("|") and i + 1 < n and _TABLE_SEP.match(lines[i + 1].strip()):
            table_rows = [stripped, lines[i + 1].strip()]
            i += 2
            while i < n and lines[i].strip().startswith("|"):
                table_rows.append(lines[i].strip())
                i += 1
            out.append(_render_table(table_rows))
            continue

        m = _HEADER.match(stripped)
        if m:
            level = len(m.group(1))
            out.append(f"<h{level}>{_inline(m.group(2))}</h{level}>")
            i += 1
            continue

        if _HR.match(stripped):
            out.append("<hr/>")
            i += 1
            continue

        if _UL_ITEM.match(stripped):
            items = []
            while i < n and _UL_ITEM.match(lines[i].strip()):
                parts = [_UL_ITEM.match(lines[i].strip()).group(1)]
                i += 1
                i = _consume_continuation(lines, i, parts)
                items.append(" ".join(parts))
            out.append(_render_ul(items))
            continue

        if _OL_ITEM.match(stripped):
            items = []
            while i < n and _OL_ITEM.match(lines[i].strip()):
                parts = [_OL_ITEM.match(lines[i].strip()).group(1)]
                i += 1
                i = _consume_continuation(lines, i, parts)
                items.append(" ".join(parts))
            out.append("<ol>" + "".join(f"<li>{_inline(t)}</li>" for t in items) + "</ol>")
            continue

        para = [stripped]
        i += 1
        while i < n and not _is_block_start(lines[i]):
            para.append(lines[i].strip())
            i += 1
        out.append(f"<p>{_inline(' '.join(para))}</p>")

    return "\n".join(out)


def render_doc_page(rel_path, md_text):
    title_match = re.search(r"^#\s+(.*)$", md_text, re.MULTILINE)
    title = title_match.group(1) if title_match else Path(rel_path).stem.replace("-", " ").title()
    body_html = render_markdown(md_text)
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{_escape_html(title)} — College Application Portfolio</title>
<link rel="stylesheet" href="/assets/style.css" />
</head>
<body>
<div class="doc-wrap">
  <div class="doc-topbar">
    <a class="back-link" href="/dashboard.html">&larr; Dashboard</a>
    <span class="doc-path">{_escape_html(rel_path)}</span>
  </div>
  <article class="doc-content">
{body_html}
  </article>
</div>
</body>
</html>"""


# The fields the setup wizard collects. `key` is also the sqlite column name.
PROFILE_FIELDS = [
    "student_name",
    "school_name",
    "location",             # e.g. "Austin, TX"
    "current_grade",       # "9", "10", "11", or "12"
    "current_school_year", # e.g. "2026-27"
    "courses",
    "clubs",
    "outside_school",
    "creative",
    "inspiration_schools",
    "career_interest",
]


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Cheap and idempotent: guarantees the tables exist on every connection, not
    # just at startup, so the server self-heals if portfolio.db is ever deleted
    # or replaced out from under a running process instead of hanging requests
    # on "no such table".
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS checklist_items (
            id TEXT PRIMARY KEY,
            section_id TEXT NOT NULL,
            section_label TEXT NOT NULL,
            section_title TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            text TEXT NOT NULL,
            done INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT
        )
        """
    )
    columns = ", ".join(f"{f} TEXT NOT NULL DEFAULT ''" for f in PROFILE_FIELDS)
    conn.execute(
        f"CREATE TABLE IF NOT EXISTS profile (id INTEGER PRIMARY KEY CHECK (id = 1), {columns})"
    )
    # Self-healing migration: if PROFILE_FIELDS grows (like it just did, adding
    # "location"), backfill the column on any portfolio.db created before that
    # change instead of erroring on an unknown column.
    existing = {row[1] for row in conn.execute("PRAGMA table_info(profile)")}
    for field in PROFILE_FIELDS:
        if field not in existing:
            conn.execute(f"ALTER TABLE profile ADD COLUMN {field} TEXT NOT NULL DEFAULT ''")
    return conn


def get_profile(conn):
    row = conn.execute("SELECT * FROM profile WHERE id = 1").fetchone()
    if row is None:
        return {f: "" for f in PROFILE_FIELDS}
    return {f: row[f] for f in PROFILE_FIELDS}


def compute_grade_years(current_grade, current_school_year):
    """Given e.g. grade 10 and school year '2027-28', derive the school-year
    label for every grade 9-12 (so a student's whole 4-year timeline gets the
    right year in each section, not just the one they're currently in)."""
    try:
        grade = int(current_grade)
        start_year = int(str(current_school_year).split("-")[0])
    except (ValueError, IndexError):
        return {}
    years = {}
    for g in (9, 10, 11, 12):
        y = start_year + (g - grade)
        years[g] = f"{y}-{str((y + 1) % 100).zfill(2)}"
    return years


def profile_tokens(profile):
    """Map of literal '[Bracket Placeholder]' tokens -> real values, built from
    the saved profile. Empty/unset fields are left out so their placeholder
    stays visible as a reminder to fill it in."""
    tokens = {}
    if profile.get("student_name"):
        tokens["[Student Name]"] = profile["student_name"]
    if profile.get("school_name"):
        tokens["[Your High School]"] = profile["school_name"]
    if profile.get("location"):
        tokens["[Location]"] = profile["location"]
    if profile.get("current_school_year"):
        tokens["[School Year]"] = profile["current_school_year"]
    if profile.get("current_grade") and profile.get("current_school_year"):
        years = compute_grade_years(profile["current_grade"], profile["current_school_year"])
        for g, label in years.items():
            tokens[f"[{g}th Grade Year]"] = label
        grade_names = {9: "9th Grade", 10: "10th Grade", 11: "11th Grade", 12: "12th Grade"}
        grade = int(profile["current_grade"])
        if grade in grade_names:
            tokens["[Grade]"] = grade_names[grade]
    # Always substituted (even with an empty profile) since this is
    # server-generated content, not a fill-in-the-blank a person would type.
    tokens["[Career Interest Programs]"] = career_programs_block(profile)
    tokens["[Inspiration Colleges List]"] = inspiration_colleges_block(profile)
    tokens["[Reach Schools List]"] = reach_schools_block(profile)
    return tokens


def apply_profile(text, profile):
    tokens = profile_tokens(profile)
    for placeholder, value in tokens.items():
        text = text.replace(placeholder, value)
    return text


def init_db():
    conn = get_conn()
    for section in SECTIONS:
        for idx, text in enumerate(section["items"]):
            item_id = f"{section['id']}-{idx}"
            conn.execute(
                """
                INSERT INTO checklist_items
                    (id, section_id, section_label, section_title, sort_order, text, done)
                VALUES (?, ?, ?, ?, ?, ?, 0)
                ON CONFLICT(id) DO UPDATE SET
                    section_label = excluded.section_label,
                    section_title = excluded.section_title,
                    sort_order = excluded.sort_order,
                    text = excluded.text
                """,
                (item_id, section["id"], section["label"], section["title"], idx, text),
            )
    conn.commit()
    conn.close()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # keep stdout quiet

    def _send_json(self, payload, status=200):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path, content_type):
        try:
            body = path.read_bytes()
        except FileNotFoundError:
            self._send_json({"error": "not found"}, 404)
            return
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _resolve_repo_path(self, url_path):
        """Map a URL path to a file under ROOT, refusing to leave the repo directory."""
        rel = unquote(url_path).lstrip("/")
        candidate = (ROOT / rel).resolve()
        if candidate != ROOT and ROOT not in candidate.parents:
            return None
        return candidate

    def _send_repo_file(self, url_path):
        """Serve any file inside the repo as a static asset (css, images, etc.)."""
        candidate = self._resolve_repo_path(url_path)
        if candidate is None:
            self._send_json({"error": "forbidden"}, 403)
            return
        if not candidate.is_file():
            self._send_json({"error": "not found"}, 404)
            return
        content_type, _ = mimetypes.guess_type(str(candidate))
        if candidate.suffix == ".css":
            content_type = "text/css; charset=utf-8"
        elif candidate.suffix == ".js":
            content_type = "application/javascript; charset=utf-8"
        elif content_type is None:
            content_type = "application/octet-stream"
        elif content_type.startswith("text/"):
            content_type += "; charset=utf-8"
        self._send_file(candidate, content_type)

    def _send_markdown_doc(self, url_path):
        """Render a linked .md doc as a styled HTML page instead of raw text."""
        candidate = self._resolve_repo_path(url_path)
        if candidate is None:
            self._send_json({"error": "forbidden"}, 403)
            return
        if not candidate.is_file():
            self._send_json({"error": "not found"}, 404)
            return
        try:
            text = candidate.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            self._send_json({"error": "cannot render file"}, 500)
            return
        conn = get_conn()
        profile = get_profile(conn)
        conn.close()
        text = apply_profile(text, profile)
        rel = candidate.relative_to(ROOT).as_posix()
        body = render_doc_page(rel, text).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        url_path = urlsplit(self.path).path
        if url_path in ("/", "/dashboard.html"):
            self._send_file(ROOT / "dashboard.html", "text/html; charset=utf-8")
        elif url_path == "/api/items":
            conn = get_conn()
            profile = get_profile(conn)
            rows = conn.execute(
                "SELECT id, section_id, section_label, section_title, sort_order, text, done "
                "FROM checklist_items ORDER BY section_id, sort_order"
            ).fetchall()
            conn.close()
            items = []
            for r in rows:
                item = dict(r)
                item["text"] = apply_profile(item["text"], profile)
                item["section_title"] = apply_profile(item["section_title"], profile)
                items.append(item)
            self._send_json(items)
        elif url_path == "/api/profile":
            conn = get_conn()
            profile = get_profile(conn)
            conn.close()
            self._send_json(profile)
        elif url_path.endswith(".md"):
            self._send_markdown_doc(url_path)
        else:
            self._send_repo_file(url_path)

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            self._send_json({"error": "invalid json"}, 400)
            return

        if self.path.startswith("/api/items/"):
            item_id = self.path[len("/api/items/"):]
            done = bool(payload.get("done"))
            conn = get_conn()
            cur = conn.execute(
                "UPDATE checklist_items SET done = ?, updated_at = datetime('now') WHERE id = ?",
                (1 if done else 0, item_id),
            )
            conn.commit()
            if cur.rowcount == 0:
                conn.close()
                self._send_json({"error": "no such item"}, 404)
                return
            row = conn.execute(
                "SELECT id, done FROM checklist_items WHERE id = ?", (item_id,)
            ).fetchone()
            conn.close()
            self._send_json(dict(row))
        elif self.path == "/api/reset":
            conn = get_conn()
            conn.execute("UPDATE checklist_items SET done = 0, updated_at = datetime('now')")
            conn.commit()
            conn.close()
            self._send_json({"ok": True})
        elif self.path == "/api/profile":
            values = [str(payload.get(f, "")).strip() for f in PROFILE_FIELDS]
            conn = get_conn()
            columns = ", ".join(PROFILE_FIELDS)
            placeholders = ", ".join("?" for _ in PROFILE_FIELDS)
            updates = ", ".join(f"{f} = excluded.{f}" for f in PROFILE_FIELDS)
            conn.execute(
                f"""
                INSERT INTO profile (id, {columns}) VALUES (1, {placeholders})
                ON CONFLICT(id) DO UPDATE SET {updates}
                """,
                values,
            )
            conn.commit()
            profile = get_profile(conn)
            conn.close()
            self._send_json(profile)
        else:
            self._send_json({"error": "not found"}, 404)


def main():
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    url = f"http://{HOST}:{PORT}/dashboard.html"
    print(f"College Application Portfolio dashboard running at {url}")
    print(f"Database: {DB_PATH}")
    print("Press Ctrl+C to stop.")
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping.")
        server.shutdown()


if __name__ == "__main__":
    main()
