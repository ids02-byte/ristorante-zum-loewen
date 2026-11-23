/* Clientseitiger Sprachwechsel, ohne Cookies oder externen Übersetzungsdienst. */
(() => {
    const supported = new Set(['de', 'en', 'it']);
    const params = new URLSearchParams(window.location.search);
    const requested = params.get('lang');
    const language = supported.has(requested) ? requested : 'de';
    const select = document.getElementById('language-select');
    const dictionary = language === 'de' ? {} : (window.siteTranslations && window.siteTranslations[language]) || {};
    const labels = {
        de: {chooser: 'Sprache wählen', phone: 'Jetzt telefonisch reservieren', activate: 'Interaktive Karte aktivieren – dabei können Daten an Google übertragen werden', privacy: 'Beim Aktivieren wird Google Maps geladen. Details zum Datenschutz finden Sie in der Datenschutzerklärung.', preview: 'Schematische Standortvorschau des Ristorante Pizzeria Zum Löwen in Friedewald', map: 'Standort des Ristorante Pizzeria Zum Löwen auf Google Maps', facebook: 'Facebook', instagram: 'Instagram'},
        en: {chooser: 'Select language', phone: 'Reserve by phone', activate: 'Activate interactive map – some data may be sent to Google', privacy: 'Activating this map loads Google Maps. See our privacy policy for details.', preview: 'Schematic location preview of Ristorante Pizzeria Zum Löwen in Friedewald', map: 'Ristorante Pizzeria Zum Löwen location on Google Maps', facebook: 'Facebook', instagram: 'Instagram'},
        it: {chooser: 'Seleziona la lingua', phone: 'Prenota per telefono', activate: 'Attiva la mappa interattiva – alcuni dati potrebbero essere inviati a Google', privacy: 'L’attivazione carica Google Maps. Ulteriori dettagli nell’informativa sulla privacy.', preview: 'Anteprima schematica della posizione del Ristorante Pizzeria Zum Löwen a Friedewald', map: 'Posizione del Ristorante Pizzeria Zum Löwen su Google Maps', facebook: 'Facebook', instagram: 'Instagram'}
    };
    const l = labels[language];
    document.documentElement.lang = language;
    if (select) {
        select.value = language;
        const code = document.querySelector('.language-switch-code');
        if (code) code.textContent = language.toUpperCase();
        select.setAttribute('aria-label', l.chooser);
        const hiddenLabel = document.querySelector('label[for="language-select"]');
        if (hiddenLabel) hiddenLabel.textContent = l.chooser;
        select.addEventListener('change', () => {
            const target = new URL(window.location.href);
            if (select.value === 'de') target.searchParams.delete('lang');
            else target.searchParams.set('lang', select.value);
            window.location.assign(target.href);
        });
    }
    if (language !== 'de') {
        // Nur reine Textknoten übersetzen: HTML-Elemente, Preise und Verlinkungen bleiben intakt.
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent || parent.closest('script,style,noscript,svg')) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            const original = node.nodeValue;
            const key = original.trim().replace(/\s+/g, ' ');
            const translated = dictionary[key];
            if (!translated) return;
            const lead = original.match(/^\s*/)[0];
            const trail = original.match(/\s*$/)[0];
            node.nodeValue = lead + translated + trail;
        });
        const titles = {
            en: { 'index.html': 'Home – Ristorante Pizzeria Zum Löwen', 'speisekarte.html': 'Menu – Ristorante Pizzeria Zum Löwen', 'impressum.html': 'Legal notice – Ristorante Pizzeria Zum Löwen', 'datenschutz.html': 'Privacy policy – Ristorante Pizzeria Zum Löwen' },
            it: { 'index.html': 'Home – Ristorante Pizzeria Zum Löwen', 'speisekarte.html': 'Menù – Ristorante Pizzeria Zum Löwen', 'impressum.html': 'Note legali – Ristorante Pizzeria Zum Löwen', 'datenschutz.html': 'Informativa sulla privacy – Ristorante Pizzeria Zum Löwen' }
        };
        const filename = location.pathname.split('/').pop() || 'index.html';
        document.title = titles[language][filename] || document.title;
        const descriptions = {
            en: {
                'index.html': 'Ristorante Pizzeria Zum Löwen in Friedewald – Italian cuisine, stone-baked pizza, pasta and more.',
                'speisekarte.html': 'Explore the menu at Ristorante Pizzeria Zum Löwen in Friedewald – pizza, pasta, antipasti, meat, fish and desserts.',
                'impressum.html': 'Legal notice and contact information for Ristorante Pizzeria Zum Löwen in Friedewald.',
                'datenschutz.html': 'Privacy policy of Ristorante Pizzeria Zum Löwen in Friedewald, including information about hosting, contact and Google Maps.'
            },
            it: {
                'index.html': 'Ristorante Pizzeria Zum Löwen a Friedewald – cucina italiana, pizza cotta nel forno a pietra, pasta e molto altro.',
                'speisekarte.html': 'Scopri il menù del Ristorante Pizzeria Zum Löwen a Friedewald – pizza, pasta, antipasti, carne, pesce e dessert.',
                'impressum.html': 'Note legali e contatti del Ristorante Pizzeria Zum Löwen a Friedewald.',
                'datenschutz.html': 'Informativa sulla privacy del Ristorante Pizzeria Zum Löwen a Friedewald, con dettagli su hosting, contatti e Google Maps.'
            }
        };
        const description = descriptions[language][filename];
        const desc = document.querySelector('meta[name="description"]');
        if (desc && description) desc.content = description;
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = titles[language][filename] || ogTitle.content;
        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc && description) ogDesc.content = description;
    }
    // Die aktuelle Sprachwahl auch bei Seitenwechsel und Links zu den Rechtstexten beibehalten.
    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        if (!href || !/^(?:index|speisekarte|impressum|datenschutz)\.html(?:[?#]|$)/.test(href)) return;
        const url = new URL(href, window.location.href);
        if (language === 'de') url.searchParams.delete('lang');
        else url.searchParams.set('lang', language);
        a.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
    });
    document.querySelectorAll('.phone-float, .reserve-button').forEach(el => el.setAttribute('aria-label', l.phone));
    const accept = document.getElementById('map-consent-accept');
    if (accept) { accept.setAttribute('aria-label', l.activate); accept.title = l.privacy; }
    // Auch Bildbeschreibungen und der Scroll-Button werden lokalisiert.
    const imageAlts = {
        en: {
            'zum löwen logo': 'Zum Löwen restaurant logo',
            ' pizza bild': 'Pizza at Ristorante Zum Löwen',
            'Linkes Bild': 'Zum Löwen restaurant logo',
            'Rechtes Bild': 'Pizza at Ristorante Zum Löwen',
            'Logo Ristorante Pizzeria Zum Löwen': 'Ristorante Pizzeria Zum Löwen logo',
            'Pizza im Ristorante Pizzeria Zum Löwen': 'Pizza at Ristorante Pizzeria Zum Löwen',
            'Restaurant Ausenbereich': 'Restaurant terrace',
            'Grünesaal': 'Green dining room',
            'kammienzimmer': 'Fireplace dining room',
            'Pizza vom Steinofen': 'Stone-baked pizza',
            'Antipasti & Salate': 'Antipasti & salads',
            'Fleisch': 'Meat dishes',
            'Fisch': 'Fish dishes'
        },
        it: {
            'zum löwen logo': 'Logo del ristorante Zum Löwen',
            ' pizza bild': 'Pizza del Ristorante Zum Löwen',
            'Linkes Bild': 'Logo del ristorante Zum Löwen',
            'Rechtes Bild': 'Pizza del Ristorante Zum Löwen',
            'Logo Ristorante Pizzeria Zum Löwen': 'Logo del Ristorante Pizzeria Zum Löwen',
            'Pizza im Ristorante Pizzeria Zum Löwen': 'Pizza del Ristorante Pizzeria Zum Löwen',
            'Restaurant Ausenbereich': 'Terrazza del ristorante',
            'Grünesaal': 'Sala verde',
            'kammienzimmer': 'Sala con camino',
            'Pizza vom Steinofen': 'Pizza cotta nel forno a pietra',
            'Antipasti & Salate': 'Antipasti e insalate',
            'Fleisch': 'Piatti di carne',
            'Fisch': 'Piatti di pesce'
        }
    };
    document.querySelectorAll('img[alt]').forEach(img => {
        if (language !== 'de') {
            const translated = imageAlts[language][img.getAttribute('alt')];
            if (translated) img.alt = translated;
        }
    });
    const up = document.querySelector('.back-to-top');
    if (up) {
        const text = language === 'en' ? 'Back to top' : language === 'it' ? 'Torna all’inizio' : 'Zurück nach oben';
        up.title = text;
        up.setAttribute('aria-label', text);
    }
    const preview = document.querySelector('.map-preview-image');
    if (preview) preview.alt = l.preview;
    // Das bestehende Maps-Skript erzeugt das iFrame erst nach Einwilligung.
    const target = document.getElementById('map-consent-frame');
    if (target) {
        const observer = new MutationObserver(() => {
            const frame = target.querySelector('iframe');
            if (frame) frame.title = l.map;
        });
        observer.observe(target, { childList: true });
    }
})();
