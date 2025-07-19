// Landing page functionality

// Global functions for button clicks
function scrollToMaps() {
    document.getElementById('maps').scrollIntoView({
        behavior: 'smooth'
    });
}

// Map navigation function
function openMap(mapName) {
    window.location.href = `map.html?map=${mapName}`;
}

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add click handlers to map cards
    const mapCards = document.querySelectorAll('.map-card');
    mapCards.forEach(card => {
        const mapName = card.dataset.map;
        
        // Add click handler to the entire card
        card.addEventListener('click', function(e) {
            // Don't trigger if clicking on play button
            if (!e.target.closest('.play-btn')) {
                openMap(mapName);
            }
        });
        
        // Add specific handler to play button
        const playBtn = card.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                openMap(mapName);
            });
        }
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks2 = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks2) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks2.classList.toggle('active');
            this.classList.toggle('active');
        });
    }

    // "Get Started" button
    const navCta = document.querySelector('.nav-cta');
    if (navCta) {
        navCta.addEventListener('click', function() {
            scrollToMaps();
        });
    }

    // Add animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe all cards and sections
    const animateElements = document.querySelectorAll('.map-card, .feature-card, .hero-content');
    animateElements.forEach(el => observer.observe(el));
});
