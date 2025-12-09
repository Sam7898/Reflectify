document.addEventListener("DOMContentLoaded", () => {
    // -----------------------
    // THEME TOGGLE
    // -----------------------
    const themeToggle = document.getElementById("themeToggle");
    let darkMode = localStorage.getItem("darkMode") === null ? true : localStorage.getItem("darkMode") === "true";
  
    function applyTheme(isDark) {
      if (isDark) {
        document.body.style.background = "linear-gradient(135deg, #0033A0 0%, #0e1c45 100%)";
        document.documentElement.style.setProperty("--card", "rgba(255,255,255,0.7)");
      } else {
        document.body.style.background = "linear-gradient(135deg, #ffffff 0%, #eaeaea 100%)";
        document.documentElement.style.setProperty("--card", "rgba(255,255,255,0.9)");
      }
    }
  
    applyTheme(darkMode);
  
    themeToggle.addEventListener("click", () => {
      darkMode = !darkMode;
      applyTheme(darkMode);
      localStorage.setItem("darkMode", darkMode);
    });
  
    // -----------------------
    // PROFILE / SETTINGS DROPDOWN
    // -----------------------
    const profileBtn = document.getElementById("profileBtn");
    const profileMenu = document.getElementById("profileMenu");
  
    profileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle("show");
    });
  
    document.addEventListener("click", (e) => {
      if (!profileMenu.contains(e.target) && e.target !== profileBtn) {
        profileMenu.classList.remove("show");
      }
    });
  
    // -----------------------
    // FEEDBACK DASHBOARD
    // -----------------------
    const feedbackContainer = document.getElementById("feedbackList");
    const teacherFilter = document.getElementById("teacherFilter");
    const clearAllBtn = document.getElementById("clearBtn");
    const refreshBtn = document.getElementById("refreshBtn");
    const modal = document.getElementById("feedbackModal");
    const modalTeacher = document.getElementById("modalTeacher");
    const modalPositive = document.getElementById("modalPositive");
    const modalConstructive = document.getElementById("modalConstructive");
    const modalTimestamp = document.getElementById("modalTimestamp");
    const modalClose = document.querySelector(".close");
  
    const API_URL = "http://localhost:3000/feedback";
    let allFeedbackData = [];
  
    async function fetchAndRenderFeedback() {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Failed to fetch feedback");
        allFeedbackData = await res.json();
        updateTeacherDropdown();
        renderFilteredFeedback();
      } catch (err) {
        console.error(err);
        if (feedbackContainer) feedbackContainer.innerHTML = `<div class="feedback-card" style="color:red;">Failed to load feedback</div>`;
      }
    }
  
    function updateTeacherDropdown() {
      if (!teacherFilter) return;
      const prevSelection = teacherFilter.value;
      const teachers = [...new Set(allFeedbackData.map(f => f.teacher))].filter(Boolean).sort();
      teacherFilter.innerHTML = "";
      const allOption = document.createElement("option");
      allOption.value = "all";
      allOption.textContent = "All Teachers";
      teacherFilter.appendChild(allOption);
      teachers.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        teacherFilter.appendChild(opt);
      });
      teacherFilter.value = (prevSelection && (teachers.includes(prevSelection) || prevSelection === "all")) ? prevSelection : "all";
    }
  
    function renderFilteredFeedback() {
      if (!feedbackContainer) return;
      const selectedTeacher = teacherFilter ? teacherFilter.value : "all";
      const filtered = selectedTeacher === "all" ? allFeedbackData : allFeedbackData.filter(f => f.teacher === selectedTeacher);
  
      if (!filtered.length) {
        feedbackContainer.innerHTML = `<div class="empty">No feedback yet.</div>`;
        return;
      }
  
      feedbackContainer.innerHTML = "";
      filtered.forEach(fb => {
        const card = document.createElement("div");
        card.className = "feedback-card";
        card.innerHTML = `
          <div class="card-top">
            <span class="teacher">${fb.teacher}</span>
            <span class="meta">${new Date(fb.timestamp).toLocaleString()}</span>
          </div>
          <p class="feedback-positive"><strong>Positive:</strong> ${fb.positive || "None"}</p>
          <p class="feedback-constructive"><strong>Constructive:</strong> ${fb.constructive || "None"}</p>
        `;
        card.addEventListener("click", () => openModal(fb));
        feedbackContainer.appendChild(card);
      });
    }
  
    function openModal(fb) {
      if (!modal) return;
      modalTeacher.textContent = fb.teacher;
      modalPositive.textContent = fb.positive || "None";
      modalConstructive.textContent = fb.constructive || "None";
      modalTimestamp.textContent = new Date(fb.timestamp).toLocaleString();
      modal.classList.remove("hide");
    }
  
    function closeModal() {
      if (!modal) return;
      modal.classList.add("hide");
    }
  
    if (modalClose) modalClose.addEventListener("click", closeModal);
    window.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  
    if (teacherFilter) teacherFilter.addEventListener("change", renderFilteredFeedback);
    if (refreshBtn) refreshBtn.addEventListener("click", fetchAndRenderFeedback);
  
    // Clear all feedback
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to CLEAR ALL FEEDBACK? This cannot be undone.")) return;
        try {
          await fetch(API_URL, { method: "DELETE" });
          allFeedbackData = [];
          updateTeacherDropdown();
          renderFilteredFeedback();
          alert("All feedback cleared.");
        } catch (err) {
          console.error("Clear all error:", err);
          alert("Failed to clear feedback.");
        }
      });
    }
  
    fetchAndRenderFeedback();
  });