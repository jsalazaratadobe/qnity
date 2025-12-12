export default function decorate(block) {
    const form = block.querySelector("form");
    const errorMsg = block.querySelector(".error-message");

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const firstName = form.firstName.value.trim();
        const lastName = form.lastName.value.trim();
        const email = form.email.value.trim();
        const phone = form.phone.value.trim();

        errorMsg.textContent = "";

        // Required fields
        if (!firstName || !lastName || !email || !phone) {
            errorMsg.textContent = "Please fill in all fields.";
            return;
        }

        // Email format validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            errorMsg.textContent = "Please enter a valid email.";
            return;
        }

        // Phone validation
        const phonePattern = /^[0-9\-\+\s\(\)]{7,15}$/;
        if (!phonePattern.test(phone)) {
            errorMsg.textContent = "Please enter a valid phone number.";
            return;
        }

        // Fake submit success
        alert("Thanks for submitting!");
        form.reset();
    });
}

