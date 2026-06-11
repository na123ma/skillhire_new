async function initDashboard() {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    window.location.href = "login.html";
    return;
  }

  if (role === "admin") {
    window.location.href = "admin-dashboard.html";
    return;
  }

  if (localStorage.getItem("examSubmitted") === "true") {
    localStorage.removeItem("examSubmitted");
  }

  try {
    const response = await fetch("http://localhost:5080/api/auth/profile", {
      headers: {
        Authorization: "Bearer " + token
      }
    });

    const user = await response.json();

    if (response.ok) {
      localStorage.setItem("userName", user.username || user.email || "Candidate");
      localStorage.setItem("userEmail", user.email || "candidate@skillhire.com");
      localStorage.setItem("user", JSON.stringify({
        name: user.username || user.email || "Candidate",
        fullName: user.username || user.email || "Candidate",
        email: user.email || "candidate@skillhire.com"
      }));
    }

    if (!response.ok) {
      alert(user.message || "Unable to load profile");
      window.location.href = "login.html";
      return;
    }

    const userInfo = document.getElementById("userInfo");
    if (userInfo) {
      userInfo.innerHTML = `
        <p>Welcome, <strong>${user.username || user.email}</strong></p>
        <p>Role: ${user.role || "user"}</p>
      `;
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = "login.html";
      });
    }

    const startTestBtn = document.getElementById("startTestBtn");
    if (user.testCompleted && startTestBtn) {
      startTestBtn.style.display = "none";
    }
  } catch (error) {
    console.error("Dashboard load failed:", error);
    alert("Unable to connect to the server.");
  }
}

initDashboard();

function openExamInFullscreen() {
  const examWindow = window.open(
    "exam.html",
    "_blank",
    "noopener=yes,fullscreen=yes,toolbar=no,menubar=no,location=no,status=no,resizable=yes,width=" +
      Math.max(1200, screen.availWidth) + ",height=" + Math.max(800, screen.availHeight)
  );

  if (examWindow) {
    examWindow.focus();
  }
}

const startTestBtn = document.getElementById("startTestBtn");
if (startTestBtn) {
  startTestBtn.addEventListener("click", (event) => {
    event.preventDefault();
    openExamInFullscreen();
  });
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement) || target.id !== "logoutBtn") {
    return;
  }

  event.preventDefault();
  localStorage.clear();
  sessionStorage.clear();
  window.location.href = "login.html";
});