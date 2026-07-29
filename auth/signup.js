import {
    auth,
    signupUser,
    onAuthStateChanged,
} from "../firebase.js";

onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = "../dashboard/dashboard.html";
    }
});

// =========================
// PASSWORD SHOW / HIDE
// =========================

const passwordToggleButtons = document.querySelectorAll(".password-toggle");

passwordToggleButtons.forEach((button) => {

    button.addEventListener("click", () => {

        const targetId = button.dataset.target;


        const passwordInput = document.getElementById(targetId);


        if (passwordInput.type === "password") {
            passwordInput.type = "text";

            button.textContent = "Hide";
        } else {
            passwordInput.type = "password";

            button.textContent = "Show";
        }
    });
});

// =========================
// PASSWORD STRENGTH
// =========================

const passwordInput = document.getElementById("password");
const strengthBars = document.querySelectorAll(".password-strength span");

if (passwordInput) {
    passwordInput.addEventListener("input", () => {

        const password = passwordInput.value;
        let strength = 0;

        if (password.length >= 8) {
            strength++;
        }

        if (/[A-Z]/.test(password)) {
            strength++;
        }

        if (/[0-9]/.test(password)) {
            strength++;
        }

        if (/[^A-Za-z0-9]/.test(password)) {
            strength++;
        }

        strengthBars.forEach((bar, index) => {
            if (index < strength) {
                bar.classList.add("active");
            } else {
                bar.classList.remove("active");
            }
        });
    });

}


// =========================
// SIGNUP FORM
// =========================

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const firstName = document.getElementById("firstName").value.trim();
        const lastName = document.getElementById("lastName").value.trim();
        const email = document.getElementById("email").value.trim();


        const password = document.getElementById("password").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        const terms = document.getElementById("terms").checked;

        const message = document.getElementById("signupMessage");

        // =========================
        // PASSWORD MATCH
        // =========================

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";

            message.className = "form-message error";
            return;
        }

        // =========================
        // PASSWORD LENGTH
        // =========================

        if (password.length < 8) {
            message.textContent = "Password must be at least 8 characters.";

            message.className = "form-message error";
            return;
        }

        // =========================
        // TERMS CHECK
        // =========================

        if (!terms) {
            message.textContent = "Please accept the terms and privacy policy.";
            message.className = "form-message error";
            return;
        }

        // =========================
        // LOADING
        // =========================

        const signupButton = signupForm.querySelector(".auth-button");

        signupButton.disabled = true;

        signupButton.textContent = "Creating Account...";

        message.textContent = "Creating your account...";

        message.className = "form-message";

        // =========================
        // FIREBASE SIGNUP
        // =========================

        const result = await signupUser(
            firstName,
            lastName,
            email,
            password
        );

        // =========================
        // SUCCESS
        // =========================

        if (result.success) {
            message.textContent = "Account created successfully!";
            message.className = "form-message success";

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);
        }

        // =========================
        // ERROR
        // =========================

        else {
            signupButton.disabled = false;

            signupButton.innerHTML = `Create Account <span>→</span>`;

            message.className = "form-message error";

            if (result.error === "auth/email-already-in-use") {
                message.textContent = "This email is already registered.";
            } else if (result.error === "auth/invalid-email") {
                message.textContent = "Please enter a valid email.";
            } else if (result.error === "auth/weak-password") {
                message.textContent = "Password is too weak.";
            } else {
                message.textContent = "Something went wrong. Please try again.";
            }
        }
    });
}