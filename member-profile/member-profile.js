import {
    auth,
    getMemberById,
    getReports,
    addReport,
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

// ==================== TOAST NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icon = type === 'success'
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;

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

submitUploadBtn.addEventListener('click', async () => {
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

    fullImage.src = report.imageUrl;
    fullImage.alt = 'Medical Report';

    const createdAt = formatDateFromTimestamp(report.createdAt);
    dateEl.textContent = `Uploaded ${createdAt}`;

    viewImageModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
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
    viewImageModal.style.display = 'none';
    document.body.style.overflow = '';
}

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

$('confirmDeleteBtn').addEventListener('click', async () => {
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

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const confirmed = confirm('Are you sure you want to log out?');
    if (confirmed) {
        await logoutUser();
    }
});
