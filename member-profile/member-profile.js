import {
    auth,
    getMemberById,
    getReports,
    getReport,
    addReport,
    updateReport,
    deleteReport,
    uploadToCloudinary,
    updateFamilyMember,
    getUserData,
    onAuthStateChanged,
    logoutUser,
} from "../firebase.js";

let memberId = null;
let memberData = null;
let reports = [];
let deleteTarget = null;
let currentViewReport = null;

const GEMINI_API_KEY = ''; // Get yours at https://makersuite.google.com/app/apikey
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;

const $ = (id) => document.getElementById(id);

// Sidebar elements
const sidebar = document.getElementById('sidebar');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');

function toggleSidebar() {
    sidebar.classList.toggle('open');
    hamburgerBtn.classList.toggle('open');
    sidebarOverlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
}

function closeSidebar() {
    sidebar.classList.remove('open');
    hamburgerBtn.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleSidebar);
}

if (sidebarCloseBtn) {
    sidebarCloseBtn.addEventListener('click', closeSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeSidebar();
    }
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 1024 && sidebar.classList.contains('open')) {
        closeSidebar();
    }
});

document.querySelectorAll('.sidebar nav a').forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
            closeSidebar();
        }
    });
});

const loadingState = $('loadingState');
const errorState = $('errorState');
const profileContent = $('profileContent');
const breadcrumb = $('breadcrumb');

const profileAvatar = $('profileAvatar');
const memberName = $('memberName');
const memberAge = $('memberAge');
const memberGender = $('memberGender');
const memberBloodGroup = $('memberBloodGroup');
const memberRelation = $('memberRelation');
const memberPhone = $('memberPhone');
const memberEmergency = $('memberEmergency');

const reportsGrid = $('reportsGrid');
const noReports = $('noReports');
const uploadReportBtn = $('uploadReportBtn');
const editProfileBtn = $('editProfileBtn');
const logoutBtn = $('logoutBtn');

const uploadModal = $('uploadModal');
const editProfileModal = $('editProfileModal');
const viewImageModal = $('viewImageModal');
const confirmModal = $('confirmModal');

const reportFileInput = $('reportFileInput');
const uploadDropzone = $('uploadDropzone');
const uploadPreview = $('uploadPreview');
const previewImage = $('previewImage');
const changeImageBtn = $('changeImageBtn');
const submitUploadBtn = $('submitUploadBtn');

const editProfileForm = $('editProfileForm');
const toastContainer = $('toastContainer');

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

onAuthStateChanged(auth, async(user) => {
    if (!user) {
        location.href = "../auth/login.html";
        return;
    }

    const params = new URLSearchParams(location.search);
    memberId = params.get('id');

    if (!memberId) {
        showError();
        return;
    }

    await loadProfile();
});

async function loadProfile() {
    try {
        loadingState.style.display = 'flex';
        errorState.style.display = 'none';
        profileContent.style.display = 'none';

        memberData = await getMemberById(memberId);

        if (!memberData) {
            showError();
            return;
        }

        renderProfile();
        await loadReports();

        loadingState.style.display = 'none';
        profileContent.style.display = 'block';

    } catch (err) {
        console.error('Load profile error:', err);
        showError();
    }
}

function showError() {
    loadingState.style.display = 'none';
    profileContent.style.display = 'none';
    errorState.style.display = 'flex';
}

function renderProfile() {
    const initials = memberData.name ?
        memberData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) :
        '?';

    profileAvatar.textContent = initials;
    memberName.textContent = memberData.name || '—';
    memberAge.textContent = memberData.age ? `${memberData.age} years` : '—';
    memberGender.textContent = memberData.gender || '—';
    memberBloodGroup.textContent = memberData.bloodGroup || '—';
    memberRelation.textContent = memberData.relation || '—';
    memberPhone.textContent = memberData.phone || '—';
    memberEmergency.textContent = memberData.emergencyContact || '—';
    breadcrumb.textContent = memberData.name || 'Profile';
}

async function loadReports() {
    try {
        reports = await getReports(memberId);

        reports.sort((a, b) => {
            const dateA = a.createdAt ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
        });

        renderReports();
    } catch (err) {
        console.error('Load reports error:', err);
    }
}

