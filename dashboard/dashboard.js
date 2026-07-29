import {
    auth,
    addFamilyMember,
    getFamilyMembers,
    updateFamilyMember,
    deleteFamilyMember,
    getUserData,
    onAuthStateChanged,
    logoutUser,
} from "../firebase.js";


let members = [];
let editingId = null;
// DOM Elements
const usernameEl = document.getElementById('username');
const memberCountEl = document.getElementById('memberCount');
const memberForm = document.getElementById('memberForm');
const nameInput = document.getElementById('name');
const ageInput = document.getElementById('age');
const relationInput = document.getElementById('relation');
const membersGrid = document.getElementById('members');
const logoutBtn = document.getElementById('logoutBtn');
// Initialize


onAuthStateChanged(auth, async (user) => {

    if (!user) {
        location.href = "../auth/login.html";
        return;
    }

    const result = await getUserData(user.uid);
    
    if (result.success) {
        usernameEl.textContent = result.data.fullName;
    }

    members = await getFamilyMembers();
    renderMembers();

});



document.addEventListener('DOMContentLoaded', async () => {

    members = await getFamilyMembers();

    renderMembers();

    // Form Submit Handler
    if (memberForm) {
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = nameInput.value.trim();
            const age = parseInt(ageInput.value);
            const relation = relationInput.value.trim();

            if (!name || isNaN(age) || !relation) return;

            if (editingId) {
                // Edit existing member
                await updateFamilyMember(editingId, {
                    name,
                    age,
                    relation
                });
                members = await getFamilyMembers();
                console.log("Members:", members);
                renderMembers();

                editingId = null;

                const submitBtn = memberForm.querySelector('button');
                if (submitBtn) submitBtn.textContent = '+ Save Member';
            } else {
                // Add new member
                await addFamilyMember({
                    name,
                    age,
                    relation
                });
                members = await getFamilyMembers();

                renderMembers();
            }

            memberForm.reset();
            renderMembers();
        });
    }

    // Logout Action
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out?')) {
                alert('Logging out of HealthMate...');
            }
            await logoutUser();
        });
    }
});
// Render Members to Grid
function renderMembers() {
    if (!membersGrid) return;

    membersGrid.innerHTML = '';

    // Update Member Count
    if (memberCountEl) {
        memberCountEl.textContent = members.length;
    }

    members.forEach(member => {
        const card = document.createElement('div');
        card.className = 'member-card';

        // Get initials for avatar
        const initials = member.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);

        card.innerHTML = `
            <div class="avatar">${initials}</div>
            <div class="member-info">
                <h3>${member.name}</h3>
                <p class="relation">${member.relation}</p>
                <p class="age">${member.age} years old</p>
            </div>
            <div class="actions">
                <button class="edit-btn" data-id="${member.id}">✏️ Edit</button>
                <button class="delete-btn" data-id="${member.id}">🗑️ Delete</button>
            </div>
        `;

        // Navigate to member profile on card click
        card.addEventListener('click', () => {
            location.href = `../member-profile/member-profile.html?id=${member.id}`;
        });

        // Stop propagation on buttons so they don't trigger card navigation
        card.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editMember(member.id);
        });
        card.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteMember(member.id);
        });

        membersGrid.appendChild(card);
    });
}
// Edit Member
function editMember(id) {
    const member = members.find(m => m.id === id);
    if (!member) return;

    nameInput.value = member.name;
    ageInput.value = member.age;
    relationInput.value = member.relation;

    editingId = id;
    const submitBtn = memberForm.querySelector('button');
    if (submitBtn) submitBtn.textContent = '💾 Update Member';

    // Scroll form into view
    memberForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
// Delete Member
async function deleteMember(id) {
    if (confirm('Are you sure you want to delete this family member?')) {
        await deleteFamilyMember(id);

        members = await getFamilyMembers();

        renderMembers();
    }
}
