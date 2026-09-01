// Course/Grade tracker widget, client-side/localStorage port of the
// server.py COURSE_TRACKER_HTML/COURSE_TRACKER_SCRIPT widgets. Used only by
// doc.html -- the local Python-server build keeps its own
// /api/courses-backed version untouched.

const COURSES_KEY = "portfolio_courses";

function courseTableMarker(gradeLevel) {
  return `<p>[Course Table ${gradeLevel}]</p>`;
}

function courseTableWidgetHTML(gradeLevel) {
  return `
<div class="course-tracker" data-grade-level="${gradeLevel}">
  <div class="activity-table-wrap">
    <table class="editable-table">
      <thead>
        <tr><th>Subject</th><th>Course</th><th>Grade</th><th></th></tr>
      </thead>
      <tbody>
        <tr><td colspan="4" class="activity-empty">Loading…</td></tr>
      </tbody>
    </table>
  </div>
  <button type="button" class="btn-outline" onclick="addCourseRow(this)">+ Add Subject</button>
</div>
`;
}

function loadCoursesRaw() {
  try {
    const raw = localStorage.getItem(COURSES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCoursesRaw(rows) {
  localStorage.setItem(COURSES_KEY, JSON.stringify(rows));
}

// One-time seed, mirroring seed_courses() in server.py: every grade level
// gets a row per standard subject to fill in.
function loadCourses() {
  let rows = loadCoursesRaw();
  if (rows !== null) return rows;
  rows = [];
  let id = 1;
  COURSE_TABLE_GRADES.forEach(gradeLevel => {
    DEFAULT_SUBJECTS.forEach((subject, idx) => {
      rows.push({ id: id++, grade_level: gradeLevel, subject, course_name: "", grade_earned: "", sort_order: idx });
    });
  });
  saveCoursesRaw(rows);
  return rows;
}

function nextCourseId(rows) {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function courseCellInput(row, field, placeholder) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = row[field] || "";
  input.placeholder = placeholder;
  input.className = "activity-cell-input";
  input.addEventListener("change", () => {
    input.classList.remove("activity-cell-error");
    const rows = loadCoursesRaw() || [];
    const target = rows.find(r => r.id === row.id);
    if (target) {
      target[field] = input.value;
      saveCoursesRaw(rows);
    }
  });
  return input;
}

function renderCourseTable(container, rows) {
  const tbody = container.querySelector("tbody");
  tbody.innerHTML = "";
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="activity-empty">No subjects yet — click &ldquo;+ Add Subject&rdquo; to start.</td></tr>';
    return;
  }
  rows.forEach(row => {
    const tr = document.createElement("tr");

    const subjTd = document.createElement("td");
    subjTd.appendChild(courseCellInput(row, "subject", "Subject"));
    tr.appendChild(subjTd);

    const courseTd = document.createElement("td");
    courseTd.appendChild(courseCellInput(row, "course_name", "Course name"));
    tr.appendChild(courseTd);

    const gradeTd = document.createElement("td");
    gradeTd.appendChild(courseCellInput(row, "grade_earned", "e.g. A-"));
    tr.appendChild(gradeTd);

    const delTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "activity-delete-btn";
    delBtn.title = "Remove this subject";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Remove "${row.subject || "this subject"}" from this year? This can't be undone.`)) return;
      const rows2 = (loadCoursesRaw() || []).filter(r => r.id !== row.id);
      saveCoursesRaw(rows2);
      renderAllCourseTrackers();
    });
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);

    tbody.appendChild(tr);
  });
}

function renderAllCourseTrackers() {
  const containers = document.querySelectorAll(".course-tracker");
  const allRows = loadCourses();
  containers.forEach(container => {
    const gradeLevel = container.dataset.gradeLevel;
    const rows = allRows
      .filter(r => String(r.grade_level) === gradeLevel)
      .sort((a, b) => a.sort_order - b.sort_order);
    renderCourseTable(container, rows);
  });
}

window.addCourseRow = function (btn) {
  const gradeLevel = btn.closest(".course-tracker").dataset.gradeLevel;
  const rows = loadCoursesRaw() || [];
  const inGrade = rows.filter(r => String(r.grade_level) === gradeLevel);
  const maxOrder = inGrade.reduce((max, r) => Math.max(max, r.sort_order), -1);
  rows.push({
    id: nextCourseId(rows), grade_level: gradeLevel, subject: "", course_name: "", grade_earned: "", sort_order: maxOrder + 1,
  });
  saveCoursesRaw(rows);
  renderAllCourseTrackers();
};

function initCourseTrackers() {
  if (!document.querySelector(".course-tracker")) return;
  renderAllCourseTrackers();
}
