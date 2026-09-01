// Client-side port of server.py's profile + token-substitution logic, for
// the no-backend static build. Persists to localStorage instead of SQLite.
// Kept in sync BY HAND with the Python version.

const PROFILE_FIELDS = [
  "student_name", "school_name", "location", "current_grade", "current_school_year",
  "courses", "clubs", "outside_school", "creative", "inspiration_schools", "career_interest",
];

const PROFILE_STORAGE_KEY = "portfolio_profile";

function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    const stored = raw ? JSON.parse(raw) : {};
    const profile = {};
    PROFILE_FIELDS.forEach(f => (profile[f] = stored[f] || ""));
    return profile;
  } catch (e) {
    const empty = {};
    PROFILE_FIELDS.forEach(f => (empty[f] = ""));
    return empty;
  }
}

function saveProfileLocal(data) {
  const profile = {};
  PROFILE_FIELDS.forEach(f => (profile[f] = (data[f] || "").toString().trim()));
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

function splitItems(raw) {
  return (raw || "")
    .trim()
    .split(/[,;]/)
    .map(s => s.trim())
    .filter(Boolean);
}

function computeGradeYears(currentGrade, currentSchoolYear) {
  const grade = parseInt(currentGrade, 10);
  const startYear = parseInt(String(currentSchoolYear).split("-")[0], 10);
  if (Number.isNaN(grade) || Number.isNaN(startYear)) return {};
  const years = {};
  [9, 10, 11, 12].forEach(g => {
    const y = startYear + (g - grade);
    years[g] = `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
  });
  return years;
}

function matchCareerCategory(careerInterest) {
  const text = ` ${careerInterest.toLowerCase()} `;
  for (const category of CAREER_CATEGORIES) {
    if (category.keywords.some(kw => text.includes(kw))) return category;
  }
  return null;
}

function careerProgramsBlock(profile) {
  const career = (profile.career_interest || "").trim();
  if (!career) {
    return '*Set a "Career interest" in the profile ("Edit Profile" on the dashboard) to see programs matched to it here.*';
  }
  const location = (profile.location || "").trim() || "your area";
  const category = matchCareerCategory(career);
  const lines = [];
  if (category) {
    lines.push(`Matched "${career}" to **${category.label}**:`);
    lines.push("");
    category.programs.forEach(p => lines.push(`- ${p}`));
    lines.push(`- Search "${location} ${career} internship for high school students" for options specific to where you live`);
  } else {
    lines.push(`No built-in match for "${career}" yet — try these searches instead:`);
    lines.push("");
    lines.push(`- Search "${location} ${career} internship for high school students"`);
    lines.push(`- Search "${career} pre-college summer program"`);
    lines.push("- Ask the school counselor whether a local professional organization in this field runs a job-shadow or mentorship program");
    lines.push("- Look for a national student organization or competition specific to this field — most established fields have one");
  }
  return lines.join("\n");
}

function inspirationCollegesBlock(profile) {
  const schoolsRaw = (profile.inspiration_schools || "").trim();
  if (!schoolsRaw) {
    return '*Set "Inspiration colleges" in the profile ("Edit Profile" on the dashboard) to list them here.*';
  }
  const career = (profile.career_interest || "").trim();
  const schools = splitItems(schoolsRaw);
  return schools
    .map(school => {
      const hint = career
        ? `still to fill in by hand: which program at ${school} connects to "${career}", plus location and other resources`
        : "still to fill in by hand: what specifically fits — curriculum, location, department, resources";
      return `- **${school}** — *(${hint})*`;
    })
    .join("\n");
}

function reachSchoolsBlock(profile) {
  const schoolsRaw = (profile.inspiration_schools || "").trim();
  if (!schoolsRaw) {
    return '*Set "Inspiration colleges" in the profile ("Edit Profile" on the dashboard) — they’ll show up here as a starting point for Reach.*';
  }
  return splitItems(schoolsRaw)
    .map(s => `- **${s}** — *(from your Inspiration Colleges list)*`)
    .join("\n");
}

function clubsBlock(profile) {
  const items = splitItems(profile.clubs);
  if (!items.length) {
    return '*Set "School clubs" in the profile ("Edit Profile" on the dashboard) to list them here.*';
  }
  return items
    .map(club => `- **${club}** — *(still to fill in by hand: why it matters / what it builds toward)*`)
    .join("\n");
}

function outsideSchoolBlock(profile) {
  const items = splitItems(profile.outside_school);
  if (!items.length) {
    return '*Set "Outside school" in the profile ("Edit Profile" on the dashboard) to list them here.*';
  }
  return items.map(item => `- ${item}`).join("\n");
}

function creativePursuitsBlock(profile) {
  const items = splitItems(profile.creative);
  if (!items.length) {
    return '*Set "Creative / other pursuits" in the profile ("Edit Profile" on the dashboard) to list them here.*';
  }
  return items.map(item => `- ${item}`).join("\n");
}

function profileTokens(profile) {
  const tokens = {};
  if (profile.student_name) tokens["[Student Name]"] = profile.student_name;
  if (profile.school_name) tokens["[Your High School]"] = profile.school_name;
  if (profile.location) tokens["[Location]"] = profile.location;
  if (profile.current_school_year) tokens["[School Year]"] = profile.current_school_year;
  if (profile.current_grade && profile.current_school_year) {
    const years = computeGradeYears(profile.current_grade, profile.current_school_year);
    Object.entries(years).forEach(([g, label]) => {
      tokens[`[${g}th Grade Year]`] = label;
    });
    const gradeNames = { 9: "9th Grade", 10: "10th Grade", 11: "11th Grade", 12: "12th Grade" };
    const grade = parseInt(profile.current_grade, 10);
    if (gradeNames[grade]) tokens["[Grade]"] = gradeNames[grade];
  }
  tokens["[Career Interest Programs]"] = careerProgramsBlock(profile);
  tokens["[Inspiration Colleges List]"] = inspirationCollegesBlock(profile);
  tokens["[Reach Schools List]"] = reachSchoolsBlock(profile);
  tokens["[School Clubs List]"] = clubsBlock(profile);
  tokens["[Outside School List]"] = outsideSchoolBlock(profile);
  tokens["[Creative Pursuits List]"] = creativePursuitsBlock(profile);
  if (profile.courses) tokens["[list current courses]"] = profile.courses;
  if (profile.clubs) tokens["[key clubs]"] = profile.clubs;
  return tokens;
}

function applyProfile(text, profile) {
  const tokens = profileTokens(profile);
  let result = text;
  for (const [placeholder, value] of Object.entries(tokens)) {
    result = result.split(placeholder).join(value);
  }
  return result;
}
