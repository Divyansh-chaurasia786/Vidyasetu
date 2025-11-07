// Home page utilities and interactions
window.HomePageUtils = {
    initAllFeatures: function() {
        this.initTypingEffect();
        this.initScrollAnimations();
        this.initCourseFilters();
        this.initTestimonialSlider();
        this.initFeaturedCarousel();
        this.initNavbarToggle();
        this.initSmoothScrolling();
        this.initReadMoreLinks();
        this.hideLoadingAnimation();
    },

    hideLoadingAnimation: function() {
        const loadingElement = document.querySelector('.loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    },

    initTypingEffect: function() {
        const typingText = document.querySelector('.typing-text');
        if (!typingText) return;

        const text = "Master Technology Through Hands-On Learning";
        let index = 0;
        let isDeleting = false;

        function typeWriter() {
            if (!isDeleting) {
                typingText.textContent = text.substring(0, index + 1);
                index++;
                if (index === text.length) {
                    isDeleting = true;
                    setTimeout(typeWriter, 2000);
                    return;
                }
            } else {
                typingText.textContent = text.substring(0, index - 1);
                index--;
                if (index === 0) {
                    isDeleting = false;
                }
            }
            setTimeout(typeWriter, isDeleting ? 50 : 100);
        }

        typeWriter();
    },

    initScrollAnimations: function() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.fade-in').forEach(el => {
            observer.observe(el);
        });
    },

    initCourseFilters: function() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const courseCards = document.querySelectorAll('.course-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');

                const filter = button.getAttribute('data-filter').toLowerCase();

                courseCards.forEach(card => {
                    const category = card.getAttribute('data-category');
                    if (filter === 'all' || (category && category.toLowerCase().replace(/\s+/g, '-') === filter)) {
                        card.style.display = 'block';
                        card.style.animation = 'fadeInUp 0.5s ease forwards';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    },

    initTestimonialSlider: function() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        if (testimonials.length === 0) return;

        let currentIndex = 0;
        const totalSlides = testimonials.length;

        function showSlide(index) {
            testimonials.forEach((testimonial, i) => {
                testimonial.style.display = i === index ? 'block' : 'none';
            });
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % totalSlides;
            showSlide(currentIndex);
        }

        // Auto slide every 5 seconds
        setInterval(nextSlide, 5000);

        // Show first slide
        showSlide(0);
    },

    initNavbarToggle: function() {
        const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
        const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
        const mobileMenuClose = document.querySelector('.mobile-menu-close');

        if (mobileMenuToggle && mobileMenuOverlay) {
            // Toggle menu on button click
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenuToggle.classList.toggle('active');
                mobileMenuOverlay.classList.toggle('active');
            });

            // Close menu on close button click
            if (mobileMenuClose) {
                mobileMenuClose.addEventListener('click', () => {
                    mobileMenuToggle.classList.remove('active');
                    mobileMenuOverlay.classList.remove('active');
                });
            }

            // Close menu when clicking outside
            mobileMenuOverlay.addEventListener('click', (e) => {
                if (e.target === mobileMenuOverlay) {
                    mobileMenuToggle.classList.remove('active');
                    mobileMenuOverlay.classList.remove('active');
                }
            });
        }
    },

    initSmoothScrolling: function() {
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
    },

    initFeaturedCarousel: function() {
        const carouselTrack = document.getElementById('carouselTrack');
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const indicators = document.getElementById('carouselIndicators');

        if (!carouselTrack || !prevBtn || !nextBtn || !indicators) return;

        const slides = carouselTrack.querySelectorAll('.carousel-slide');
        if (slides.length === 0) return;

        let currentSlide = 0;
        const totalSlides = slides.length;

        function updateCarousel() {
            const translateX = -currentSlide * 100;
            carouselTrack.style.transform = `translateX(${translateX}%)`;

            // Update indicators
            const indicatorSpans = indicators.querySelectorAll('.indicator');
            indicatorSpans.forEach((indicator, index) => {
                indicator.classList.toggle('active', index === currentSlide);
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % totalSlides;
            updateCarousel();
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
            updateCarousel();
        }

        function goToSlide(slideIndex) {
            currentSlide = slideIndex;
            updateCarousel();
        }

        // Event listeners
        nextBtn.addEventListener('click', nextSlide);
        prevBtn.addEventListener('click', prevSlide);

        // Indicator click handlers
        indicators.addEventListener('click', (e) => {
            if (e.target.classList.contains('indicator')) {
                const slideIndex = parseInt(e.target.getAttribute('data-slide'));
                goToSlide(slideIndex);
            }
        });

        // Auto slide every 8 seconds
        setInterval(nextSlide, 8000);

        // Initialize
        updateCarousel();
    },

    initReadMoreLinks: function() {
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('read-more-link')) {
                e.preventDefault();
                const link = e.target;
                const descriptionText = link.previousElementSibling;
                const fullText = descriptionText.getAttribute('data-full-text');

                if (link.classList.contains('expanded')) {
                    // Collapse back to truncated text
                    const truncatedText = fullText.length > 120 ? fullText.substring(0, 120) + '...' : fullText;
                    descriptionText.textContent = truncatedText;
                    link.textContent = 'Read More';
                    link.classList.remove('expanded');
                } else {
                    // Expand to full text
                    descriptionText.textContent = fullText;
                    link.textContent = 'Read Less';
                    link.classList.add('expanded');
                }
            }
        });
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.HomePageUtils.initAllFeatures();
});