function formatDate(date) {
    if (!date) return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateFromTimestamp(timestamp) {
    if (!timestamp) return '—';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDate(date);
}

function renderReports() {
    reportsGrid.innerHTML = '';

    if (reports.length === 0) {
        noReports.style.display = 'flex';
        reportsGrid.style.display = 'none';
        return;
    }

    noReports.style.display = 'none';
    reportsGrid.style.display = 'grid';

    reports.forEach((report, index) => {
        const card = document.createElement('div');
        card.className = 'report-card';
        card.style.animationDelay = `${index * 0.05}s`;

        const createdAt = formatDateFromTimestamp(report.createdAt);

        card.innerHTML = `
            <div class="report-image-wrapper">
                <img src="${escapeHtml(report.imageUrl)}" alt="Medical Report" loading="lazy" class="report-thumbnail">
                <div class="report-image-overlay">
                    <button class="overlay-view-btn" data-id="${report.id}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                </div>
            </div>
            <div class="report-card-footer">
                <span class="report-created">${createdAt}</span>
                <button class="delete-btn" data-id="${report.id}" title="Delete report">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </div>
        `;

        const viewBtn = card.querySelector('.overlay-view-btn');
        viewBtn.addEventListener('click', () => viewReportImage(report));

        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            promptDeleteReport(report);
        });

        reportsGrid.appendChild(card);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== AI REPORT ANALYSIS ====================

async function imageToBase64(imageUrl) {
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error('Failed to fetch image');
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            const base64 = result.split(',')[1];
            resolve({ base64, mimeType: blob.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function generateAiSummary(base64, mimeType) {
    const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [{
                        text: 'Analyze this medical report image and provide a concise summary. Include any notable findings, test results, diagnoses, or recommendations mentioned. Keep the summary clear and easy to understand.'
                    },
                    {
                        inline_data: { mime_type: mimeType, data: base64 }
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ? err.error.message || 'AI analysis failed' : 'AI analysis failed');
    }

    const data = await response.json();
    return data.candidates && data.candidates.length > 0 ?
        data.candidates[0].content.parts[0].text || 'No summary could be generated.' :
        'No summary could be generated.';
}


let aiStatusTimer = null;
let streamTimer = null;

async function handleAiAnalyze(forceRegenerate = false) {
    const emptyState = $('aiEmptyState');
    const loading = $('aiLoading');
    const summaryEl = $('aiSummary');
    const sidebar = $('aiSidebar');
    const statusEl = $('aiStatusText');

    if (!currentViewReport) return;

    emptyState.style.display = 'none';
    loading.style.display = 'flex';
    summaryEl.style.display = 'none';
    sidebar.classList.add('is-processing');

    const statuses = [
        'Report ko scan kar raha hoon...',
        'Test values nikal raha hoon...',
        'Reference ranges check ho rahi hain...',
        'Key findings identify ho rahi hain...',
        'Summary likha ja raha hai...'
    ];
    let si = 0;
    aiStatusTimer = setInterval(() => {
        si = (si + 1) % statuses.length;
        if (statusEl) statusEl.textContent = statuses[si];
    }, 1400);

    try {
        if (!forceRegenerate) {
            const report = await getReport(memberId, currentViewReport.id);
            if (report && report.summary) {
                clearInterval(aiStatusTimer);
                aiStatusTimer = null;
                sidebar.classList.remove('is-processing');
                renderSummary(report.summary, report.summaryGeneratedAt, false);
                return;
            }
        }

        const { base64, mimeType } = await imageToBase64(currentViewReport.imageUrl);
        const summary = await generateAiSummary(base64, mimeType);
        const generatedAt = new Date().toISOString();

        await updateReport(memberId, currentViewReport.id, { summary, summaryGeneratedAt: generatedAt });
        currentViewReport.summary = summary;
        currentViewReport.summaryGeneratedAt = generatedAt;

        clearInterval(aiStatusTimer);
        aiStatusTimer = null;
        sidebar.classList.remove('is-processing');
        renderSummary(summary, generatedAt, true);

    } catch (err) {
        clearInterval(aiStatusTimer);
        aiStatusTimer = null;
        sidebar.classList.remove('is-processing');
        console.error('AI Analyze error:', err);
        showToast(err.message || 'AI analysis failed. Please try again.', 'error');
        emptyState.style.display = 'flex';
        loading.style.display = 'none';
    }
}


// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success' ?
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` :
        `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

    toast.innerHTML = `${icon}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    setTimeout(() => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showLoadingToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-loading';

    toast.innerHTML = `
        <div class="toast-spinner"></div>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    return toast;
}

function removeToast(toast) {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 300);
}

// ==================== UPLOAD REPORT (Image Only) ====================

let selectedFile = null;

uploadReportBtn.addEventListener('click', () => {
    selectedFile = null;
    reportFileInput.value = '';
    uploadDropzone.style.display = 'flex';
    uploadPreview.style.display = 'none';
    submitUploadBtn.disabled = true;
    submitUploadBtn.textContent = 'Upload Report';
    uploadModal.style.display = 'flex';
});

$('closeModalBtn').addEventListener('click', () => {
    uploadModal.style.display = 'none';
});

uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) uploadModal.style.display = 'none';
});

