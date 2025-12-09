// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
    initUser();
    initTheme();
    initDropdown();
    initTabs();
    initForm();
    initModal();
    fetchAndRenderFeedback();
});

// ================= USER DATA =================
function initUser() {
    const user = JSON.parse(sessionStorage.getItem('user'));
    
    if (!user || user.role !== 'student') {
        window.location.href = '/';
        return;
    }

    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) {
        welcomeMsg.textContent = `Welcome, ${user.name}!`;
    }
}

// ================= THEME TOGGLE =================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    let darkMode = localStorage.getItem('studentDarkMode') !== 'false';

    applyTheme(darkMode);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            darkMode = !darkMode;
            applyTheme(darkMode);
            localStorage.setItem('studentDarkMode', darkMode);
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

// ================= TAB NAVIGATION =================
function initTabs() {
    const homeTab = document.getElementById('homeTab');
    const submittedTab = document.getElementById('submittedTab');
    const navLinks = document.querySelectorAll('.nav-link[data-tab]');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = link.dataset.tab;
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            if (tab === 'home') {
                homeTab.classList.add('active');
                submittedTab.classList.remove('active');
            } else {
                submittedTab.classList.add('active');
                homeTab.classList.remove('active');
                fetchAndRenderFeedback();
            }
        });
    });
}

// ================= FORM SUBMISSION =================
function initForm() {
    const studentForm = document.getElementById('studentForm');
    const thankMessage = document.getElementById('thankMessage');

    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const teacher = document.getElementById('teacherSelect').value;
            const positive = document.getElementById('positiveFeedback').value.trim();
            const constructive = document.getElementById('constructiveFeedback').value.trim();
            
            if (!teacher || !positive) {
                alert('Please select a teacher and enter positive feedback.');
                return;
            }

            try {
                const res = await fetch('http://localhost:3000/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ teacher, positive, constructive, timestamp: new Date().toISOString() })
                });
                
                if (!res.ok) throw new Error('Failed to submit feedback');

                // Clear form
                document.getElementById('positiveFeedback').value = '';
                document.getElementById('constructiveFeedback').value = '';
                document.getElementById('teacherSelect').value = '';

                // Show thank you message
                thankMessage.classList.add('show');
                setTimeout(() => thankMessage.classList.remove('show'), 4000);
            } catch (err) {
                console.error(err);
                alert('Failed to submit feedback. Please try again.');
            }
        });
    }
}

// ================= FETCH AND RENDER FEEDBACK =================
let allFeedbackData = [];

async function fetchAndRenderFeedback() {
    const feedbackContainer = document.getElementById('feedbackList');
    if (!feedbackContainer) return;

    try {
        const res = await fetch('http://localhost:3000/feedback');
        allFeedbackData = await res.json();
        renderFeedbackList();
    } catch (err) {
        feedbackContainer.innerHTML = '<div class="empty" style="color:#e53935">Failed to load feedback.</div>';
        console.error(err);
    }
}

function renderFeedbackList() {
    const feedbackContainer = document.getElementById('feedbackList');
    feedbackContainer.innerHTML = '';
    
    if (!allFeedbackData.length) {
        feedbackContainer.innerHTML = '<div class="empty">No feedback submitted yet. Go to Home to submit your first feedback!</div>';
        return;
    }
    
    const sorted = [...allFeedbackData].reverse();
    sorted.forEach(fb => {
        const card = document.createElement('div');
        card.className = 'feedback-card';
        card.innerHTML = `
            <div class="card-top">
                <span class="teacher">${fb.teacher}</span>
                <span class="meta">${new Date(fb.timestamp).toLocaleString()}</span>
            </div>
            <p class="feedback-positive"><strong>Positive:</strong> ${fb.positive || 'None'}</p>
            <p class="feedback-constructive"><strong>Constructive:</strong> ${fb.constructive || 'None'}</p>
        `;
        card.addEventListener('click', () => openModal(fb));
        feedbackContainer.appendChild(card);
    });
}

// ================= MODAL =================
function initModal() {
    const modal = document.getElementById('feedbackModal');
    const modalClose = modal?.querySelector('.close');

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

function openModal(fb) {
    const modal = document.getElementById('feedbackModal');
    document.getElementById('modalTeacher').textContent = fb.teacher;
    document.getElementById('modalPositive').textContent = fb.positive || 'None';
    document.getElementById('modalConstructive').textContent = fb.constructive || 'None';
    document.getElementById('modalTimestamp').textContent = new Date(fb.timestamp).toLocaleString();
    modal.classList.remove('hide');
}

function closeModal() {
    document.getElementById('feedbackModal').classList.add('hide');
}
