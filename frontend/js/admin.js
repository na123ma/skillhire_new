const token = localStorage.getItem("token");
const role = localStorage.getItem("role");
const resultsTableBody = document.getElementById("resultsTableBody");
const statusText = document.getElementById("statusText");

if (!token || role !== "admin") {
  window.location.href = "index.html";
}

async function loadAdminData() {
  try {
    const [dashboardResponse, resultsResponse, violationsResponse, usersResponse] = await Promise.all([
      fetch("https://skillhire-new.onrender.com/api/admin/dashboard", {
        headers: { Authorization: "Bearer " + token }
      }),
      fetch("https://skillhire-new.onrender.com/api/admin/results", {
        headers: { Authorization: "Bearer " + token }
      }),
      fetch("https://skillhire-new.onrender.com/api/admin/violations", {
        headers: { Authorization: "Bearer " + token }
      }),
      fetch("https://skillhire-new.onrender.com/api/admin/users", {
        headers: { Authorization: "Bearer " + token }
      })
    ]);

    const dashboard = await dashboardResponse.json();
    const results = await resultsResponse.json();
    const violations = await violationsResponse.json();
    const users = await usersResponse.json();

    if (!dashboardResponse.ok || !resultsResponse.ok || !violationsResponse.ok || !usersResponse.ok) {
      throw new Error((dashboard.message || results.message || violations.message || users.message) || "Unable to load admin data");
    }

    document.getElementById("totalUsers").textContent = dashboard.totalUsers || 0;
    document.getElementById("totalResults").textContent = dashboard.totalResults || 0;
    document.getElementById("totalViolations").textContent = dashboard.totalViolations || 0;

    const violationMap = Array.isArray(violations)
      ? violations.reduce((acc, item) => {
          const id = item.userId && item.userId._id ? item.userId._id : item.userId;
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {})
      : {};

    const resultsByUser = new Map(
      Array.isArray(results)
        ? results.map((item) => [String(item.userId?._id || item.userId), item])
        : []
    );

    const rows = Array.isArray(users) && users.length
      ? users.map((user) => {
          const userId = String(user._id || "");
          const result = resultsByUser.get(userId);
          const score = result?.totalScore ?? (result?.aptitudeScore || 0) + (result?.reasoningScore || 0);
          const percent = typeof result?.percentage === "number" ? result.percentage.toFixed(2) : "0.00";
          const submittedAt = result?.createdAt ? new Date(result.createdAt).toLocaleString() : "Not attempted";
          const violationCount = violationMap[userId] || 0;
          const statusTextValue = result ? "Submitted" : "Pending";
          const downloadButton = result
            ? `<button class="btn small" onclick="downloadCandidateAnswers('${userId}')">Download Answers</button>`
            : `<button class="btn small" disabled>No result</button>`;

          return `
            <tr>
              <td>${user.username || "Unknown Candidate"}</td>
              <td>${user.email || "—"}</td>
              <td>${result ? score : "—"}</td>
              <td>${result ? `${percent}%` : "—"}</td>
              <td>${violationCount}</td>
              <td>${submittedAt}</td>
              <td>${statusTextValue}</td>
              <td>${downloadButton}</td>
            </tr>
          `;
        })
      : [];

    if (!rows.length) {
      statusText.textContent = "No candidates found.";
      resultsTableBody.innerHTML = "<tr><td colspan='8'>No candidates available.</td></tr>";
      return;
    }

    statusText.textContent = `${rows.length} candidate(s) shown (${results.length} submitted, ${rows.length - results.length} pending)`;
    resultsTableBody.innerHTML = rows.join("");
  } catch (error) {
    console.error("Admin dashboard error:", error);
    statusText.textContent = error.message;
    resultsTableBody.innerHTML = "<tr><td colspan='6'>Unable to load results.</td></tr>";
  }
}

async function downloadCandidateAnswers(userId) {
  try {
    const response = await fetch(`https://skillhire-new.onrender.com/api/admin/results/export/${userId}`, {
      headers: { Authorization: "Bearer " + token }
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Unable to download candidate answers");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `candidate-answers-${userId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Download error:", error);
    alert(error.message);
  }
}

function downloadCsv() {
  const rows = Array.from(resultsTableBody.querySelectorAll("tr"));

  if (!rows.length) {
    alert("No results available to export.");
    return;
  }

  const csvRows = [
    ["Candidate", "Email", "Score", "Percentage", "Violations", "Submitted"],
    ...rows.map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent.trim()))
  ];

  const csvContent = csvRows
    .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
    .join("\r\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "candidate-results.csv";
  link.click();
  URL.revokeObjectURL(url);
}

loadAdminData();

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "index.html";
});

document.getElementById("exportBtn").addEventListener("click", downloadCsv);
