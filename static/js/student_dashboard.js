// Student Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// Initialize dashboard
function initializeDashboard() {
    setupNavigation();
    setupResponsive();
    setupSearch();
    setupCategoryFilters();
    setupAnimations();
    setupProfile();
    setupProfileLink();
    setupNotifications();
    setupPasswordResetModal();
    setupPayment();
    handleInitialHashNavigation();
}

// Navigation functionality
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    const contentSections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');

    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Show corresponding section
            contentSections.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(section + '-section').classList.add('active');

            // Update page title
            const sectionTitles = {
                'dashboard': 'Dashboard',
                'profile': 'Profile',
                'courses': 'Courses',
                'certificates': 'Certificates',
                'payments': 'Payments',
                'referrals': 'Referrals'
            };
            pageTitle.textContent = sectionTitles[section] || 'Dashboard';

            // Close reset password modal when navigating away from profile section
            const modal = document.getElementById("reset-password-modal");
            if (modal && modal.style.display === "block" && section !== 'profile') {
                modal.style.display = "none";
            }

            // Close sidebar on mobile after navigation
            if (window.innerWidth <= 1024) {
                toggleSidebar();
            }
        });
    });
}

function setupProfileLink() {
    const userProfile = document.getElementById('user-profile-clickable');
    const profileNavItem = document.querySelector('.nav-item[data-section="profile"]');

    if (userProfile && profileNavItem) {
        userProfile.addEventListener('click', function() {
            profileNavItem.click();
        });
    }
}

// Responsive sidebar functionality
function setupResponsive() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    menuToggle.addEventListener('click', toggleSidebar);

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 1024) {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('expanded');
        } else {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('expanded');
        }
    });

    // Initial check
    if (window.innerWidth <= 1024) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('expanded');
    }
}

function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');

    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('expanded');
}

// Course search and filter functionality
function setupSearch() {
    const courseSearch = document.getElementById('courseSearch');
    if (courseSearch) {
        courseSearch.addEventListener('input', function() {
            filterCourses();
        });
    }
}

function setupCategoryFilters() {
    const filterButtons = document.querySelectorAll('.category-filters .filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            filterCourses();
        });
    });
}

function filterCourses() {
    const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
    const activeFilter = document.querySelector('.category-filters .filter-btn.active')?.getAttribute('data-category') || 'all';
    const courseCards = document.querySelectorAll('.course-card');

    courseCards.forEach(card => {
        const title = card.querySelector('h4').textContent.toLowerCase();
        const description = card.querySelector('p').textContent.toLowerCase();
        const category = card.getAttribute('data-category') || 'basic-computing'; // Default category if not set

        // Check search term match
        const matchesSearch = title.includes(searchTerm) || description.includes(searchTerm);

        // Check category match
        const matchesCategory = activeFilter === 'all' || category === activeFilter;

        // Show/hide based on both filters
        if (matchesSearch && matchesCategory) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Animations and interactions
function setupAnimations() {
    // Add entrance animations to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.classList.add('animate-in');
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Copy to clipboard functionality
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showNotification('Referral code copied to clipboard!', 'success');
    }, function(err) {
        console.error('Could not copy text: ', err);
        showNotification('Failed to copy referral code', 'error');
    });
}

// Notification system
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Profile functionality
function setupProfile() {
    const avatarUploadForm = document.getElementById('avatar-upload-form');
    const avatarUploadInput = document.getElementById('avatar-upload-input');

    if (avatarUploadInput && avatarUploadForm) {
        avatarUploadInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                // Show loading overlay
                const loadingOverlay = showLoading();

                // Create FormData for AJAX submission
                const formData = new FormData(avatarUploadForm);
                formData.append('ajax', 'true'); // Indicate this is an AJAX request

                // Submit via AJAX
                fetch(avatarUploadForm.action, {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    hideLoading(loadingOverlay);
                    if (data.success) {
                        showNotification(data.message, 'success');
                        // Update the profile image without reloading
                        const profileImages = document.querySelectorAll('.profile-avatar img, .user-avatar');
                        const newImageUrl = `/static/uploads/profile_pics/${data.filename}`;
                        profileImages.forEach(img => {
                            img.src = newImageUrl + '?t=' + new Date().getTime(); // Add timestamp to force reload
                        });
                        // Also update the header user avatar
                        const headerAvatar = document.querySelector('.user-avatar');
                        if (headerAvatar) {
                            headerAvatar.src = newImageUrl + '?t=' + new Date().getTime();
                        }
                    } else {
                        showNotification(data.message || 'Failed to update profile image', 'error');
                    }
                })
                .catch(error => {
                    hideLoading(loadingOverlay);
                    console.error('Error:', error);
                    showNotification('Failed to update profile image', 'error');
                });
            }
        });
    }
}