uploadDropzone.addEventListener('click', () => {
    reportFileInput.click();
});

uploadDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropzone.classList.add('drag-over');
});

uploadDropzone.addEventListener('dragleave', () => {
    uploadDropzone.classList.remove('drag-over');
});

uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

reportFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleFileSelect(file);
    }
});

changeImageBtn.addEventListener('click', () => {
    reportFileInput.value = '';
    selectedFile = null;
    uploadDropzone.style.display = 'flex';
    uploadPreview.style.display = 'none';
    submitUploadBtn.disabled = true;
});

function handleFileSelect(file) {
    if (!ALLOWED_TYPES.includes(file.type)) {
        showToast('Please select a valid image (JPG, PNG, WebP, or GIF)', 'error');
        reportFileInput.value = '';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        showToast('Image must be less than 10MB', 'error');
        reportFileInput.value = '';
        return;
    }

    selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        previewImage.src = e.target.result;
        uploadDropzone.style.display = 'none';
        uploadPreview.style.display = 'flex';
        submitUploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
}

submitUploadBtn.addEventListener('click', async() => {
    if (!selectedFile) return;

    submitUploadBtn.disabled = true;
    submitUploadBtn.textContent = 'Uploading...';

    const loadingToast = showLoadingToast('Uploading report to Cloudinary...');

    try {
        const imageUrl = await uploadToCloudinary(selectedFile);

        loadingToast.querySelector('span').textContent = 'Saving to database...';

        await addReport(memberId, { imageUrl });

        removeToast(loadingToast);
        showToast('Report uploaded successfully', 'success');

        uploadModal.style.display = 'none';
        await loadReports();

    } catch (err) {
        console.error('Upload error:', err);
        removeToast(loadingToast);
        showToast(err.message || 'Failed to upload report', 'error');
    } finally {
        submitUploadBtn.disabled = false;
        submitUploadBtn.textContent = 'Upload Report';
    }
});

// ==================== VIEW REPORT IMAGE (Full Screen) ====================

function viewReportImage(report) {
    const fullImage = $('viewImageFull');
    const dateEl = $('viewImageDate');
    const emptyState = $('aiEmptyState');
    const loading = $('aiLoading');
    const summaryEl = $('aiSummary');

    currentViewReport = report;
    fullImage.src = report.imageUrl;
    fullImage.alt = 'Medical Report';
    resetZoom();
    resetParallax();
    viewImageModal.classList.remove('sidebar-open');

    const createdAt = formatDateFromTimestamp(report.createdAt);
    dateEl.textContent = `Uploaded ${createdAt}`;

    if (report.summary) {
        renderSummary(report.summary, report.summaryGeneratedAt, false);
    } else {
        emptyState.style.display = 'flex';
        loading.style.display = 'none';
        summaryEl.style.display = 'none';
    }

    viewImageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    peekToolbar();
}

