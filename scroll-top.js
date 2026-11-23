// Gemeinsamer „Nach oben“-Button für alle Seiten.
(() => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.textContent = '↑';
    button.title = 'Nach oben scrollen';
    button.setAttribute('aria-label', 'Zurück nach oben');
    button.hidden = true;
    document.body.appendChild(button);

    const updateVisibility = () => {
        button.hidden = window.scrollY < 320;
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    updateVisibility();

    button.addEventListener('click', () => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
})();