// Certificate download functionality (placeholder)
function downloadCertificate(certId) {
    showNotification('Certificate download feature coming soon!', 'info');
}

// Enrollment functionality (placeholder)
function enrollInCourse(courseId) {
    showNotification('Redirecting to enrollment page...', 'info');
    // In a real implementation, this would redirect to the enrollment page
    setTimeout(() => {
        window.location.href = `/enroll/${courseId}`;
    }, 1000);
}

// Payment functionality
function setupPayment() {
    const payButtons = document.querySelectorAll('.pay-btn');

    payButtons.forEach(button => {
        button.addEventListener('click', function() {
            const enrollmentId = this.getAttribute('data-enrollment-id');
            const amount = this.getAttribute('data-amount');
            const course = this.getAttribute('data-course');

            if (confirm(`Are you sure you want to pay ₹${amount} for ${course}?`)) {
                processPayment(enrollmentId, amount, course);
            }
        });
    });
}

function processPayment(enrollmentId, amount, course) {
    const loadingOverlay = showLoading();

    fetch('/student/payment/mock', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enrollment_id: enrollmentId })
    })
    .then(response => response.json())
    .then(data => {
        hideLoading(loadingOverlay);
        if (data.success) {
            showNotification(data.message, 'success');
            updatePaymentUI(enrollmentId, data.payment);
        } else {
            showNotification(data.message || 'Payment failed', 'error');
        }
    })
    .catch(error => {
        hideLoading(loadingOverlay);
        console.error('Error:', error);
        showNotification('An error occurred during payment', 'error');
    });
}

function updatePaymentUI(enrollmentId, payment) {
    const pendingPaymentItem = document.querySelector(`.payment-item.pending [data-enrollment-id="${enrollmentId}"]`).closest('.payment-item.pending');
    if (pendingPaymentItem) {
        pendingPaymentItem.remove();
    }

    const paymentHistoryList = document.querySelector('.payments-history .payments-list');
    const newPaymentItem = document.createElement('div');
    newPaymentItem.classList.add('payment-item');
    newPaymentItem.innerHTML = `
        <div class="payment-icon">
            <i class="fas fa-credit-card"></i>
        </div>
        <div class="payment-content">
            <div class="payment-course">${payment.enrollment.course.title}</div>
            <div class="payment-amount">₹${payment.amount}</div>
            <div class="payment-status">
                <span class="status-badge status-${payment.status}">${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</span>
            </div>
            <div class="payment-date">${payment.created_on}</div>
            <button class="btn btn-secondary download-receipt-btn" data-payment-id="${payment.id}">
                <i class="fas fa-download"></i>
                Receipt
            </button>
        </div>
    `;
    paymentHistoryList.appendChild(newPaymentItem);

    const downloadReceiptBtn = newPaymentItem.querySelector('.download-receipt-btn');
    downloadReceiptBtn.addEventListener('click', function() {
        window.location.href = `/student/receipt/download/${payment.id}`;
    });
}

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    // Close sidebar with Escape key
    if (e.key === 'Escape') {
        const sidebar = document.querySelector('.sidebar');
        if (window.innerWidth <= 1024 && !sidebar.classList.contains('collapsed')) {
            toggleSidebar();
        }
    }
});

// Lazy loading for images
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Performance monitoring
if ('performance' in window && 'PerformanceObserver' in window) {
    try {
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'largest-contentful-paint') {
                    console.log('LCP:', entry.startTime);
                }
            }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
        console.log('Performance monitoring not supported');
    }
}

