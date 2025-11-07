// ------------------- Form Handling -------------------
let csrfToken = '';

function getCsrfToken() {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag ? metaTag.getAttribute('content') : '';
}

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const otpForm = document.getElementById('otp-form');
const authToggleButtons = document.querySelectorAll('.toggle-btn');
const loginMethodToggleButtons = document.querySelectorAll('.toggle-login-method');
const passwordGroup = document.getElementById('password-group');
const otpGroup = document.getElementById('otp-group');
const sendOtpButton = document.getElementById('send-otp-button');

let loginMethod = 'password';

function showForm(formToShow) {
    // Hide all forms
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.remove('active');
    if (otpForm) otpForm.classList.remove('active');

    // Show the specified form
    if (formToShow) {
        formToShow.classList.add('active');
    }
}

authToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const form = button.dataset.form;
        if (form === 'login') {
            showForm(loginForm);
        } else if (form === 'signup') {
            showForm(signupForm);
        }
        authToggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
    });
});

loginMethodToggleButtons.forEach(button => {
    button.addEventListener('click', () => {
        loginMethod = button.dataset.method;
        loginMethodToggleButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        if (loginMethod === 'password') {
            passwordGroup.style.display = 'block';
            otpGroup.style.display = 'none';
        } else {
            passwordGroup.style.display = 'none';
            otpGroup.style.display = 'block';
        }
    });
});

if(sendOtpButton) {
    sendOtpButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const usernameOrEmail = document.querySelector('#login-form-element input[name="username_or_email"]').value;
        if (!usernameOrEmail) {
            showMessage('Please enter your username or email to receive an OTP.');
            return;
        }

        try {
            const response = await fetch('/auth/send_login_otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ email: usernameOrEmail })
            });

            const result = await response.json();
            showMessage(result.message, result.success ? 'success' : 'error');
        } catch (error) {
            showMessage('An error occurred. Please try again.');
        }
    });
}


// Form validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;

    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.style.borderColor = '#dc3545';
            isValid = false;
        } else {
            input.style.borderColor = '#e9ecef';
        }
    });

    return isValid;
}

// Add validation to forms
const loginFormElement = document.getElementById('login-form-element');
const signupFormElement = document.getElementById('signup-form-element');
const otpFormElement = document.getElementById('otp-form-element');

if (loginFormElement) {
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Determine which login method is active
        const activeMethod = document.querySelector('.toggle-login-method.active');
        const loginMethod = activeMethod ? activeMethod.getAttribute('data-method') : 'password';

        const formData = new FormData(loginFormElement);
        const data = Object.fromEntries(formData.entries());
        data.login_method = loginMethod;

        // Validate based on method
        if (loginMethod === 'password') {
            if (!data.username_or_email || !data.password) {
                showMessage('Please fill in all required fields.');
                return;
            }
        } else if (loginMethod === 'otp') {
            if (!data.otp) {
                showMessage('Please enter the OTP.');
                return;
            }
        }

        try {
            const response = await fetch('/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage(result.message || 'Login successful!', 'success');
                // Redirect after successful login
                setTimeout(() => {
                    window.location.href = result.redirect_url || '/';
                }, 2000);
            } else {
                showMessage(result.message || 'Login failed. Please try again.');
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.');
        }
    });
}

if (signupFormElement) {
    signupFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm(signupFormElement)) {
            showMessage('Please fill in all required fields.');
            return;
        }

        const formData = new FormData(signupFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage(result.message, 'success');
                // Switch to OTP form after successful signup
                showForm(otpForm);
                authToggleButtons.forEach(btn => btn.classList.remove('active'));
                // Note: OTP form doesn't have a toggle button, so no button to activate
            } else {
                showMessage(result.message);
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.');
        }
    });
}

if (otpFormElement) {
    otpFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validateForm(otpFormElement)) {
            showMessage('Please enter the OTP.');
            return;
        }

        const formData = new FormData(otpFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('/auth/verify_otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                showMessage(result.message, 'success');
                // Redirect to login after successful verification
                setTimeout(() => {
                    window.location.href = '/auth/login';
                }, 2000);
            } else {
                showMessage(result.message);
            }
        } catch (error) {
            showMessage('An error occurred. Please try again.');
        }
    });
}

// Password strength functionality
function checkPasswordStrength(password) {
    let score = 0;
    let feedback = [];

    // Length check
    if (password.length >= 8) score++;
    else feedback.push('At least 8 characters');

    // Lowercase check
    if (/[a-z]/.test(password)) score++;
    else feedback.push('Lowercase letter');

    // Uppercase check
    if (/[A-Z]/.test(password)) score++;
    else feedback.push('Uppercase letter');

    // Number check
    if (/\d/.test(password)) score++;
    else feedback.push('Number');

    // Special character check
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    else feedback.push('Special character');

    return { score, feedback };
}

// Update password strength indicator
function updatePasswordStrength(password) {
    const { score } = checkPasswordStrength(password);
    const percentage = (score / 5) * 100;

    const strengthFill = document.getElementById('signup-strength-fill');
    const strengthText = document.getElementById('signup-strength-text');

    if (strengthFill && strengthText) {
        strengthFill.style.width = `${percentage}%`;

        let strength = '';
        let color = '';

        if (score === 0) {
            strength = 'Very Weak';
            color = '#ef4444';
        } else if (score <= 2) {
            strength = 'Weak';
            color = '#f59e0b';
        } else if (score <= 3) {
            strength = 'Fair';
            color = '#eab308';
        } else if (score <= 4) {
            strength = 'Good';
            color = '#84cc16';
        } else {
            strength = 'Strong';
            color = '#10b981';
        }

        strengthFill.style.background = `linear-gradient(90deg, ${color}, ${color})`;
        strengthText.textContent = strength;
        strengthText.style.color = color;

        // Update individual requirements
        updateRequirements(password);
    }
}

// Update individual password requirements
function updateRequirements(password) {
    const requirements = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };

    Object.keys(requirements).forEach(req => {
        const element = document.querySelector(`.requirement[data-requirement="${req}"]`);
        const icon = element ? element.querySelector('i') : null;
        if (element && icon) {
            if (requirements[req]) {
                element.classList.add('met');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-check');
            } else {
                element.classList.remove('met');
                icon.classList.remove('fa-check');
                icon.classList.add('fa-times');
            }
        }
    });
}

// Setup password strength checking for signup form
function setupPasswordStrength() {
    const passwordInput = document.getElementById('signup-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
        // Initialize with empty password
        updatePasswordStrength('');
    }
}

// Setup password toggle functionality
function setupPasswordToggle() {
    document.querySelectorAll('.password-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const icon = this.querySelector('i');

            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            }
        });
    });
}

// Auto-focus on first input of active form
function focusFirstInput() {
    const activeForm = document.querySelector('.auth-form.active');
    if (activeForm) {
        const firstInput = activeForm.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
    }
}

// Initial focus and setup
document.addEventListener('DOMContentLoaded', () => {
    focusFirstInput();
    setupPasswordStrength();
    setupPasswordToggle();
});

function showMessage(message, type = 'error') {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageContainer.appendChild(messageDiv);
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}
