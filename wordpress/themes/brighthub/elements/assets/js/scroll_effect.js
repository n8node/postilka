jQuery(document).ready(function($) {
    if (window.gsap && window.ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);
      }
      
      function initScrollItemRun() {
        const items = document.querySelectorAll(
          '[data-scroll-effect="scroll-item-run"]'
        );
      
        items.forEach((el) => {
          const triggerTopRaw = el.getAttribute('data-trigger-top') || '0';
          const triggerOffsetPx = parseInt(triggerTopRaw, 10) || 0;
      
          let direction = 0;
          if (el.classList.contains('scroll-item-run-right-to-left')) {
            direction = 100;
          } else if (el.classList.contains('scroll-item-run-left-to-right')) {
            direction = -100;
          }
      
          gsap.set(el, { xPercent: direction, willChange: 'transform' });
      
          gsap.to(el, {
            xPercent: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: `top+=${triggerOffsetPx} bottom`,
              end: () => `top+=${triggerOffsetPx} ${window.innerHeight * (2 / 3)}`,
              scrub: true,
              invalidateOnRefresh: true
              // markers: true,
            },
          });
        });
      }
      
      document.readyState !== 'loading'
        ? initScrollItemRun()
        : document.addEventListener('DOMContentLoaded', initScrollItemRun);
      
});