// Add CSS for notifications and animations
const dashboardStyle = document.createElement('style');
dashboardStyle.textContent = `
    .animate-in {
        animation: slideUp 0.5s ease forwards;
        opacity: 0;
        transform: translateY(20px);
    }

    @keyframes slideUp {
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        min-width: 300px;
        max-width: 500px;
        animation: slideInRight 0.3s ease;
    }

    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        font-size: 14px;
        font-weight: 500;
    }

    .notification-success .notification-content {
        background: #10b981;
        color: white;
    }

    .notification-error .notification-content {
        background: #ef4444;
        color: white;
    }

    .notification-info .notification-content {
        background: #3b82f6;
        color: white;
    }

    .notification-close {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 4px;
        margin-left: auto;
        opacity: 0.8;
        transition: opacity 0.2s ease;
    }

    .notification-close:hover {
        opacity: 1;
    }

    /* Loading overlay */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e2e8f0;
        border-top: 4px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(dashboardStyle);

// Utility function to show loading state
function showLoading() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(overlay);
    return overlay;
}

function hideLoading(overlay) {
    if (overlay && overlay.parentElement) {
        overlay.remove();
    }
}

// Notification functionality
function fetchNotifications() {
    fetch('/student/notifications')
        .then(response => response.json())
        .then(data => {
            updateNotificationBadge(data);
            populateNotificationDropdown(data);
        })
        .catch(error => console.error('Error fetching notifications:', error));
}

function updateNotificationBadge(notifications) {
    const badge = document.getElementById('notification-badge');
    if (!badge) {
        return;
    }
    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'inline';
        document.querySelector('.notification-icon').classList.add('has-new-notification');
    } else {
        badge.style.display = 'none';
        document.querySelector('.notification-icon').classList.remove('has-new-notification');
    }
}

function populateNotificationDropdown(notifications, limit = 5) {
    const notificationList = document.getElementById('notification-list');
    notificationList.innerHTML = '';

    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="notification-item"><div class="notification-item-content"><p>No notifications yet</p></div></div>';
        return;
    }

    notifications.slice(0, limit).forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.is_read ? '' : 'unread'}`;
        item.onclick = () => markAsRead(notification.id);

        const icon = getNotificationIcon(notification.message);
        const timeAgo = getTimeAgo(notification.timestamp);

        item.innerHTML = `
            <div class="notification-item-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="notification-item-content">
                <p>${notification.message}</p>
                <span>${timeAgo}</span>
            </div>
        `;

        notificationList.appendChild(item);
    });
}

function getNotificationIcon(message) {
    if (message.toLowerCase().includes('approved')) return 'fa-check-circle';
    if (message.toLowerCase().includes('rejected')) return 'fa-times-circle';
    if (message.toLowerCase().includes('enrolled')) return 'fa-book-open';
    if (message.toLowerCase().includes('certificate')) return 'fa-certificate';
    if (message.toLowerCase().includes('payment')) return 'fa-credit-card';
    return 'fa-info-circle';
}

function getTimeAgo(timestamp) {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
}

function markAsRead(notificationId) {
    fetch('/student/notifications/mark_read', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: notificationId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            fetchNotifications(); // Refresh notifications
            // Redirect based on notification type
            redirectBasedOnNotification(notificationId);
        }
    })
    .catch(error => console.error('Error marking notification as read:', error));
}