const ICONS = {
    bp: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z"/><polyline points="8 12 10.5 12 11.5 9 13 15 14.5 12 16 12"/></svg>`,
    heart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    droplet: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>`,
    lipid: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6"/><path d="M10 3v4.2L6.4 15a2.8 2.8 0 0 0 2.5 4h6.2a2.8 2.8 0 0 0 2.5-4L14 7.2V3"/><line x1="7.6" y1="15.5" x2="16.4" y2="15.5"/></svg>`,
    lungs: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 3C8.7 4.5 8.2 6 8.2 7.6v1.2l-2.1 1.5A2.7 2.7 0 0 0 5 13.6V17c0 1.8 1.4 3 3.2 3h.5c1.9 0 2.8-1.4 2.8-3.2v-4.3c0-1.9-1.4-3-2.9-3-.9 0-1.8.5-1.8 1.4"/><path d="M14.4 3c.9 1.5 1.4 3 1.4 4.6v1.2l2.1 1.5A2.7 2.7 0 0 1 19 13.6V17c0 1.8-1.4 3-3.2 3h-.5c-1.9 0-2.8-1.4-2.8-3.2v-4.3c0-1.9 1.4-3 2.9-3 .9 0 1.8.5 1.8 1.4"/></svg>`,
    thermo: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 14.76V5a2 2 0 0 0-4 0v9.76a4 4 0 1 0 4 0z"/><path d="M10 17.5a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/></svg>`,
    scale: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M8 21h8"/><path d="M12 8l-5.2-4M12 8l5.2-4"/><path d="M5.5 8.5 3 14a3 3 0 0 0 6 0l-2.5-5.5z"/><path d="M18.5 8.5 16 14a3 3 0 0 0 6 0l-2.5-5.5z"/></svg>`,
    cells: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>`,
    note: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>`
};

const CARD_RULES = [
    { re: /blood pressure|\bbp\b/i, label: 'Blood Pressure', metric: 'bp', icon: 'bp' },
    { re: /heart rate|pulse|\bhr\b|\bbpm\b/i, label: 'Heart Rate', metric: 'hr', icon: 'heart' },
    { re: /glucose|sugar|hba1c|\ba1c\b/i, label: 'Glucose', metric: 'glucose', icon: 'droplet' },
    { re: /cholesterol|ldl|hdl|triglyceride|lipid/i, label: 'Lipid Panel', metric: 'lipid', icon: 'lipid' },
    { re: /hemoglobin|\bhb\b|\bhgb\b/i, label: 'Hemoglobin', metric: 'hb', icon: 'droplet' },
    { re: /oxygen|spo2|o2\s*sat|saturation|pulse ox/i, label: 'Blood Oxygen', metric: 'spo2', icon: 'lungs' },
    { re: /temperature|\btemp\b/i, label: 'Temperature', metric: 'temp', icon: 'thermo' },
    { re: /bmi|body mass|\bweight\b/i, label: 'Body Metrics', metric: 'bmi', icon: 'scale' },
    { re: /wbc|white blood|rbc|red blood|platelet|blood cell|esr|crp/i, label: 'Blood Work', metric: 'count', icon: 'cells' }
];

const LEVEL_META = { normal: 'Normal', warn: 'Watch', alert: 'Concerning' };

const VERDICT_META = {
    normal: { title: 'All clear', sub: 'No concerning values detected', chip: 'In Range' },
    warn: { title: 'Monitor closely', sub: 'Some values need your attention', chip: 'Needs Watch' },
    alert: { title: 'Consult your doctor', sub: 'Values warrant professional review', chip: 'Action Needed' }
};

const HEADING_RE = /^(key findings|findings|results?|test results?|diagnosis|diagnoses|recommendations?|conclusion|summary|overview|analysis|impression|next steps|notes|overall assessment)\s*:?$/i;

function stripMd(s) {
    return String(s).replace(/\*\*/g, '').trim();
}

