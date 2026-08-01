const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");


// =========================
// MOBILE MENU
// =========================

menuBtn.addEventListener("click", () => {

    navLinks.classList.toggle("show");

    if (navLinks.classList.contains("show")) {
        menuBtn.textContent = "✕";
    } else {
        menuBtn.textContent = "☰";
    }

});


// Close menu when clicking a link

const navItems = document.querySelectorAll(".nav-links a");

navItems.forEach((item) => {

    item.addEventListener("click", () => {

        navLinks.classList.remove("show");

        menuBtn.textContent = "☰";

    });

});


// =========================
// SCROLL REVEAL ANIMATION
// =========================

const revealElements = document.querySelectorAll(
    ".feature-card, .step, .security-item, .stat, .security-card"
);

const observer = new IntersectionObserver(

    (entries) => {

        entries.forEach((entry) => {

            if (entry.isIntersecting) {

                entry.target.style.opacity = "1";

                entry.target.style.transform = "translateY(0)";

                observer.unobserve(entry.target);

            }

        });

    },

    {
        threshold: 0.15
    }

);


revealElements.forEach((element) => {

    element.style.opacity = "0";

    element.style.transform = "translateY(30px)";

    element.style.transition = "0.7s ease";

    observer.observe(element);

});


// =========================
// BUTTON INTERACTION
// =========================

const startButtons = document.querySelectorAll(
    ".primary-btn, .cta-button"
);

startButtons.forEach((button) => {

    button.addEventListener("click", (event) => {

        const href = button.getAttribute("href");

        if (href === "#get-started") {

            event.preventDefault();

            document
                .getElementById("get-started")
                .scrollIntoView({
                    behavior: "smooth"
                });

        }

    });

});