// Notification setup
function setupNotifications() {
    let allNotifications = [];
    const notificationIcon = document.querySelector('.notification-icon');
    const notificationDropdown = document.querySelector('.notification-dropdown');
    const clearAllBtn = document.getElementById('clear-all-notifications');
    const viewAllBtn = document.getElementById('view-all-notifications');

    if (notificationIcon) {
        notificationIcon.addEventListener('click', function(event) {
            event.stopPropagation();
            notificationDropdown.classList.toggle('show');
        });
    }

    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', function() {
            fetch('/student/notifications/clear_all', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    fetchNotifications(); // Refresh notifications
                }
            })
            .catch(error => console.error('Error clearing notifications:', error));
        });
    }

    if (viewAllBtn) {
        viewAllBtn.addEventListener('click', function(event) {
            event.preventDefault();
            populateNotificationDropdown(allNotifications, allNotifications.length);
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (notificationDropdown && notificationDropdown.classList.contains('show') && !notificationIcon.contains(event.target) && !notificationDropdown.contains(event.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // Fetch notifications on page load
    fetchNotifications();

    // Refresh notifications every 30 seconds
    setInterval(fetchNotifications, 30000);

    // Override fetchNotifications to store notifications
    const originalFetchNotifications = fetchNotifications;
    fetchNotifications = function() {
        fetch('/student/notifications')
            .then(response => response.json())
            .then(data => {
                allNotifications = data;
                updateNotificationBadge(data);
                populateNotificationDropdown(data);
            })
            .catch(error => console.error('Error fetching notifications:', error));
    };
}

function redirectBasedOnNotification(notificationId) {
    // Fetch the notification details to determine redirect
    fetch('/student/notifications')
        .then(response => response.json())
        .then(notifications => {
            const notification = notifications.find(n => n.id === notificationId);
            if (notification) {
                const message = notification.message.toLowerCase();

                if (message.includes('enrollment') && message.includes('approved')) {
                    // Redirect to courses page to see enrolled courses
                    window.location.href = '/courses';
                } else if (message.includes('enrollment') && message.includes('rejected')) {
                    // Redirect to courses page to try again
                    window.location.href = '/courses';
                } else if (message.includes('enrollment request')) {
                    // Redirect to student dashboard to see status
                    window.location.href = '/student/dashboard';
                } else if (message.includes('certificate')) {
                    // Redirect to certificates section
                    window.location.href = '/student/dashboard#certificates-section';
                } else if (message.includes('unenrolled') || message.includes('unenroll')) {
                    // Redirect to courses page
                    window.location.href = '/courses';
                } else if (message.includes('course') && message.includes('updated')) {
                    // Redirect to courses page
                    window.location.href = '/courses';
                } else {
                    // Default redirect to student dashboard
                    window.location.href = '/student/dashboard';
                }
            }
        })
        .catch(error => console.error('Error fetching notification details:', error));
}

// Enhanced Modal functionality with password strength and validation
function setupPasswordResetModal() {
    const modal = document.getElementById("reset-password-modal");
    const btn = document.getElementById("reset-password-btn");
    const closeBtn = document.querySelector(".close-button");
    const form = document.getElementById("reset-password-form-modal");
    const newPasswordInput = document.getElementById('new_password');
    const confirmPasswordInput = document.getElementById('confirm_new_password');
    const submitBtn = document.getElementById('reset-password-submit-btn');
    const confirmError = document.getElementById('confirm-error');

    // Password strength elements
    const strengthBar = document.getElementById('strength-fill');
    const strengthText = document.getElementById('strength-text');

    // Open modal
    btn.onclick = function() {
        // Only open modal if profile section is active
        const profileSection = document.getElementById('profile-section');
        if (!profileSection.classList.contains('active')) {
            return;
        }

        modal.style.display = "block";
        // Reset form state
        form.reset();
        updatePasswordStrength('');
        hideFieldError(confirmError);
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');

        // Set up password toggle functionality
        setupPasswordToggles();
    }

    // Close modal functions
    closeBtn.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Setup password visibility toggles
    function setupPasswordToggles() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const targetId = this.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = this.querySelector('i');

                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    }

    // Password strength checker
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
        if (/S/.test(password)) score++;
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

        strengthBar.style.width = `${percentage}%`;

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

        strengthBar.style.background = `linear-gradient(90deg, ${color}, ${color})`;
        strengthText.textContent = strength;
        strengthText.style.color = color;

        // Update individual requirements
        updateRequirements(password);
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
            const element = document.querySelector(`.requirement-item[data-requirement="${req}"]`);
            const icon = element.querySelector('i');
            if (element) {
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

    // Show field error
    function showFieldError(element, message) {
        element.textContent = message;
        element.classList.add('show');
    }

    // Hide field error
    function hideFieldError(element) {
        element.classList.remove('show');
    }

    // Real-time password strength checking
    newPasswordInput.addEventListener('input', (e) => {
        updatePasswordStrength(e.target.value);
        validatePasswords();
    });

    // Password confirmation validation
    function validatePasswords() {
        const password = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Disable submit button if passwords don't match or if either field is empty
        if (password.length === 0 || confirmPassword.length === 0 || password !== confirmPassword) {
            submitBtn.disabled = true;
        } else {
            submitBtn.disabled = false;
        }

        // Show messages in the form based on password matching
        if (password.length > 0 && confirmPassword.length > 0) {
            if (password !== confirmPassword) {
                showFieldError(confirmError, 'Password is not same');
            } else {
                showFieldError(confirmError, 'Password is same');
            }
        } else {
            hideFieldError(confirmError);
        }
    }

    confirmPasswordInput.addEventListener('input', validatePasswords);

    // Form submission with loading state
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const password = newPasswordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        // Clear any existing errors
        hideFieldError(confirmError);

        // Validation checks
        if (checkPasswordStrength(password).score < 3) {
            showNotification('Please choose a stronger password. It should include at least 8 characters, uppercase and lowercase letters, numbers, and special characters.', 'error');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');

        const formData = new FormData(form);
        const loadingOverlay = showLoading();

        fetch(form.action, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
                return;
            }
            return response.json();
        })
        .then(data => {
            hideLoading(loadingOverlay);
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');

            if (data.success) {
                showNotification(data.message, 'success');
                modal.style.display = "none";
                form.reset();
                updatePasswordStrength('');
                hideFieldError(confirmError);
            } else {
                showNotification(data.message || 'Failed to reset password', 'error');
            }
        })
        .catch(error => {
            hideLoading(loadingOverlay);
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
            console.error('Error:', error);
            showNotification('An error occurred. Please try again.', 'error');
        });
    });

    // Keyboard accessibility
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Handle initial hash navigation when page loads
function handleInitialHashNavigation() {
    const hash = window.location.hash;
    if (hash) {
        const sectionId = hash.substring(1); // Remove the '#'
        const sectionMap = {
            'courses-section': 'courses',
            'certificates-section': 'certificates',
            'payments-section': 'payments',
            'referrals-section': 'referrals'
        };

        const navSection = sectionMap[sectionId];
        if (navSection) {
            // Find and click the corresponding nav item
            const navItem = document.querySelector(`.nav-item[data-section="${navSection}"]`);
            if (navItem) {
                navItem.click();
            }
        }
    }
}
