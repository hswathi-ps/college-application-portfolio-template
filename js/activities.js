// Leadership Tracker widget, client-side/localStorage port of the
// server.py ACTIVITY_TRACKER_HTML widget. Used only by doc.html (the static
// build's doc viewer) -- the local Python-server build keeps using its own
// server-rendered, /api/activities-backed version untouched.

const ACTIVITIES_KEY = "portfolio_activities";

const ACTIVITY_TRACKER_MARKER = "<p>[Leadership Tracker Table]</p>";

const ACTIVITY_TRACKER_WIDGET_HTML = `
<div class="activity-tracker">
  <div class="activity-table-wrap">
    <table class="editable-table">
      <thead>
        <tr><th>Activity</th><th>9th</th><th>10th</th><th>11th</th><th>12th</th><th></th></tr>
      </thead>
      <tbody id="activityTableBody">
        <tr><td colspan="6" class="activity-empty">Loading…</td></tr>
      </tbody>
    </table>
  </div>
  <button type="button" class="btn-outline" onclick="addActivityRow()">+ Add Activity</button>
</div>
`;

const GRADE_FIELDS = ["grade_9", "grade_10", "grade_11", "grade_12"];

function loadActivitiesRaw() {
  try {
    const raw = localStorage.getItem(ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveActivitiesRaw(rows) {
  localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(rows));
}

// One-time seed, mirroring seed_activities_from_clubs() in server.py: if the
// tracker has never been used, give it a head start from the profile's
// School Clubs field.
function loadActivities() {
  let rows = loadActivitiesRaw();
  if (rows !== null) return rows;
  const profile = getProfile();
  const clubs = splitItems(profile.clubs);
  rows = clubs.map((name, idx) => ({
    id: idx + 1, name, grade_9: "", grade_10: "", grade_11: "", grade_12: "", sort_order: idx,
  }));
  saveActivitiesRaw(rows);
  return rows;
}

function nextActivityId(rows) {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}

function activityCellInput(row, field, placeholder, onSaved) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = row[field] || "";
  input.placeholder = placeholder;
  input.className = "activity-cell-input";
  input.addEventListener("change", () => {
    input.classList.remove("activity-cell-error");
    const rows = loadActivitiesRaw() || [];
    const target = rows.find(r => r.id === row.id);
    if (target) {
      target[field] = input.value;
      saveActivitiesRaw(rows);
    }
    if (onSaved) onSaved();
  });
  return input;
}

function renderActivityRows(rows) {
  const tbody = document.getElementById("activityTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!rows.length) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="activity-empty">No activities yet — click &ldquo;+ Add Activity&rdquo; to start tracking one.</td></tr>';
    return;
  }
  rows.forEach(row => {
    const tr = document.createElement("tr");

    const nameTd = document.createElement("td");
    nameTd.appendChild(activityCellInput(row, "name", "Activity name"));
    tr.appendChild(nameTd);

    GRADE_FIELDS.forEach(field => {
      const td = document.createElement("td");
      td.appendChild(activityCellInput(row, field, "Role/status"));
      tr.appendChild(td);
    });

    const delTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "activity-delete-btn";
    delBtn.title = "Remove this activity";
    delBtn.textContent = "×";
    delBtn.addEventListener("click", () => {
      if (!confirm(`Remove "${row.name || "this activity"}" from the tracker? This can't be undone.`)) return;
      const rows2 = (loadActivitiesRaw() || []).filter(r => r.id !== row.id);
      saveActivitiesRaw(rows2);
      renderActivityRows(rows2.slice().sort((a, b) => a.sort_order - b.sort_order));
    });
    delTd.appendChild(delBtn);
    tr.appendChild(delTd);

    tbody.appendChild(tr);
  });
}

window.addActivityRow = function () {
  const rows = loadActivitiesRaw() || [];
  const id = nextActivityId(rows);
  rows.push({ id, name: "", grade_9: "", grade_10: "", grade_11: "", grade_12: "", sort_order: rows.length });
  saveActivitiesRaw(rows);
  renderActivityRows(rows.slice().sort((a, b) => a.sort_order - b.sort_order));
};

function initActivityTracker() {
  if (!document.getElementById("activityTableBody")) return;
  const rows = loadActivities().slice().sort((a, b) => a.sort_order - b.sort_order);
  renderActivityRows(rows);
}