function isHeadingLine(line, stripped) {
    if (/^#{1,3}\s/.test(line)) return true;
    if (/^\*\*[^*]{3,40}\*\*$/.test(line)) return true;
    return HEADING_RE.test(stripped.replace(/[:#*]+/g, '').trim());
}

function isBulletLine(stripped) {
    return /^[-*•▪]\s+/.test(stripped) || /^\d+[.)]\s+/.test(stripped);
}

function matchCardLine(stripped) {
    const m = stripped.match(/^([A-Za-z][A-Za-z0-9 .&()'%/-]{2,48}?)\s*[:=]\s*(.{1,90})$/);
    if (!m) return null;
    const label = m[1].trim();
    const value = m[2].trim();
    if (HEADING_RE.test(label)) return null;
    const rule = CARD_RULES.find(r => r.re.test(label));
    if (!rule) return null;
    return { label, value, rule };
}

function classifyCard(metric, valueText) {
    const v = valueText.toLowerCase();
    const firstNum = () => {
        const m = valueText.match(/(\d+(?:\.\d+)?)/);
        return m ? parseFloat(m[1]) : null;
    };
    const numPair = () => {
        const m = valueText.match(/(\d+(?:\.\d+)?)\s*[/:–-]\s*(\d+(?:\.\d+)?)/);
        return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
    };

    let level = 'normal';
    if (/\b(critical|abnormal|out of range|anomal|danger|severe|urgent|worse)\b/.test(v)) level = 'alert';
    else if (/\b(high|elevated|increased|raised|above|borderline|low|below|decreased|reduced|impaired|slightly|mildly|watch|caution|concerning)\b/.test(v)) level = 'warn';

    if (level === 'normal') {
        if (metric === 'bp') {
            const p = numPair();
            if (p) {
                const [s, d] = p;
                if (s >= 140 || d >= 90) level = 'alert';
                else if (s >= 130 || d >= 80) level = 'warn';
            } else {
                const s = firstNum();
                if (s !== null && s >= 140) level = 'alert';
                else if (s !== null && s >= 130) level = 'warn';
            }
        } else if (metric === 'glucose') {
            const g = firstNum();
            if (g !== null) {
                if (g >= 180) level = 'alert';
                else if (g >= 130) level = 'warn';
            }
        } else if (metric === 'spo2') {
            const o = firstNum();
            if (o !== null) {
                if (o < 92) level = 'alert';
                else if (o < 95) level = 'warn';
            }
        } else if (metric === 'hr') {
            const h = firstNum();
            if (h !== null) {
                if (h > 110 || h < 50) level = 'alert';
                else if (h > 95) level = 'warn';
            }
        } else if (metric === 'hb') {
            const h = firstNum();
            if (h !== null) {
                if (h < 10) level = 'alert';
                else if (h < 12 || h > 17) level = 'warn';
            }
        } else if (metric === 'temp') {
            const t = firstNum();
            if (t !== null) {
                if (t > 101.5) level = 'alert';
                else if (t > 100 || t < 96) level = 'warn';
            }
        } else if (metric === 'bmi') {
            const b = firstNum();
            if (b !== null) {
                if (b >= 30) level = 'alert';
                else if (b >= 25) level = 'warn';
            }
        } else if (metric === 'lipid') {
            const n = firstNum();
            if (n !== null) {
                if (n >= 240) level = 'alert';
                else if (n >= 200) level = 'warn';
            }
        }
    }
    return level;
}

function decorateValue(text) {
    const t = escapeHtml(text);
    return t.split(/(\s+)/).map(tok => {
        if (/\d/.test(tok) && /^[\d.,/:×xX–-]+[a-zA-Z°%µμg]*$/.test(tok)) {
            return `<b class="metric-num">${tok}</b>`;
        }
        return tok;
    }).join('');
}

function buildSummaryDom(text) {
    const blocks = [];
    let cards = [];
    let pendingPara = '';
    const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean);

    const flushCards = () => {
        if (cards.length) {
            blocks.push({ type: 'cards', items: cards });
            cards = [];
        }
    };
    const flushPara = () => {
        if (pendingPara) {
            blocks.push({ type: 'para', text: pendingPara });
            pendingPara = '';
        }
    };

    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        const stripped = stripMd(line);

        const card = matchCardLine(stripped);
        if (card) {
            flushPara();
            cards.push({
                type: 'card',
                label: card.rule.label,
                displayLabel: card.label,
                value: card.value,
                metric: card.rule.metric,
                icon: card.rule.icon,
                level: classifyCard(card.rule.metric, card.value)
            });
            i++;
            continue;
        }

        if (isHeadingLine(line, stripped)) {
            flushPara();
            flushCards();
            blocks.push({ type: 'heading', text: stripped.replace(/^#{1,3}\s*/, '').replace(/^\*+|\*+$/g, '').trim() });
            i++;
            continue;
        }

        if (isBulletLine(stripped)) {
            flushPara();
            flushCards();
            const items = [];
            while (i < lines.length) {
                const s = stripMd(lines[i]);
                if (!isBulletLine(s)) break;
                items.push(s.replace(/^[-*•▪]\s+/, '').replace(/^\d+[.)]\s+/, ''));
                i++;
            }
            blocks.push({ type: 'list', items });
            continue;
        }

        pendingPara = pendingPara ? pendingPara + ' ' + stripped : stripped;
        i++;
    }

    flushPara();
    flushCards();

    const allCards = blocks.filter(b => b.type === 'cards').flatMap(b => b.items);
    let verdict = 'normal';
    if (allCards.some(c => c.level === 'alert')) verdict = 'alert';
    else if (allCards.some(c => c.level === 'warn')) verdict = 'warn';

    return { blocks, verdict };
}

function createSummaryContent(blocks, verdict) {
    const frag = document.createDocumentFragment();
    let n = 0;

    const verdictEl = document.createElement('div');
    verdictEl.className = `ai-verdict level-${verdict}`;
    verdictEl.style.setProperty('--d', '0.05s');
    verdictEl.innerHTML = `
        <span class="ai-verdict-dot"></span>
        <div class="ai-verdict-text">
            <strong>${VERDICT_META[verdict].title}</strong>
            <span>${VERDICT_META[verdict].sub}</span>
        </div>
        <span class="ai-verdict-chip">${VERDICT_META[verdict].chip}</span>`;
    frag.appendChild(verdictEl);
    n++;

    blocks.forEach(block => {
        if (block.type === 'heading') {
            const el = document.createElement('h4');
            el.className = 'summary-heading';
            el.style.setProperty('--d', `${(n * 0.07).toFixed(2)}s`);
            el.textContent = block.text;
            frag.appendChild(el);
            n++;
        } else if (block.type === 'para') {
            const el = document.createElement('p');
            el.className = 'summary-para';
            el.style.setProperty('--d', `${(n * 0.07).toFixed(2)}s`);
            el.textContent = block.text;
            frag.appendChild(el);
            n++;
        } else if (block.type === 'list') {
            const el = document.createElement('ul');
            el.className = 'summary-list';
            el.style.setProperty('--d', `${(n * 0.07).toFixed(2)}s`);
            block.items.forEach(it => {
                const li = document.createElement('li');
                li.textContent = it;
                el.appendChild(li);
            });
            frag.appendChild(el);
            n++;
        } else if (block.type === 'cards') {
            block.items.forEach((c, ci) => {
                const el = document.createElement('div');
                el.className = `metric-card level-${c.level}`;
                el.style.setProperty('--d', `${(0.1 + n * 0.06 + ci * 0.05).toFixed(2)}s`);
                el.innerHTML = `
                    <div class="metric-icon">${ICONS[c.icon] || ICONS.note}</div>
                    <div class="metric-main">
                        <span class="metric-label">${escapeHtml(c.displayLabel)}</span>
                        <span class="metric-value">${decorateValue(c.value)}</span>
                    </div>
                    <span class="metric-badge">${LEVEL_META[c.level]}</span>`;
                frag.appendChild(el);
                n++;
            });
        }
    });

    return frag;
}

function renderSummary(summary, generatedAt, stream = false) {
    const emptyState = $('aiEmptyState');
    const loading = $('aiLoading');
    const summaryEl = $('aiSummary');
    const bodyEl = $('aiSummaryBody');
    const previewEl = $('streamingPreview');
    const streamTextEl = $('streamingText');
    const dateEl = $('aiSummaryDate');

    if (streamTimer) { clearInterval(streamTimer); streamTimer = null; }
    previewEl.style.display = 'none';

    emptyState.style.display = 'none';
    loading.style.display = 'none';
    summaryEl.style.display = 'block';

    const { blocks, verdict } = buildSummaryDom(summary);
    bodyEl.innerHTML = '';
    bodyEl.appendChild(createSummaryContent(blocks, verdict));
    dateEl.textContent = generatedAt ? `Generated ${formatDateFromTimestamp(generatedAt)}` : '';

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (stream && !prefersReduced) {
        bodyEl.style.display = 'none';
        previewEl.style.display = 'flex';
        streamTextEl.textContent = '';

        const words = summary.trim().split(/\s+/).slice(0, 160);
        if (words.length === 0) {
            bodyEl.style.display = 'block';
            return;
        }

        const ticks = Math.max(6, Math.min(words.length, 64));
        const per = Math.ceil(words.length / ticks);
        let i = 0;

        streamTimer = setInterval(() => {
            const slice = words.slice(i, i + per);
            i += per;
            streamTextEl.textContent += (streamTextEl.textContent ? ' ' : '') + slice.join(' ');
            if (i >= words.length) {
                clearInterval(streamTimer);
                streamTimer = null;
                setTimeout(() => {
                    previewEl.style.display = 'none';
                    bodyEl.style.display = 'block';
                }, 280);
            }
        }, 30);
    } else {
        bodyEl.style.display = 'block';
    }
}

$('closeViewImageBtn').addEventListener('click', closeViewImage);

viewImageModal.addEventListener('click', (e) => {
    if (e.target === viewImageModal) closeViewImage();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && viewImageModal.style.display === 'flex') {
        closeViewImage();
    }
});

function closeViewImage() {
    clearInterval(aiStatusTimer);
    aiStatusTimer = null;
    clearInterval(streamTimer);
    streamTimer = null;
    clearTimeout(toolbarTimer);
    $('aiSidebar').classList.remove('is-processing');
    $('streamingPreview').style.display = 'none';
    viewImageModal.classList.remove('sidebar-open');
    viewImageModal.style.display = 'none';
    document.body.style.overflow = '';
    currentViewReport = null;
    resetParallax();
    hideToolbar();
}

$('aiAnalyzeBtn').addEventListener('click', () => handleAiAnalyze(false));

// ==================== DELETE REPORT ====================

function promptDeleteReport(report) {
    deleteTarget = report;
    confirmModal.style.display = 'flex';
}

$('closeConfirmBtn').addEventListener('click', () => {
    confirmModal.style.display = 'none';
    deleteTarget = null;
});

$('cancelDeleteBtn').addEventListener('click', () => {
    confirmModal.style.display = 'none';
    deleteTarget = null;
});

confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.style.display = 'none';
        deleteTarget = null;
    }
});

$('confirmDeleteBtn').addEventListener('click', async() => {
    if (!deleteTarget) return;

    const loadingToast = showLoadingToast('Deleting report...');

    try {
        await deleteReport(memberId, deleteTarget.id);
        confirmModal.style.display = 'none';
        deleteTarget = null;

        removeToast(loadingToast);
        showToast('Report deleted successfully', 'success');

        await loadReports();
    } catch (err) {
        console.error('Delete error:', err);
        removeToast(loadingToast);
        showToast('Failed to delete report', 'error');
        confirmModal.style.display = 'none';
        deleteTarget = null;
    }
});

// ==================== EDIT PROFILE ====================

editProfileBtn.addEventListener('click', () => {
    $('editName').value = memberData.name || '';
    $('editAge').value = memberData.age || '';
    $('editGender').value = memberData.gender || 'Male';
    $('editBloodGroup').value = memberData.bloodGroup || '';
    $('editRelation').value = memberData.relation || '';
    $('editPhone').value = memberData.phone || '';
    $('editEmergency').value = memberData.emergencyContact || '';
    editProfileModal.style.display = 'flex';
});

$('closeEditModalBtn').addEventListener('click', () => {
    editProfileModal.style.display = 'none';
});

editProfileModal.addEventListener('click', (e) => {
    if (e.target === editProfileModal) editProfileModal.style.display = 'none';
});

editProfileForm.addEventListener('submit', async(e) => {
    e.preventDefault();

    const updatedData = {
        name: $('editName').value.trim(),
        age: parseInt($('editAge').value),
        gender: $('editGender').value,
        bloodGroup: $('editBloodGroup').value,
        relation: $('editRelation').value.trim(),
        phone: $('editPhone').value.trim(),
        emergencyContact: $('editEmergency').value.trim(),
    };

    if (!updatedData.name || !updatedData.age || !updatedData.relation) return;

    const submitBtn = editProfileForm.querySelector('.save-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    try {
        await updateFamilyMember(memberId, updatedData);
        editProfileModal.style.display = 'none';
        showToast('Profile updated successfully', 'success');
        await loadProfile();
    } catch (err) {
        console.error('Edit profile error:', err);
        showToast('Failed to update profile', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
});

// ==================== LOGOUT ====================

logoutBtn.addEventListener('click', async(e) => {
    e.preventDefault();
    const confirmed = confirm('Are you sure you want to log out?');
    if (confirmed) {
        await logoutUser();
    }
});



// ==================== IMAGE ZOOM/PAN + FLOATING TOOLBAR + PARALLAX ====================
let zoomLevel = 1;
let panX = 0, panY = 0;
let isDragging = false, dragStartX = 0, dragStartY = 0;
let toolbarTimer = null;

const imageWrapper = $('imageWrapper');
const imgStage = $('imgStage');
const viewImageFull = $('viewImageFull');
const zoomLevelEl = $('zoomLevel');
const floatingToolbar = $('floatingToolbar');

function applyTransform(animated = false) {
    if (animated) {
        viewImageFull.style.transition = 'transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    } else {
        viewImageFull.style.transition = '';
    }
    viewImageFull.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    zoomLevelEl.textContent = `${Math.round(zoomLevel * 100)}%`;
    imageWrapper.classList.toggle('zoomed', zoomLevel > 1);
    if (animated) {
        setTimeout(() => { viewImageFull.style.transition = ''; }, 460);
    }
}

function resetZoom() {
    zoomLevel = 1; panX = 0; panY = 0;
    applyTransform();
}

$('zoomInBtn').addEventListener('click', () => {
    zoomLevel = Math.min(zoomLevel + 0.25, 3);
    applyTransform(true);
    peekToolbar();
});

$('zoomOutBtn').addEventListener('click', () => {
    zoomLevel = Math.max(zoomLevel - 0.25, 1);
    if (zoomLevel === 1) { panX = 0; panY = 0; }
    applyTransform(true);
    peekToolbar();
});

imageWrapper.addEventListener('wheel', (e) => {
    e.preventDefault();
    zoomLevel = Math.min(Math.max(zoomLevel + (e.deltaY < 0 ? 0.15 : -0.15), 1), 3);
    if (zoomLevel === 1) { panX = 0; panY = 0; }
    applyTransform(false);
    peekToolbar();
}, { passive: false });

imageWrapper.addEventListener('mousedown', (e) => {
    if (zoomLevel <= 1) return;
    isDragging = true;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;
    imageWrapper.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        panX = e.clientX - dragStartX;
        panY = e.clientY - dragStartY;
        applyTransform(false);
    } else {
        setParallax(e.clientX, e.clientY);
    }
});

window.addEventListener('mouseup', () => {
    isDragging = false;
    imageWrapper.classList.remove('dragging');
});

$('downloadImageBtn').addEventListener('click', () => {
    if (!currentViewReport) return;
    const a = document.createElement('a');
    a.href = currentViewReport.imageUrl;
    a.download = `report-${currentViewReport.id}.jpg`;
    a.target = '_blank';
    a.click();
    peekToolbar();
});

// --- Floating toolbar: appear on hover, auto-hide after inactivity ---
function showToolbar() {
    floatingToolbar.classList.remove('is-hidden');
}

function hideToolbar() {
    floatingToolbar.classList.add('is-hidden');
}

function peekToolbar() {
    showToolbar();
    clearTimeout(toolbarTimer);
    toolbarTimer = setTimeout(hideToolbar, 2400);
}

viewImageModal.addEventListener('mousemove', peekToolbar);
viewImageModal.addEventListener('mouseleave', hideToolbar);

// --- Subtle parallax drift on the image stage ---
let px = 0, py = 0, tx = 0, ty = 0, pRaf = null;

function parallaxLoop() {
    px += (tx - px) * 0.09;
    py += (ty - py) * 0.09;
    imgStage.style.transform = `translate3d(${px}px, ${py}px, 0)`;
    if (Math.abs(tx - px) > 0.04 || Math.abs(ty - py) > 0.04) {
        pRaf = requestAnimationFrame(parallaxLoop);
    } else {
        pRaf = null;
        px = tx; py = ty;
        imgStage.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    }
}

function setParallax(clientX, clientY) {
    if (zoomLevel > 1 || isDragging) {
        tx = 0; ty = 0;
    } else {
        const r = imageWrapper.getBoundingClientRect();
        tx = ((clientX - r.left) / Math.max(r.width, 1) - 0.5) * 18;
        ty = ((clientY - r.top) / Math.max(r.height, 1) - 0.5) * 12;
    }
    if (!pRaf) parallaxLoop();
}

function resetParallax() {
    tx = 0; ty = 0;
    if (!pRaf) parallaxLoop();
}

// ==================== AI SIDEBAR EXTRAS ====================
$('copySummaryBtn').addEventListener('click', async () => {
    const btn = $('copySummaryBtn');
    try {
        await navigator.clipboard.writeText($('aiSummaryBody').innerText);
        btn.classList.add('copied');
        const original = btn.innerHTML;
        btn.innerHTML = 'Copied ✓';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = original; }, 1800);
    } catch {
        showToast('Copy failed', 'error');
    }
});

$('regenerateBtn').addEventListener('click', () => handleAiAnalyze(true));

$('aiSidebarToggle').addEventListener('click', () => {
    const sb = $('aiSidebar');
    sb.classList.toggle('open');
    viewImageModal.classList.toggle('sidebar-open', sb.classList.contains('open'));
});