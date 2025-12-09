// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    initUser();
    initTheme();
    initDropdown();
    loadStats();
});

// ================= USER DATA =================
function initUser() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (!user || user.role !== 'teacher') {
        window.location.href = '/';
        return;
    }

    // Set welcome message
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) {
        welcomeMsg.textContent = `Welcome, ${user.name}!`;
    }
}

// ================= THEME TOGGLE =================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    let darkMode = localStorage.getItem('teacherDarkMode') !== 'false';

    applyTheme(darkMode);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            darkMode = !darkMode;
            applyTheme(darkMode);
            localStorage.setItem('teacherDarkMode', darkMode);
        });
    }
}

function applyTheme(isDark) {
    if (isDark) {
        document.body.classList.remove('light-mode');
    } else {
        document.body.classList.add('light-mode');
    }
}

// ================= DROPDOWN =================
function initDropdown() {
    const profileBtn = document.getElementById('profileBtn');
    const profileMenu = document.getElementById('profileMenu');

    if (profileBtn && profileMenu) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle('show');
            profileMenu.classList.toggle('hide');
        });

        document.addEventListener('click', (e) => {
            if (!profileMenu.contains(e.target) && e.target !== profileBtn) {
                profileMenu.classList.remove('show');
                profileMenu.classList.add('hide');
            }
        });
    }
}

// ================= STATS =================
async function loadStats() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    if (!user || !user.teacherName) return;

    try {
        const res = await fetch(`http://localhost:3000/feedback/teacher/${user.teacherName}`);
        const data = await res.json();

        const feedbackCount = document.getElementById('feedbackCount');
        const totalFeedback = document.getElementById('totalFeedback');
        const positiveRatio = document.getElementById('positiveRatio');

        if (feedbackCount) feedbackCount.textContent = `${data.length} total`;
        if (totalFeedback) totalFeedback.textContent = data.length;

        if (positiveRatio) {
            const positiveOnly = data.filter(f => !f.constructive || !f.constructive.trim()).length;
            const ratio = data.length > 0 ? Math.round((positiveOnly / data.length) * 100) : 0;
            positiveRatio.textContent = `${ratio}%`;
        }
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

// Refresh stats every 15 seconds
setInterval(loadStats, 15000);

