/**
 * animations.js - Fluid GSAP Scroll Animations
 * Handles high-end interactions and micro-animations for Hariprabodham Kathamrut
 */

document.addEventListener('DOMContentLoaded', () => {
    // Only run if GSAP is loaded
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
        console.warn("GSAP not loaded. Skipping fluid animations.");
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    initHeroParallax();
    initDynamicCardReveals();
});

// 1. Hero Section Parallax and Entrance
function initHeroParallax() {
    const heroTitle = document.querySelector('.hero-title');
    const heroQuote = document.querySelector('.hero-quote');
    const heroActions = document.querySelector('.hero-actions');
    const heroBg = document.querySelector('.hero-overlay'); // Changed from #bgCanvas to prevent interaction blocking

    // Entrance Animation
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    
    if (heroTitle) {
        gsap.set(heroTitle, { y: 30, opacity: 0 });
        tl.to(heroTitle, { y: 0, opacity: 1, duration: 1.2, delay: 0.2 });
    }
    
    if (heroQuote) {
        gsap.set(heroQuote, { y: 20, opacity: 0 });
        tl.to(heroQuote, { y: 0, opacity: 1, duration: 1 }, "-=0.8");
    }
    
    if (heroActions) {
        gsap.set(heroActions, { y: 20, opacity: 0 });
        tl.to(heroActions, { y: 0, opacity: 1, duration: 1 }, "-=0.6");
    }

    // Scroll Parallax
    if (heroBg) {
        gsap.to(heroBg, {
            yPercent: 30, // Move down slightly as you scroll down
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: true
            }
        });
    }
}

// 2. Dynamic Card Reveals (handles both static and dynamically loaded cards)
function initDynamicCardReveals() {
    // We use a general function to animate a grid of cards
    function animateCardsInGrid(gridElement) {
        const cards = gridElement.querySelectorAll('.article-card, .avatar-card, .category-chip');
        if (cards.length === 0) return;

        // Reset state
        gsap.set(cards, { y: 40, opacity: 0, rotationX: 5 });

        ScrollTrigger.create({
            trigger: gridElement,
            start: "top 85%", // Trigger when the grid is 15% from the bottom of the viewport
            onEnter: () => {
                gsap.to(cards, {
                    y: 0,
                    opacity: 1,
                    rotationX: 0,
                    duration: 0.8,
                    stagger: 0.1, // Cascade effect
                    ease: "back.out(1.2)",
                    overwrite: "auto"
                });
            },
            once: true // Only animate once
        });
    }

    // Since content loads dynamically via JS, we observe the main containers
    const gridsToObserve = document.querySelectorAll('.cards-grid, .category-chips');
    
    gridsToObserve.forEach(grid => {
        // Initial check in case they are already populated
        if (grid.children.length > 0) {
            animateCardsInGrid(grid);
        }

        // Set up mutation observer to catch dynamically injected cards
        const observer = new MutationObserver((mutations) => {
            let hasNewNodes = false;
            for (let mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    hasNewNodes = true;
                    break;
                }
            }

            if (hasNewNodes) {
                // Wait just a tick for layout to settle
                setTimeout(() => animateCardsInGrid(grid), 50);
                
                // If it's the home page 'Latest' feed which might refresh constantly, 
                // we might want to refresh ScrollTrigger
                setTimeout(() => ScrollTrigger.refresh(), 200);
            }
        });

        observer.observe(grid, { childList: true });
    });

    // Also animate section titles when they scroll into view
    gsap.utils.toArray('.section-title').forEach(title => {
        gsap.fromTo(title, 
            { opacity: 0, x: -30 }, 
            { 
                opacity: 1, x: 0, duration: 1, ease: "power2.out",
                scrollTrigger: {
                    trigger: title,
                    start: "top 90%",
                    once: true
                }
            }
        );
    });
}
