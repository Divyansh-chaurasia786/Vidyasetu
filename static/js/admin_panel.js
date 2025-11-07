function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.style.display = "none");
  const section = document.getElementById(id);
  if (section) {
    section.style.display = "block";
  }

  // Update active button states in header
  document.querySelectorAll(".header .nav-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
  const activeBtn = document.querySelector(`.header .nav-buttons button[onclick*="${id}"]`);
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  // Update active button states in sidebar
  document.querySelectorAll(".sidebar .nav-buttons button").forEach(btn => {
    btn.classList.remove("active");
  });
  const sidebarActiveBtn = document.querySelector(`.sidebar .nav-buttons button[onclick*="${id}"]`);
  if (sidebarActiveBtn) {
    sidebarActiveBtn.classList.add("active");
  }

  // Initialize search functionality for the section
  setupSearch(id);
}

function showSubSection(parentId, subId) {
  // Hide all sub-sections in the parent section
  const parentSection = document.getElementById(parentId);
  if (parentSection) {
    const subSections = parentSection.querySelectorAll('.sub-section');
    subSections.forEach(sub => sub.style.display = 'none');
  }

  // Show the selected sub-section
  const activeSubSection = document.getElementById(`${parentId}-${subId}`);
  if (activeSubSection) {
    activeSubSection.style.display = 'block';
  }

  // Update active button states in modal navigation
  if (parentSection) {
    const modalNav = parentSection.querySelector('.modal-nav');
    if (modalNav) {
      modalNav.querySelectorAll('.modal-nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      const activeNavBtn = modalNav.querySelector(`button[onclick*="showSubSection('${parentId}', '${subId}')"]`);
      if (activeNavBtn) {
        activeNavBtn.classList.add('active');
      }
    }
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
    // Show the first section inside the modal by default
    const firstSection = modal.querySelector('.section');
    if (firstSection) {
      const sections = modal.querySelectorAll('.section');
      sections.forEach(s => s.style.display = "none");
      firstSection.style.display = "block";
    }
  } else {
    console.error(`Modal with id '${modalId}' not found`);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
  } else {
    console.error(`Modal with id '${modalId}' not found`);
  }
}

window.onload = function() {
  showSection("dashboard");
  // Initialize sub-sections for users section
  showSubSection('users', 'all');
}

document.addEventListener('DOMContentLoaded', function() {
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    const fetchWithCSRF = (url, options = {}) => {
        const headers = {
            ...options.headers,
            'X-CSRFToken': csrfToken
        };
        return fetch(url, { ...options, headers });
    };

    // Load users data on page load
    if (document.getElementById('pending-users-table-body')) {
        loadPendingUsers();
    }
    if (document.getElementById('admins-table-body')) {
        loadAdmins();
    }
    loadCourses();
    loadEnrollments();
    loadPayments();
    loadCertificates();
    loadEnquiries();

    // Dropdown toggle functionality for both header and sidebar
    const dropdowns = document.querySelectorAll('.dropdown');

    dropdowns.forEach(dropdown => {
        const dropbtn = dropdown.querySelector('.dropbtn');
        const dropdownContent = dropdown.querySelector('.dropdown-content');

        if (dropbtn && dropdownContent) {
            dropbtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();

                // Close all other dropdowns
                document.querySelectorAll('.dropdown-content').forEach(content => {
                    if (content !== dropdownContent) {
                        content.style.display = 'none';
                    }
                });

                // Toggle current dropdown
                if (dropdownContent.style.display === 'block') {
                    dropdownContent.style.display = 'none';
                } else {
                    dropdownContent.style.display = 'block';
                }
            });
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.display = 'none';
            });
        }
    });

    // Handle dropdown links to close dropdown after clicking
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', function() {
            // Close all dropdowns
            document.querySelectorAll('.dropdown-content').forEach(content => {
                content.style.display = 'none';
            });
        });
    });

    // Common modal closing logic
    function setupModal(modalId, openBtnClass, closeBtnClass) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        const openBtns = document.querySelectorAll(openBtnClass);
        const closeBtn = modal.querySelector(closeBtnClass);

        openBtns.forEach(btn => {
            btn.onclick = function() {
                modal.style.display = "block";
                // Custom logic for each modal will be handled outside
            }
        });

        if (closeBtn) {
            closeBtn.onclick = function() {
                modal.style.display = "none";
            }
        }

        window.addEventListener('click', function(event) {
            if (event.target == modal) {
                modal.style.display = "none";
            }
        });
    }

    // Setup for all modals
    setupModal("view-user-modal", ".view-user-btn", ".close-btn");
    setupModal("edit-user-modal", ".edit-user-btn", ".close-btn");
    setupModal("edit-course-modal", ".edit-course-btn", ".close-btn");
    setupModal("view-course-modal", ".view-course-btn", ".close-btn");

    // AJAX form submissions
    const addUserForm = document.querySelector('.add-user-form form');
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            fetchWithCSRF(window.urls.admin_add_user, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    addUserForm.reset();
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        });
    }

    const createAdminForm = document.querySelector('#admins form');
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            fetchWithCSRF(window.urls.admin_create_admin, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    createAdminForm.reset();
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        });
    }

    const addOfflinePaymentForm = document.querySelector('.add-offline-payment-form form');
    if (addOfflinePaymentForm) {
        addOfflinePaymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            fetchWithCSRF(window.urls.admin_add_offline_payment, {
                method: 'POST',
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    addOfflinePaymentForm.reset();
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        });
    }

    // Update user status
    document.querySelectorAll(".update-user-status-btn").forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const action = this.getAttribute('data-action');
            fetchWithCSRF(`/admin/users/status/${userId}/${action}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        });
    });

    // Delete user
    document.querySelectorAll(".delete-user-btn").forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.getAttribute('data-user-id');
            const userName = this.getAttribute('data-user-username') || 'this user';

            // Create custom confirmation modal
            const modal = document.createElement('div');
            modal.className = 'deletion-modal';

            modal.innerHTML = `
                <div class="modal-content">
                    <h3><i class="fas fa-exclamation-triangle"></i> Confirm Deletion</h3>
                    <p>Are you sure you want to delete user <strong>"${userName}"</strong>? This action cannot be undone and will permanently remove all associated data.</p>
                    <div class="buttons">
                        <button id="confirm-delete">Delete User</button>
                        <button id="cancel-delete">Cancel</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Handle confirm delete
            document.getElementById('confirm-delete').onclick = function() {
                modal.remove();
                fetchWithCSRF(`/admin/users/delete/${userId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`Server error (${response.status}): ${text}`);
                        });
                    }
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        return response.text().then(text => {
                            throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message, 'error');
                }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('An error occurred. Please try again.', 'error');
                });
            };

            // Handle cancel
            document.getElementById('cancel-delete').onclick = function() {
                modal.remove();
            };

            // Close modal on outside click
            modal.onclick = function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            };
        });
    });

    // Delete course
    document.querySelectorAll(".delete-course-btn").forEach(btn => {
        btn.addEventListener('click', function() {
            const courseId = this.getAttribute('data-course-id');
            if (confirm('Are you sure you want to delete this course?')) {
                fetchWithCSRF(`/admin/courses/delete/${courseId}`)
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`Server error (${response.status}): ${text}`);
                        });
                    }
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        return response.text().then(text => {
                            throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message, 'error');
                }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('An error occurred. Please try again.', 'error');
                });
            }
        });
    });



    // View user
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            // Fetch user data and populate modal
            fetchWithCSRF(`/admin/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const user = data.user;
                    document.getElementById('view-user-id').textContent = user.id;
                    document.getElementById('view-user-username').textContent = user.username;
                    document.getElementById('view-user-email').textContent = user.email;
                    document.getElementById('view-user-full_name').textContent = user.full_name || 'N/A';
                    document.getElementById('view-user-mobile_number').textContent = user.mobile_number || 'N/A';
                    document.getElementById('view-user-discount').textContent = user.discount || '0';
                    document.getElementById('view-user-referred_by').textContent = user.referred_by || 'N/A';
                    document.getElementById('view-user-role').textContent = user.role;
                    document.getElementById('view-user-status').textContent = user.status;
                    document.getElementById('view-user-created_on').textContent = user.created_on;
                    document.getElementById('view-user-modal').style.display = 'block';
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Edit user
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            // Fetch user data and populate modal
            fetchWithCSRF(`/admin/users/${userId}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const user = data.user;
                    document.getElementById('edit-user-id').value = user.id;
                    document.getElementById('edit-user-email').value = user.email;
                    document.getElementById('edit-user-full_name').value = user.full_name || '';
                    document.getElementById('edit-user-mobile_number').value = user.mobile_number || '';
                    document.getElementById('edit-user-discount').value = user.discount || '';
                    document.getElementById('edit-user-role').value = user.role;
                    document.getElementById('edit-user-status').value = user.status;

                    // Hide OTP group initially
                    document.getElementById('otp-group').style.display = 'none';
                    document.getElementById('edit-user-otp').value = '';

                    // Disable role change if not main_admin
                    const roleGroup = document.getElementById('role-group');
                    const roleSelect = document.getElementById('edit-user-role');
                    if (window.currentUserRole !== 'main_admin') {
                        roleGroup.style.display = 'none';
                    } else {
                        roleGroup.style.display = 'block';
                    }

                    document.getElementById('edit-user-modal').style.display = 'block';
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Delete user
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            if (confirm('Are you sure you want to delete this user?')) {
                fetchWithCSRF(`/admin/users/delete/${userId}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`Server error (${response.status}): ${text}`);
                        });
                    }
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        return response.text().then(text => {
                            throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        showMessage(data.message, 'success');
                        location.reload(); // Refresh to update tables
                    } else {
                        showMessage(data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('An error occurred. Please try again.', 'error');
                });
            }
        }
    });

    // Edit course
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('edit-course-btn')) {
            const courseId = e.target.getAttribute('data-course-id');
            // Fetch course data and populate modal
            fetchWithCSRF(`/admin/courses/${courseId}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const course = data.course;
                    document.getElementById('edit-course-id').value = course.id;
                    document.getElementById('edit-course-title').value = course.title;
                    document.getElementById('edit-course-description').value = course.description;
                    document.getElementById('edit-course-fee').value = course.fee;
                    document.getElementById('edit-course-category').value = course.category;
                    document.getElementById('edit-course-type').value = course.type;

                    const currentImageContainer = document.getElementById('current-image-container');
                    const currentImage = document.getElementById('current-image');
                    if (course.image_file && course.image_file !== 'default.jpg') {
                        currentImage.src = '/static/images/' + course.image_file;
                        currentImageContainer.style.display = 'block';
                    } else {
                        currentImageContainer.style.display = 'none';
                    }
                    document.getElementById('edit-course-modal').style.display = 'block';
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Delete course
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-course-btn')) {
            const courseId = e.target.getAttribute('data-course-id');
            if (confirm('Are you sure you want to delete this course?')) {
                fetchWithCSRF(`/admin/courses/delete/${courseId}`)
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`Server error (${response.status}): ${text}`);
                        });
                    }
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        return response.text().then(text => {
                            throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        showMessage(data.message, 'success');
                        location.reload(); // Refresh to update tables
                    } else {
                        showMessage(data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('An error occurred. Please try again.', 'error');
                });
            }
        }
    });



    // View course details
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('view-course-btn')) {
            const courseId = e.target.getAttribute('data-course-id');
            // Fetch course data and populate modal
            fetchWithCSRF(`/admin/courses/${courseId}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    const course = data.course;
                    document.getElementById('view-course-id').textContent = course.id;
                    document.getElementById('view-course-title').textContent = course.title;
                    document.getElementById('view-course-description').textContent = course.description;
                    document.getElementById('view-course-fee').textContent = '₹' + course.fee;
                    document.getElementById('view-course-category').textContent = course.category;
                    document.getElementById('view-course-type').textContent = course.type;
                    document.getElementById('view-course-image').src = '/static/images/' + course.image_file;
                    document.getElementById('view-course-modal').style.display = 'block';
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Approve user
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('approve-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            fetchWithCSRF(`/admin/users/status/${userId}/approve`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    location.reload(); // Refresh to update tables
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Reject user
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('reject-user-btn')) {
            const userId = e.target.getAttribute('data-user-id');
            fetchWithCSRF(`/admin/users/status/${userId}/reject`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    location.reload(); // Refresh to update tables
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Approve enrollment
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('approve-enrollment-btn')) {
            const enrollmentId = e.target.getAttribute('data-enrollment-id');
            fetchWithCSRF(`/admin/enrollments/approve/${enrollmentId}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    location.reload(); // Refresh to update tables
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Reject enrollment
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('reject-enrollment-btn')) {
            const enrollmentId = e.target.getAttribute('data-enrollment-id');
            fetchWithCSRF(`/admin/enrollments/reject/${enrollmentId}`)
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    showMessage(data.message, 'success');
                    location.reload(); // Refresh to update tables
                } else {
                    showMessage(data.message, 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('An error occurred. Please try again.', 'error');
            });
        }
    });

    // Unenroll student
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('unenroll-btn')) {
            const enrollmentId = e.target.getAttribute('data-enrollment-id');
            if (confirm('Are you sure you want to unenroll this student?')) {
                fetchWithCSRF(`/admin/unenroll/${enrollmentId}`, {
                    method: 'POST'
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`Server error (${response.status}): ${text}`);
                        });
                    }
                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                        return response.text().then(text => {
                            throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                        });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        showMessage(data.message, 'success');
                        location.reload(); // Refresh to update tables
                    } else {
                        showMessage(data.message, 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showMessage('An error occurred. Please try again.', 'error');
                });
            }
        }
    });

    // Download certificate
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('download-certificate-btn')) {
            const certId = e.target.getAttribute('data-certificate-id');
            window.open(`/admin/certificate/download/${certId}`, '_blank');
        }
    });

    // Handle edit user form submission
    const editUserForm = document.getElementById('edit-user-form');
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            fetchWithCSRF('/admin/users/edit', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update the table row
                    const userId = document.getElementById('edit-user-id').value;
                    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
                    if (row) {
                        const cells = row.querySelectorAll('td');
                        cells[1].textContent = data.user.username;
                        cells[2].textContent = data.user.email;
                        cells[3].textContent = data.user.mobile_number;
                        cells[4].textContent = data.user.role;
                        cells[5].textContent = data.user.status;

                        // Update the edit button data attributes
                        const editBtn = row.querySelector('.edit-user-btn');
                        if (editBtn) {
                            editBtn.setAttribute('data-user-username', data.user.username);
                            editBtn.setAttribute('data-user-email', data.user.email);
                            editBtn.setAttribute('data-user-mobile_number', data.user.mobile_number);
                            editBtn.setAttribute('data-user-role', data.user.role);
                            editBtn.setAttribute('data-user-status', data.user.status);
                            editBtn.setAttribute('data-user-full_name', data.user.full_name);
                            editBtn.setAttribute('data-user-discount', data.user.discount);
                        }
                    }

                    // Close modal
                    document.getElementById('edit-user-modal').style.display = 'none';

                    // Show success message
                    showMessage('User updated successfully!', 'success');
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    // Check if OTP is required
                    if (data.message && data.message.includes('OTP sent')) {
                        // Show OTP field
                        document.getElementById('otp-group').style.display = 'block';
                        showMessage('OTP sent to student\'s email. Please enter it to proceed.', 'info');
                        // Re-enable button
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        return;
                    }
                    showMessage(data.message || 'Error updating user. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error updating user. Please try again.', 'error');
            })
            .finally(() => {
                // Re-enable button only if not waiting for OTP
                if (!document.getElementById('otp-group').style.display || document.getElementById('otp-group').style.display === 'none') {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        });
    }

    // Handle edit course form submission
    const editCourseForm = document.getElementById('edit-course-form');
    if (editCourseForm) {
        editCourseForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;

            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            fetchWithCSRF(window.urls.admin_edit_course, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server error (${response.status}): ${text}`);
                    });
                }
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    return response.text().then(text => {
                        throw new Error(`Expected JSON response, got ${contentType}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // Update the table row
                    const courseId = document.getElementById('edit-course-id').value;
                    const row = document.querySelector(`tr[data-course-id="${courseId}"]`);
                    if (row) {
                        const cells = row.querySelectorAll('td');
                        cells[1].querySelector('img').src = '/static/images/' + data.course.image_file + '?t=' + new Date().getTime(); // Update image with cache buster
                        cells[1].querySelector('img').alt = data.course.title;
                        cells[2].textContent = data.course.title;
                        cells[3].textContent = '₹' + data.course.fee;

                        // Update the edit button data attributes
                        const editBtn = row.querySelector('.edit-course-btn');
                        if (editBtn) {
                            editBtn.setAttribute('data-course-title', data.course.title);
                            editBtn.setAttribute('data-course-description', data.course.description);
                            editBtn.setAttribute('data-course-fee', data.course.fee);
                            editBtn.setAttribute('data-course-category', data.course.category);
                            editBtn.setAttribute('data-course-type', data.course.type);
                            editBtn.setAttribute('data-course-image', data.course.image_file);
                        }
                    }

                    // Close modal
                    document.getElementById('edit-course-modal').style.display = 'none';

                    // Show success message
                    showMessage('Course updated successfully!', 'success');
                    // Refresh the page to show updated data
                    location.reload();
                } else {
                    showMessage(data.message || 'Error updating course. Please try again.', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showMessage('Error updating course. Please try again.', 'error');
            })
            .finally(() => {
                // Re-enable button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
        });
    }

    // Message display function
    function showMessage(message, type) {
        // Remove existing message
        const existingMessage = document.querySelector('.message-alert');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-alert ${type}`
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideInRight 0.3s ease;
        `;

        if (type === 'success') {
            messageDiv.style.backgroundColor = '#28a745';
        } else {
            messageDiv.style.backgroundColor = '#dc3545';
        }

        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}" style="margin-right: 10px;"></i>
            ${message}
        `;

        document.body.appendChild(messageDiv);

        // Auto remove after 5 seconds
        setTimeout(() => {
            messageDiv.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.parentNode.removeChild(messageDiv);
                }
            }, 300);
        }, 5000);
    }

    // Enrollment filters
    document.getElementById('apply-filters')?.addEventListener('click', function() {
        const statusFilter = document.getElementById('status-filter').value;
        const courseFilter = document.getElementById('course-filter').value;
        const userFilter = document.getElementById('user-filter').value;

        const rows = document.querySelectorAll('#enrollments table tbody tr');

        rows.forEach(row => {
            const status = row.cells[4].textContent.toLowerCase();
            const course = row.cells[2].textContent;
            const user = row.cells[1].textContent;

            const statusMatch = !statusFilter || status === statusFilter;
            const courseMatch = !courseFilter || course === courseFilter;
            const userMatch = !userFilter || user === userFilter;

            if (statusMatch && courseMatch && userMatch) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    document.getElementById('clear-filters')?.addEventListener('click', function() {
        document.getElementById('status-filter').value = 'active';
        document.getElementById('course-filter').value = '';
        document.getElementById('user-filter').value = '';

        const rows = document.querySelectorAll('#enrollments table tbody tr');
        rows.forEach(row => {
            row.style.display = '';
        });
    });

    // Generic search function
    function setupSearch(searchInputId, tableSelector, searchColumns) {
        const searchInput = document.getElementById(searchInputId);
        if (!searchInput) return;

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = document.querySelectorAll(`${tableSelector} tbody tr`);

            rows.forEach(row => {
                let match = false;
                searchColumns.forEach(colIndex => {
                    const cellText = row.cells[colIndex]?.textContent.toLowerCase() || '';
                    if (cellText.includes(searchTerm)) {
                        match = true;
                    }
                });
                row.style.display = match ? '' : 'none';
            });
        });
    }

    // Setup search for each section
    setupSearch('search-users', '#users-all table', [1, 2, 3]); // Username, Email, Mobile Number
    setupSearch('search-courses', '#courses table', [2, 3, 4]); // Title, Category, Fee (but fee is number, still searchable)
    setupSearch('search-enrollments', '#enrollments table', [1, 2]); // User, Course
    setupSearch('search-payments', '#payments table', [1, 2, 3]); // User, Amount, Status
    setupSearch('search-certificates', '#certificates table', [1, 2, 3]); // Username, Course Title, Date
    setupSearch('search-enquiries', '#enquiries table', [1, 2, 3, 4, 5]); // Name, Email, Phone, Course, Message



    // Category filter functionality
    function setupCategoryFilters() {
        const categoryFilter = document.getElementById('category-filter');

        if (categoryFilter) {
            categoryFilter.addEventListener('change', function() {
                filterCourses();
            });
        }
    }

    function filterCourses() {
        const activeFilter = document.getElementById('category-filter')?.value || 'all';
        const courseRows = document.querySelectorAll('#courses table tbody tr');

        courseRows.forEach(row => {
            if (row.querySelector('td[colspan]')) {
                // Skip empty state rows
                return;
            }

            const categoryCell = row.cells[3]; // Category is in the 4th column (index 3)
            const category = categoryCell ? categoryCell.textContent.toLowerCase().trim() : '';

            const mappedCategory = category.replace(/\s*&\s*/g, '-').replace(/\s+/g, '-').toLowerCase();

            if (activeFilter === 'all' || mappedCategory === activeFilter) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }



    // Initialize category filters
    setupCategoryFilters();



    // Load data functions
    function loadUsers() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateUsersTable(data.users);
            }
        })
        .catch(error => console.error('Error loading users:', error));
    }



    function loadAdmins() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateAdminsTable(data.users.filter(user => user.role === 'admin' || user.role === 'main_admin'));
            }
        })
        .catch(error => console.error('Error loading admins:', error));
    }

    function loadPendingUsers() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populatePendingUsersTable(data.users.filter(user => user.status === 'pending'));
            }
        })
        .catch(error => console.error('Error loading pending users:', error));
    }

    function loadCourses() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateCoursesTable(data.courses);
            }
        })
        .catch(error => console.error('Error loading courses:', error));
    }

    function loadEnrollments() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateEnrollmentsTable(data.enrollments);
            }
        })
        .catch(error => console.error('Error loading enrollments:', error));
    }

    function loadPayments() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populatePaymentsTable(data.payments);
            }
        })
        .catch(error => console.error('Error loading payments:', error));
    }

    function loadCertificates() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateCertificatesTable(data.certificates);
            }
        })
        .catch(error => console.error('Error loading certificates:', error));
    }

    function loadEnquiries() {
        fetchWithCSRF('/admin/api/panel')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                populateEnquiriesTable(data.enquiries);
            }
        })
        .catch(error => console.error('Error loading enquiries:', error));
    }

    // Populate table functions
    function populateUsersTable(users) {
        const tbody = document.getElementById('users-table-body');
        tbody.innerHTML = '';
        if (!Array.isArray(users)) {
            console.error('Expected an array for users, but received:', users);
            return;
        }
        users.forEach(user => {
            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id);
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.mobile_number || 'N/A'}</td>
                <td>${user.role}</td>
                <td>${user.status}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon">
                            <a href="#" class="view-user-btn" data-user-id="${user.id}" data-tooltip="View"><i class="fas fa-eye"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="edit-user-btn" data-user-id="${user.id}" data-user-username="${user.username}" data-user-email="${user.email}" data-user-mobile_number="${user.mobile_number || ''}" data-user-role="${user.role}" data-user-status="${user.status}" data-user-full_name="${user.full_name || ''}" data-user-discount="${user.discount || ''}" data-tooltip="Edit"><i class="fas fa-edit"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="delete-user-btn" data-user-id="${user.id}" data-user-username="${user.username}" data-tooltip="Delete"><i class="fas fa-trash"></i></a>
                        </div>
                        ${user.status === 'pending' ? `<div class="btn-icon"><a href="#" class="approve-user-btn" data-user-id="${user.id}" data-tooltip="Approve"><i class="fas fa-check"></i></a></div>` : ''}
                        ${user.status === 'pending' ? `<div class="btn-icon"><a href="#" class="reject-user-btn" data-user-id="${user.id}" data-tooltip="Reject"><i class="fas fa-times"></i></a></div>` : ''}
                        ${user.role === 'admin' ? `<div class="btn-icon"><a href="#" class="update-user-status-btn" data-user-id="${user.id}" data-action="activate" data-tooltip="Activate"><i class="fas fa-toggle-on"></i></a></div>` : ''}
                        ${user.role === 'admin' ? `<div class="btn-icon"><a href="#" class="update-user-status-btn" data-user-id="${user.id}" data-action="deactivate" data-tooltip="Deactivate"><i class="fas fa-toggle-off"></i></a></div>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }



    function populateAdminsTable(users) {
        const tbody = document.getElementById('admins-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon">
                            <a href="#" class="edit-user-btn" data-user-id="${user.id}" data-user-username="${user.username}" data-user-email="${user.email}" data-user-mobile_number="${user.mobile_number || ''}" data-user-role="${user.role}" data-user-status="${user.status}" data-user-full_name="${user.full_name || ''}" data-user-discount="${user.discount || ''}" data-tooltip="Edit"><i class="fas fa-edit"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="delete-user-btn" data-user-id="${user.id}" data-user-username="${user.username}" data-tooltip="Delete"><i class="fas fa-trash"></i></a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function populateCoursesTable(courses) {
        const tbody = document.getElementById('courses-table-body');
        tbody.innerHTML = '';
        courses.forEach(course => {
            const row = document.createElement('tr');
            row.setAttribute('data-course-id', course.id);
            row.innerHTML = `
                <td>${course.id}</td>
                <td><img src="/static/images/${course.image_file}" alt="${course.title}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${course.title}</td>
                <td>${course.category}</td>
                <td>₹${course.fee}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon">
                            <a href="#" class="view-course-btn" data-course-id="${course.id}" data-tooltip="View"><i class="fas fa-eye"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="edit-course-btn" data-course-id="${course.id}" data-course-title="${course.title}" data-course-description="${course.description}" data-course-fee="${course.fee}" data-course-category="${course.category}" data-course-type="${course.type}" data-course-image="${course.image_file}" data-tooltip="Edit"><i class="fas fa-edit"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="delete-course-btn" data-course-id="${course.id}" data-tooltip="Delete"><i class="fas fa-trash"></i></a>
                        </div>

                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function populateEnrollmentsTable(enrollments) {
        const tbody = document.getElementById('enrollments-table-body');
        tbody.innerHTML = '';
        enrollments.forEach(enrollment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${enrollment.id}</td>
                <td>${enrollment.user ? enrollment.user.username : 'N/A'}</td>
                <td>${enrollment.course ? enrollment.course.title : 'N/A'}</td>
                <td>0%</td>
                <td>${enrollment.status}</td>
                <td>₹0</td>
                <td>
                    <div class="action-buttons">
                        ${enrollment.status === 'pending' ? `<div class="btn-icon"><a href="#" class="approve-enrollment-btn" data-enrollment-id="${enrollment.id}" data-tooltip="Approve"><i class="fas fa-check"></i></a></div>` : ''}
                        ${enrollment.status === 'pending' ? `<div class="btn-icon"><a href="#" class="reject-enrollment-btn" data-enrollment-id="${enrollment.id}" data-tooltip="Reject"><i class="fas fa-times"></i></a></div>` : ''}
                        ${enrollment.status === 'active' ? `<div class="btn-icon"><a href="#" class="unenroll-btn" data-enrollment-id="${enrollment.id}" data-tooltip="Unenroll"><i class="fas fa-user-times"></i></a></div>` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function populatePaymentsTable(payments) {
        const tbody = document.getElementById('payments-table-body');
        tbody.innerHTML = '';
        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.id}</td>
                <td>${payment.user ? payment.user.username : 'N/A'}</td>
                <td>₹${payment.amount}</td>
                <td>${payment.status}</td>
                <td>${payment.created_on}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function populateCertificatesTable(certificates) {
        const tbody = document.getElementById('certificates-table-body');
        tbody.innerHTML = '';
        certificates.forEach(cert => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cert.id}</td>
                <td>${cert.username}</td>
                <td>${cert.course_title}</td>
                <td>${cert.date}</td>
                <td>
                    <button class="download-certificate-btn" data-certificate-id="${cert.id}"><i class="fas fa-download"></i> Download</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function populateEnquiriesTable(enquiries) {
        const tbody = document.getElementById('enquiries-table-body');
        tbody.innerHTML = '';
        enquiries.forEach(enquiry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${enquiry.id}</td>
                <td>${enquiry.name}</td>
                <td>${enquiry.email}</td>
                <td>${enquiry.phone}</td>
                <td>${enquiry.course}</td>
                <td>${enquiry.message}</td>
                <td>Pending</td>
                <td>${enquiry.created_on}</td>
            `;
            tbody.appendChild(row);
        });
    }

    function populatePendingUsersTable(users) {
        const tbody = document.getElementById('pending-users-table-body');
        tbody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.setAttribute('data-user-id', user.id);
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${user.mobile_number || 'N/A'}</td>
                <td>${user.role}</td>
                <td>${user.status}</td>
                <td>
                    <div class="action-buttons">
                        <div class="btn-icon">
                            <a href="#" class="view-user-btn" data-user-id="${user.id}" data-tooltip="View"><i class="fas fa-eye"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="edit-user-btn" data-user-id="${user.id}" data-user-username="${user.username}" data-user-email="${user.email}" data-user-mobile_number="${user.mobile_number || ''}" data-user-role="${user.role}" data-user-status="${user.status}" data-user-full_name="${user.full_name || ''}" data-user-discount="${user.discount || ''}" data-tooltip="Edit"><i class="fas fa-edit"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="delete-user-btn" data-user-id="${user.id}" data-user-username="${user.username}" data-tooltip="Delete"><i class="fas fa-trash"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="approve-user-btn" data-user-id="${user.id}" data-tooltip="Approve"><i class="fas fa-check"></i></a>
                        </div>
                        <div class="btn-icon">
                            <a href="#" class="reject-user-btn" data-user-id="${user.id}" data-tooltip="Reject"><i class="fas fa-times"></i></a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
        /* Filter styles moved to CSS file */
    `;
    document.head.appendChild(style);
});

// Generic search function for admin panel sections
function setupSearch(sectionId) {
    const searchInput = document.getElementById(`search-${sectionId}`);
    const searchIcon = document.querySelector(`.search-icon[data-section="${sectionId}"]`);

    if (!searchInput) return;

    // Function to perform search
    function performSearch() {
        const query = searchInput.value.toLowerCase().trim();
        const section = document.getElementById(sectionId);
        if (!section) return;

        // Find the table in the current section
        const table = section.querySelector('table');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            let match = false;

            cells.forEach(cell => {
                const text = cell.textContent.toLowerCase();
                if (text.includes(query)) {
                    match = true;
                }
            });

            row.style.display = match || query === '' ? '' : 'none';
        });
    }

    // Add event listener for Enter key
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Add event listener for search icon click
    if (searchIcon) {
        searchIcon.addEventListener('click', function() {
            performSearch();
        });
    }
}
