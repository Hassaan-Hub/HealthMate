// firebase.js
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    collection,
    addDoc,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";


// =========================
// FIREBASE CONFIG
// =========================

const firebaseConfig = {
    apiKey: "AIzaSyB3nLsMS6kisX6Ckm4s9GqJM7U7mQ30diE",
    authDomain: "healthmate-cc694.firebaseapp.com",
    projectId: "healthmate-cc694",
    storageBucket: "healthmate-cc694.firebasestorage.app",
    messagingSenderId: "55759306122",
    appId: "1:55759306122:web:cf28bffcab68aaf87e9c73",
    measurementId: "G-2C3BV5RDHZ"
};


// =========================
// INITIALIZE FIREBASE
// =========================

const app = initializeApp(firebaseConfig);


// =========================
// INITIALIZE AUTH
// =========================

const auth = getAuth(app);


// =========================
// INITIALIZE FIRESTORE
// =========================

const db = getFirestore(app);


// =========================
// INITIALIZE STORAGE
// =========================

const storage = getStorage(app);


// =========================
// SIGN UP FUNCTION
// =========================

async function signupUser(
    firstName,
    lastName,
    email,
    password
) {

    try {

        // Create user in Firebase Authentication

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        // Get created user's data

        const user = userCredential.user;


        // Store additional user data in Firestore

        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            firstName: firstName,
            lastName: lastName,
            fullName: `${firstName} ${lastName}`,
            email: user.email,
            createdAt: serverTimestamp()
        });
        console.log("User created successfully:", user);
        return {
            success: true,
            user: user
        };
    } catch (error) {
        console.log("Signup Error:", error.code);
        return {
            success: false,
            error: error.code
        };
    }
}


// =========================
// LOGIN FUNCTION
// =========================

async function loginUser(email, password) {
    try {
        // Login user using Firebase Authentication

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = userCredential.user;
        console.log("User logged in successfully:", user);
        return {
            success: true,
            user: user
        };


    } catch (error) {
        console.log("Login Error:", error.code);
        return {
            success: false,
            error: error.code
        };
    }
}





// =========================
// GET USER DATA
// =========================

async function getUserData(uid) {
    try {
        const userRef = doc(db, "users", uid);


        const userSnapshot = await getDoc(userRef);


        if (userSnapshot.exists()) {
            return {
                success: true,
                data: userSnapshot.data()
            };
        } else {
            return {
                success: false,
                error: "User data not found"
            };
        }
    } catch (error) {
        console.log("Get User Error:", error);
        return {
            success: false,
            error: error.code
        };
    }
}


// =========================
// LOGOUT FUNCTION
// =========================

async function logoutUser() {
    try {
        await signOut(auth);
        return {
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.code
        };
    }
}


async function addFamilyMember(memberData) {

    const user = auth.currentUser;

    if (!user) throw new Error("User not logged in");

    await addDoc(
        collection(db, "users", user.uid, "familyMembers"),
        {
            ...memberData,
            createdAt: serverTimestamp()
        }
    );

}


// Get Members
async function getFamilyMembers() {

    const user = auth.currentUser;

    if (!user) return [];

    const snapshot = await getDocs(
        collection(db, "users", user.uid, "familyMembers")
    );

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

}


// Update Member
async function updateFamilyMember(id, memberData) {

    const user = auth.currentUser;

    await updateDoc(
        doc(db, "users", user.uid, "familyMembers", id),
        memberData
    );

}


// Delete Member
async function deleteFamilyMember(id) {

    const user = auth.currentUser;

    await deleteDoc(
        doc(db, "users", user.uid, "familyMembers", id)
    );

}


// =========================
// GET MEMBER BY ID
// =========================

async function getMemberById(memberId) {
    const user = auth.currentUser;
    if (!user) return null;

    const docRef = doc(db, "users", user.uid, "familyMembers", memberId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
}


// =========================
// UPLOAD REPORT FILE
// =========================

async function uploadReportFile(memberId, file) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `users/${user.uid}/familyMembers/${memberId}/reports/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
}


// =========================
// ADD REPORT
// =========================

async function addReport(memberId, reportData) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    const docRef = await addDoc(
        collection(db, "users", user.uid, "familyMembers", memberId, "reports"),
        {
            ...reportData,
            createdAt: serverTimestamp()
        }
    );
    return docRef.id;
}


// =========================
// GET REPORTS
// =========================

async function getReports(memberId) {
    const user = auth.currentUser;
    if (!user) return [];

    const snapshot = await getDocs(
        collection(db, "users", user.uid, "familyMembers", memberId, "reports")
    );

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}


// =========================
// DELETE REPORT
// =========================

async function deleteReport(memberId, reportId, fileUrl) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    if (fileUrl) {
        try {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef);
        } catch (e) {
            console.log("Storage file delete skipped:", e.message);
        }
    }

    await deleteDoc(
        doc(db, "users", user.uid, "familyMembers", memberId, "reports", reportId)
    );
}


// =========================
// UPDATE REPORT
// =========================

async function updateReport(memberId, reportId, reportData) {
    const user = auth.currentUser;
    if (!user) throw new Error("User not logged in");

    await updateDoc(
        doc(db, "users", user.uid, "familyMembers", memberId, "reports", reportId),
        reportData
    );
}


// =========================
// EXPORT FUNCTIONS
// =========================

export {
    auth,
    db,
    storage,
    signupUser,
    loginUser,
    getUserData,
    logoutUser,
    addFamilyMember,
    getFamilyMembers,
    updateFamilyMember,
    deleteFamilyMember,
    getMemberById,
    uploadReportFile,
    addReport,
    getReports,
    deleteReport,
    updateReport,
    onAuthStateChanged,
};