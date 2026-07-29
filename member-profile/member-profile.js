import {
    auth,
    getMemberById,
    getReports,
    addReport,
    deleteReport,
    updateReport,
    uploadReportFile,
    updateFamilyMember,
    getUserData,
    onAuthStateChanged,
    logoutUser,
} from "../firebase.js";

let memberId = null;
let memberData = null;
let reports = [];
let deleteTarget = null;

const $ = (id) => document.getElementById(id);

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
const viewReportModal = $('viewReportModal');
const confirmModal = $('confirmModal');

const reportForm = $('reportForm');
const editProfileForm = $('editProfileForm');

onAuthStateChanged(auth, async (user) => {
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
    const initials = memberData.name
        ? memberData.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
        : '?';

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
            const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return dateB - dateA;
        });

        renderReports();
    } catch (err) {
        console.error('Load reports error:', err);
    }
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
        card.style.animationDelay = `${index * 0.08}s`;

        const category = report.category || 'General';
        const reportDate = report.reportDate
            ? formatDate(report.reportDate)
            : '—';
        const notes = report.notes
            ? report.notes.length > 80
                ? report.notes.substring(0, 80) + '...'
                : report.notes
            : '';
        const createdAt = report.createdAt?.toDate
            ? formatDate(report.createdAt.toDate())
            : '—';

        card.innerHTML = `
            <div class="report-card-header">
                <h3>${escapeHtml(report.title || 'Untitled')}</h3>
                <span class="report-category">${escapeHtml(category)}</span>
            </div>
            <div class="report-card-body">
                <div class="report-detail">
                    <span class="report-detail-label">Hospital</span>
                    <span class="report-detail-value">${escapeHtml(report.hospital || '—')}</span>
                </div>
                <div class="report-detail">
                    <span class="report-detail-label">Doctor</span>
                    <span class="report-detail-value">${escapeHtml(report.doctor || '—')}</span>
                </div>
                <div class="report-detail full-width">
                    <span class="report-detail-label">Report Date</span>
                    <span class="report-detail-value">${reportDate}</span>
                </div>
            </div>
            ${notes ? `<div class="report-notes">${escapeHtml(notes)}</div>` : ''}
            <div class="report-card-footer">
                <span class="report-created">Added ${createdAt}</span>
                <div class="report-actions">
                    <button class="view-btn" data-id="${report.id}">👁 View</button>
                    ${report.fileUrl ? `<button class="download-btn" data-url="${report.fileUrl}" data-title="${escapeHtml(report.title)}">⬇ Download</button>` : ''}
                    <button class="delete-btn" data-id="${report.id}">🗑 Delete</button>
                </div>
            </div>
        `;

        card.querySelector('.view-btn').addEventListener('click', () => viewReport(report));
        const downloadBtn = card.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => downloadReport(report));
        }
        card.querySelector('.delete-btn').addEventListener('click', () => promptDeleteReport(report.id, report.fileUrl));

        reportsGrid.appendChild(card);
    });
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

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ==================== UPLOAD REPORT ====================

uploadReportBtn.addEventListener('click', () => {
    reportForm.reset();
    $('fileInputLabel').innerHTML = '<span class="file-icon">📁</span><span>Choose file or drag here</span>';
    $('fileInputLabel').parentElement.classList.remove('has-file');
    uploadModal.style.display = 'flex';
});

$('closeModalBtn').addEventListener('click', () => {
    uploadModal.style.display = 'none';
});

uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) uploadModal.style.display = 'none';
});

$('reportFile').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const label = $('fileInputLabel');
    if (file) {
        label.innerHTML = `<span class="file-icon">📄</span><span>${file.name}</span>`;
        label.parentElement.classList.add('has-file');
    } else {
        label.innerHTML = '<span class="file-icon">📁</span><span>Choose file or drag here</span>';
        label.parentElement.classList.remove('has-file');
    }
});

reportForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = $('reportTitle').value.trim();
    const hospital = $('reportHospital').value.trim();
    const doctor = $('reportDoctor').value.trim();
    const category = $('reportCategory').value;
    const reportDate = $('reportDate').value;
    const notes = $('reportNotes').value.trim();
    const file = $('reportFile').files[0];

    if (!title || !category || !reportDate) return;

    const submitBtn = reportForm.querySelector('.save-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
        let fileUrl = null;
        if (file) {
            fileUrl = await uploadReportFile(memberId, file);
        }

        await addReport(memberId, {
            title,
            hospital,
            doctor,
            category,
            reportDate,
            notes,
            fileUrl,
        });

        uploadModal.style.display = 'none';
        await loadReports();

    } catch (err) {
        console.error('Upload error:', err);
        alert('Failed to upload report. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Report';
    }
});

// ==================== VIEW REPORT ====================

function viewReport(report) {
    const titleEl = $('viewReportTitle');
    const content = $('reportViewContent');

    titleEl.textContent = report.title || 'Report Details';

    const reportDate = report.reportDate ? formatDate(report.reportDate) : '—';
    const createdAt = report.createdAt?.toDate ? formatDate(report.createdAt.toDate()) : '—';

    let fileHtml = '';
    if (report.fileUrl) {
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(report.fileUrl);
        if (isImage) {
            fileHtml = `<img src="${report.fileUrl}" alt="${escapeHtml(report.title)}">`;
        } else {
            fileHtml = `
                <div class="file-placeholder">
                    <span class="file-icon">📄</span>
                    <span>PDF file</span>
                    <a href="${report.fileUrl}" target="_blank" class="view-download-btn">⬇ Download PDF</a>
                </div>
            `;
        }
    } else {
        fileHtml = `
            <div class="file-placeholder">
                <span class="file-icon">📁</span>
                <span>No file attached</span>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="report-view-grid">
            <div class="report-view-item">
                <span class="label">Hospital</span>
                <span class="value">${escapeHtml(report.hospital || '—')}</span>
            </div>
            <div class="report-view-item">
                <span class="label">Doctor</span>
                <span class="value">${escapeHtml(report.doctor || '—')}</span>
            </div>
            <div class="report-view-item">
                <span class="label">Category</span>
                <span class="value">${escapeHtml(report.category || '—')}</span>
            </div>
            <div class="report-view-item">
                <span class="label">Report Date</span>
                <span class="value">${reportDate}</span>
            </div>
            <div class="report-view-item full">
                <span class="label">Added</span>
                <span class="value">${createdAt}</span>
            </div>
        </div>
        ${report.notes ? `<div class="report-view-notes">${escapeHtml(report.notes)}</div>` : ''}
        <div class="report-view-file">${fileHtml}</div>
    `;

    viewReportModal.style.display = 'flex';
}

$('closeViewModalBtn').addEventListener('click', () => {
    viewReportModal.style.display = 'none';
});

viewReportModal.addEventListener('click', (e) => {
    if (e.target === viewReportModal) viewReportModal.style.display = 'none';
});

// ==================== DOWNLOAD REPORT ====================

function downloadReport(report) {
    if (report.fileUrl) {
        window.open(report.fileUrl, '_blank');
    }
}

// ==================== DELETE REPORT ====================

function promptDeleteReport(reportId, fileUrl) {
    deleteTarget = { reportId, fileUrl };
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

$('confirmDeleteBtn').addEventListener('click', async () => {
    if (!deleteTarget) return;

    try {
        await deleteReport(memberId, deleteTarget.reportId, deleteTarget.fileUrl);
        confirmModal.style.display = 'none';
        deleteTarget = null;
        await loadReports();
    } catch (err) {
        console.error('Delete error:', err);
        alert('Failed to delete report.');
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

editProfileForm.addEventListener('submit', async (e) => {
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
        await loadProfile();
    } catch (err) {
        console.error('Edit profile error:', err);
        alert('Failed to update profile.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Changes';
    }
});

// ==================== LOGOUT ====================

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const confirmed = confirm('Are you sure you want to log out?');
    if (confirmed) {
        await logoutUser();
    }
});
