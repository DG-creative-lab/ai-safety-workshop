const revealTargets = document.querySelectorAll('.hero-copy, .visual-card, .card');

revealTargets.forEach((element, index) => {
  element.classList.add('reveal');
  element.style.transitionDelay = `${index * 120}ms`;
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.2,
  }
);

revealTargets.forEach((element) => observer.observe(element));
