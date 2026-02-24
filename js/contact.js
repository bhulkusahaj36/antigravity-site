// ============================================================
// CONTACT PAGE
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const feedback = document.getElementById('formFeedback');
    const submit = document.getElementById('contactSubmit');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        feedback.className = 'form-feedback';
        feedback.textContent = '';
        feedback.style.display = 'none';

        const name = document.getElementById('contactName').value.trim();
        const email = document.getElementById('contactEmail').value.trim();
        const message = document.getElementById('contactMessage').value.trim();

        if (!name || !email || !message) {
            feedback.className = 'form-feedback error';
            feedback.textContent = 'કૃपया बधा क्षेत्रो भरो.';
            feedback.style.display = 'block';
            return;
        }

        // Simulate async submit
        submit.disabled = true;
        submit.textContent = 'मोकलाय रह्युं...';

        setTimeout(() => {
            submit.disabled = false;
            submit.textContent = 'मोकलो';
            form.reset();
            feedback.className = 'form-feedback success';
            feedback.textContent = 'तमारो संदेश मळ्यो. आभार!';
            feedback.style.display = 'block';
            setTimeout(() => { feedback.style.display = 'none'; }, 5000);
        }, 1200);
    });
});
