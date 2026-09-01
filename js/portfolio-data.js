// Static content shared by the client-side (Vercel/localStorage) build.
// Kept in sync BY HAND with the equivalent Python data in server.py -- that
// file is the source of truth for the local Python-server build; this one
// mirrors it for the no-backend static build. If you edit checklist items,
// career categories, or default subjects, update both places.

const NAV = [
  { num: "01", icon: "📚", color: "var(--blue)", name: "Academic Plan", desc: "4-year course sequencing, GPA tracking", href: "01-Academic-Plan/four-year-course-plan.md" },
  { num: "02", icon: "📝", color: "var(--orange)", name: "Standardized Testing", desc: "PSAT/SAT roadmap, prep resources, score targets", href: "02-Standardized-Testing/psat-sat-prep-plan.md" },
  { num: "03", icon: "🏆", color: "var(--aqua)", name: "Extracurriculars", desc: "Activity strategy, leadership tracker, the \"spike\"", href: "03-Extracurriculars/activity-strategy.md" },
  { num: "04", icon: "🎓", color: "var(--yellow)", name: "College List", desc: "Target schools, reach/target/safety balance", href: "04-College-List/target-schools.md" },
  { num: "05", icon: "🎨", color: "var(--magenta)", name: "Essays & Portfolio", desc: "Creative archive, essay brainstorming", href: "05-Essays-and-Portfolio/creative-portfolio-ideas.md" },
  { num: "06", icon: "🗓️", color: "var(--violet)", name: "Timeline", desc: "Master year-by-year, month-by-month checklist", href: "06-Timeline/master-timeline.md" },
  { num: "07", icon: "🔗", color: "var(--cat-green)", name: "Resources", desc: "Links, tools, contacts, programs to research", href: "07-Resources/links-and-tools.md" },
  { num: "07", icon: "❓", color: "var(--cat-green)", name: "Counselor Questions", desc: "Question list for the first counselor meeting", href: "07-Resources/counselor-meeting-questions.md" },
];

const SECTION_COLORS = {
  "academic-todo": "var(--blue)",
  "grade-9": "var(--orange)",
  "grade-10": "var(--aqua)",
  "grade-11": "var(--yellow)",
  "grade-12": "var(--magenta)",
  "recurring": "var(--violet)",
};

