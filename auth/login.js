import {
    auth,
    loginUser,
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
    }
);


// =========================
// LOGIN FORM
// =========================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();

        const password = document.getElementById("loginPassword").value;

        const message = document.getElementById("loginMessage");

        const loginButton = loginForm.querySelector(".auth-button");

        // =========================
        // VALIDATION
        // =========================

        if (!email || !password) {
            message.textContent = "Please enter your email and password.";
            message.className = "form-message error";
            return;
        }


        // =========================
        // LOADING
        // =========================

        loginButton.disabled = true;


        loginButton.textContent = "Logging in...";


        message.textContent = "Checking your account...";


        message.className = "form-message";

        // =========================
        // FIREBASE LOGIN
        // =========================

        const result = await loginUser(email, password);

        // =========================
        // SUCCESS
        // =========================

        if (result.success) {

            message.textContent = "Login successful!";


            message.className = "form-message success";


            setTimeout(() => {
                window.location.href = "../dashboard/dashboard.html";
            }, 1000);
        }

        // =========================
        // ERROR
        // =========================

        else {
            loginButton.disabled = false;

            loginButton.innerHTML = `Log In <span>→</span>`;

            message.className = "form-message error";

            if (result.error === "auth/invalid-credential") {
                message.textContent = "Invalid email or password.";
            }


            else if (result.error === "auth/user-not-found") {
                message.textContent = "No account found with this email.";
            }


            else if (result.error === "auth/wrong-password") {
                message.textContent = "Incorrect password.";
            }

            else {
                message.textContent = "Login failed. Please try again.";
            }
        }
    });
}