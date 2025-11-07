// Gallery JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeGallery();
});

function initializeGallery() {
    setupFilters();
    setupModal();
}

// Filter functionality
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');

            const filterValue = this.getAttribute('data-filter');

            galleryItems.forEach(item => {
                const category = item.getAttribute('data-category');

                if (filterValue === 'all' || category === filterValue) {
                    item.style.display = 'block';
                    // Add animation
                    item.style.animation = 'fadeIn 0.5s ease forwards';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// Modal functionality
function setupModal() {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const captionText = document.getElementById('caption');
    const galleryItems = document.querySelectorAll('.gallery-item');
    const closeBtn = document.querySelector('.close');

    galleryItems.forEach(item => {
        const img = item.querySelector('img');
        const overlay = item.querySelector('.gallery-overlay');

        // Click on overlay to open modal
        if (overlay) {
            overlay.addEventListener('click', function() {
                modal.style.display = 'flex';
                modal.classList.add('show');
                modalImg.src = img.src;
                captionText.innerHTML = item.querySelector('.overlay-content h3').innerHTML +
                                      '<br>' + item.querySelector('.overlay-content p').innerHTML;
            });
        }

        // Click on image to open modal
        img.addEventListener('click', function() {
            modal.style.display = 'flex';
            modal.classList.add('show');
            modalImg.src = this.src;
            captionText.innerHTML = item.querySelector('.overlay-content h3').innerHTML +
                                  '<br>' + item.querySelector('.overlay-content p').innerHTML;
        });
    });

    // Close modal when clicking close button
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            modal.classList.remove('show');
        });
    }

    // Close modal when clicking outside the image
    modal.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });

    // Close modal on Escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
            modal.classList.remove('show');
        }
    });
}

// Add fadeIn animation for filtered items
const galleryStyle = document.createElement('style');
galleryStyle.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(galleryStyle);