const SECTIONS_TEMPLATE = [
  {
    id: "academic-todo",
    label: "Academic Plan",
    title: "Ongoing To-Dos — Four-Year Course Plan",
    items: [
      "Get the official course catalog and AP/IB course list from the counselor",
      "Ask the counselor what the most rigorous sustainable schedule looks like here",
      "Check whether the school or district offers dual enrollment with a nearby college or university",
      "Revisit the four-year plan every spring before course registration",
    ],
  },
  {
    id: "grade-9",
    label: "9th Grade",
    title: "9th Grade ([9th Grade Year]) — Foundation Year",
    items: [
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
    id: "grade-10",
    label: "10th Grade",
    title: "10th Grade ([10th Grade Year])",
    items: [
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
    id: "grade-11",
    label: "11th Grade",
    title: "11th Grade ([11th Grade Year]) — The Most Important Year",
    items: [
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
    id: "grade-12",
    label: "12th Grade",
    title: "12th Grade ([12th Grade Year]) — Application Year",
    items: [
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
    id: "recurring",
    label: "Recurring",
    title: "Recurring Every Year",
    items: [
      "Update this repo each semester: grades, activities, archive photos/recordings",
      "Check in with the school counselor at least once a semester",
      "Re-read the extracurricular strategy before adding any new commitment — does it deepen an existing thread?",
    ],
  },
];

const CAREER_CATEGORIES = [
  {
    label: "Law & Government",
    keywords: ["law", "legal", "attorney", "lawyer", "politic", "government", "policy", "pre-law", "prelaw", "judici", "justice"],
    programs: [
      "**State Mock Trial Program** — most states run one through the state bar association; ask the counselor whether the school has a team",
      "**Youth and Government (YMCA)** — a civics program active in most states",
      "**We The People: The Citizen and the Constitution** — national civics/constitutional-law competition",
      "**Teen Court** — many counties run a volunteer teen-court program with real courtroom exposure",
      "Shadow a local attorney or judge for a day — even a few hours of direct exposure is real material for essays",
    ],
  },
  {
    label: "Business, Entrepreneurship & Finance",
    keywords: ["business", "entrepreneur", "finance", "marketing", "econom", "management", "account", "sales"],
    programs: [
      "**DECA** — business/entrepreneurship competitions, national organization with school chapters",
      "**Junior Achievement** — business/financial-literacy programs, often run through the school",
      "A local university's pre-college **Entrepreneurship Institute** or similar summer program",
      "**SCORE or SBA** small-business mentoring — free, useful if a personal project becomes an actual micro-business",
      "A local startup accelerator or innovation hub's youth programming, if one exists nearby",
    ],
  },
  {
    label: "Engineering & Robotics",
    keywords: ["engineer", "robotic", "mechanic", "aerospace", "electrical eng", "civil eng", "manufactur"],
    programs: [
      "**FIRST Robotics** or **VEX Robotics** — join or help found a team at the school",
      "**Science Olympiad** — national STEM competition",
      "A local university's pre-college **engineering** summer program",
      "**Project Lead The Way (PLTW)** coursework, if the school offers it",
      "Shadow an engineer or intern at a local firm, makerspace, or fab lab",
    ],
  },
  {
    label: "Computer Science & Technology",
    keywords: ["computer science", "software", "programming", "coding", " tech", "technology", "artificial intelligence", " ai ", "cyber", "data scien"],
    programs: [
      "A local or virtual **high school hackathon** (Hack Club, MLH's high school events)",
      "A CS-focused club at school, or **Girls Who Code** if applicable",
      "A local university's pre-college **computer science** summer program",
      "**Congressional App Challenge** — national coding competition, one winner per congressional district",
      "An internship or shadow day at a local tech company or startup",
    ],
  },
  {
    label: "Medicine & Health Sciences",
    keywords: ["medic", "health", "nursing", "nurse", "doctor", "physician", "pre-med", "premed"],
    programs: [
      "**HOSA – Future Health Professionals** — national student organization with school chapters",
      "A local hospital's **junior volunteer** program",
      "A local university's pre-college **medicine/health sciences** summer program",
      "Shadow a physician, nurse, or other healthcare professional for a day",
      "Get **CPR/first-aid certified** through the Red Cross — a concrete, real credential",
    ],
  },
  {
    label: "Arts, Design & Creative Fields",
    keywords: ["art", "design", "fashion", "music", "film", "theatre", "theater", "creative writing", "photograph"],
    programs: [
      "**Scholastic Art & Writing Awards** — major national competition, most fields of creative work qualify",
      "A local arts council's teen program, open studio, or gallery show",
      "A local university's pre-college **arts/design** summer program",
      "Build a public portfolio (a personal site, Behance, etc.) documenting real, dated work",
      "An internship or apprenticeship at a local studio, maker space, or community theater",
    ],
  },
  {
    label: "Journalism, Media & Communications",
    keywords: ["journalis", "media", "communicat", "broadcast", "publishing"],
    programs: [
      "Write for the school newspaper or yearbook and aim for a leadership role",
      "A local newspaper or public radio station's teen internship or contributor program",
      "**National Scholastic Press Association** contests",
      "A local university's pre-college **journalism/media** summer program",
    ],
  },
  {
    label: "Environmental Science & Sustainability",
    keywords: ["environ", "sustainab", "ecology", "climate", "conservation"],
    programs: [
      "A local land trust, park service, or conservation nonprofit's teen volunteer program",
      "**Envirothon** — national environmental science competition",
      "A local university's pre-college **environmental science** summer program",
      "Citizen-science projects (e.g. iNaturalist, a local water-quality monitoring group)",
    ],
  },
  {
    label: "Education & Teaching",
    keywords: ["teach", "education", "tutor"],
    programs: [
      "Tutor younger students through the school or a local library program",
      "**Educators Rising** — national student organization for future teachers",
      "Volunteer as a camp counselor or after-school program aide",
    ],
  },
];

const DEFAULT_SUBJECTS = ["English", "Math", "Science", "History", "World Language", "Elective", "PE"];
const COURSE_TABLE_GRADES = ["9", "10", "11", "12"];
