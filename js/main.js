document.addEventListener('DOMContentLoaded', () => {
    // --- Navbar Scroll Effect ---
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Toggle ---
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (menuBtn && navLinks) {
        const closeMenu = () => {
            navLinks.classList.remove('active');
            menuBtn.classList.remove('open');
            menuBtn.setAttribute('aria-expanded', 'false');
        };

        menuBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            menuBtn.classList.toggle('open', isOpen);
            menuBtn.setAttribute('aria-expanded', String(isOpen));
        });

        // Close after navigating, otherwise the menu covers the target section
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeMenu();
        });
    }

    // --- Smooth Scrolling for Anchor Links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                // Close mobile menu if open (implementation placeholder)
                // document.querySelector('.nav-links').classList.remove('active');
                
                // Account for fixed navbar height
                const navHeight = navbar.offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    // --- Contact Form Handling (Formspree AJAX) ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            
            btn.textContent = '傳送中...';
            btn.style.opacity = '0.7';
            btn.disabled = true;
            
            const data = new FormData(contactForm);
            
            try {
                // 發送 AJAX 請求到 Formspree
                const response = await fetch(contactForm.action, {
                    method: contactForm.method,
                    body: data,
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    alert('感謝您的來信，我們將盡快與您聯繫！');
                    contactForm.reset();
                } else {
                    const responseData = await response.json();
                    if (Object.hasOwn(responseData, 'errors')) {
                        alert(responseData["errors"].map(error => error["message"]).join(", "));
                    } else {
                        alert('傳送失敗，請稍後再試或直接發送信件給我們。');
                    }
                }
            } catch (error) {
                alert('網路錯誤，請稍後再試。');
            } finally {
                btn.textContent = originalText;
                btn.style.opacity = '1';
                btn.disabled = false;
            }
        });
    }
});

// 語言切換：改用點擊開合。原本是純 CSS :hover，觸控裝置上沒有 hover，
// 手機與平板完全打不開這個選單。
document.querySelectorAll('.lang-switcher').forEach(sw => {
    const btn = sw.querySelector('.lang-btn');
    if (!btn) return;

    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');

    const close = () => {
        sw.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
    };

    btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = sw.classList.toggle('open');
        btn.setAttribute('aria-expanded', String(open));
    });

    // 點到選單以外的地方就收起來
    document.addEventListener('click', e => {
        if (!sw.contains(e.target)) close();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') close();
    });
});

// 轉換追蹤：把「讀者實際做了什麼」記下來。沒有設定 GA ID 時 gtag 不存在，
// 事件會留在佇列裡不送出，也不會報錯——之後補上 ID 就自動生效。
(function () {
    const queue = [];
    const send = (name, params) => {
        if (typeof window.gtag === 'function') {
            window.gtag('event', name, params);
        } else {
            queue.push([name, params]);
        }
    };
    // gtag 若稍後才載入，把先前排隊的事件補送
    window.addEventListener('load', () => {
        if (typeof window.gtag === 'function') {
            while (queue.length) window.gtag('event', ...queue.shift());
        }
    });

    const pageType = location.pathname.includes('/blog/')
        ? (location.pathname.split('/blog/')[1] ? 'article' : 'blog_index')
        : (location.pathname.replace(/^\/(en|zh-cn)\//, '/').replace(/\//g, '') || 'home');

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        const href = a.getAttribute('href') || '';

        // 導向平台本身——這是最接近成交的一步
        if (href.includes('app.kineticlinks.net') || href.includes('speedtest.kineticlinks.net')) {
            send('platform_click', { platform: href.split('//')[1].split('.')[0], from: pageType });
        } else if (href.includes('t.me/')) {
            send('telegram_click', { from: pageType });
        } else if (/^\/(en\/|zh-cn\/)?(ssl|speedtest|cdn|vps|idc|cloud)\/$/.test(href)) {
            // 導向服務或平台頁。位置要分開記：內文連結、延伸閱讀卡片與
            // 文末 CTA 的效果差很多，混在一起就看不出哪個placement有用。
            const placement = a.closest('.article-body') ? 'body'
                : a.closest('.related-grid') ? 'related'
                : a.classList.contains('btn-primary') ? 'cta'
                : a.closest('footer') ? 'footer' : 'other';
            send('service_click', { target: href.replace(/^\/(en|zh-cn)\//, '/'), placement: placement, from: pageType });
        } else if (href.startsWith('http') && a.rel && a.rel.includes('sponsored')) {
            send('affiliate_click', { from: pageType });
        }
    });

    const form = document.getElementById('contactForm');
    if (form) form.addEventListener('submit', () => send('contact_submit', { from: pageType }));

    // 只有文章頁量閱讀深度：曝光高但沒人讀完，跟沒人看到是兩種問題
    if (pageType === 'article') {
        const marks = [25, 50, 75, 100];
        const hit = new Set();
        const onScroll = () => {
            const h = document.documentElement;
            const view = h.clientHeight || window.innerHeight || 0;
            // 頁面比視窗短時整篇本來就看得完，直接記 100，否則永遠不會觸發
            const pct = h.scrollHeight <= view ? 100
                : (h.scrollTop + view) / h.scrollHeight * 100;
            for (const m of marks) {
                if (pct >= m && !hit.has(m)) {
                    hit.add(m);
                    send('scroll_depth', { percent: m, page: location.pathname });
                }
            }
            if (hit.size === marks.length) window.removeEventListener('scroll', onScroll);
        };
        window.addEventListener('scroll', onScroll, { passive: true });
    }
})();

/* ------------------------------------------------------------------
   Inline ICP lookup
   ------------------------------------------------------------------
   The tool runs on its own subdomain. Putting the form on the landing
   page means someone who searched for a lookup gets one without a
   second click, on the URL that can actually rank for the query.

   The form stays hidden until a probe confirms the API answers
   cross-origin requests. Until the subdomain sends
   Access-Control-Allow-Origin the browser blocks every call, and
   revealing a form that cannot work would be worse than the button
   that is already there — so this reveals nothing and the page keeps
   its existing behaviour, then upgrades itself once the header lands.
   ------------------------------------------------------------------ */
(function () {
    const root = document.querySelector('[data-inline-tool]');
    if (!root) return;

    const api = root.dataset.api;
    const form = root.querySelector('.inline-tool-form');
    const input = root.querySelector('input');
    const button = root.querySelector('button');
    const result = root.querySelector('.inline-tool-result');
    const cta = root.querySelector('.inline-tool-cta');
    const ctaText = cta.querySelector('p');
    if (!api || !form) return;

    const track = (name, params) => {
        if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    };

    const show = (state, headline, detail) => {
        result.className = 'inline-tool-result show ' + state;
        result.textContent = '';
        const h = document.createElement('p');
        h.className = 'inline-tool-headline';
        h.textContent = headline;          // textContent: typed input never becomes markup
        result.appendChild(h);
        if (detail) {
            const d = document.createElement('p');
            d.className = 'inline-tool-detail';
            d.textContent = detail;
            result.appendChild(d);
        }
    };

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const value = input.value.trim();
        if (!value) return;

        cta.hidden = true;
        button.disabled = true;
        show('pending', root.dataset.checking);

        fetch(api + '?domain=' + encodeURIComponent(value), { mode: 'cors' })
            .then((res) => res.json().then((data) => [res.ok, data]))
            .then(([ok, data]) => {
                if (!ok) {
                    show('error', data.message || root.dataset.error);
                    return;
                }
                const name = data.domain || value;
                if (data.verdict === 'registered') {
                    show('ok', name + ' ' + root.dataset.registered,
                         root.dataset.registeredDetail);
                } else if (data.verdict === 'not_registered') {
                    show('warn', name + ' ' + root.dataset.notRegistered,
                         root.dataset.notRegisteredDetail);
                    // No filing is exactly when a pre-filed domain is worth offering.
                    ctaText.textContent = root.dataset.ctaText;
                    cta.hidden = false;
                } else {
                    show('error', root.dataset.error);
                }
                track('icp_lookup', { verdict: data.verdict || 'unknown', placement: 'inline' });
            })
            .catch(() => show('error', root.dataset.error))
            .finally(() => { button.disabled = false; });
    });

    // Probe once, idly, against the health endpoint rather than the lookup.
    // /api/check counts against the visitor's rate limit before it even looks
    // at its cache, so probing there would spend one of their allowance on
    // every page view — and ten reloads would lock them out before they had
    // searched for anything. /healthz is not rate limited and still proves
    // the API will answer this origin.
    const probe = () => {
        let health;
        try { health = new URL(api).origin + '/healthz'; } catch (e) { return; }
        fetch(health, { mode: 'cors' })
            .then((res) => { if (res.ok) root.hidden = false; })
            .catch(() => { /* no CORS yet: leave the existing button in place */ });
    };
    if ('requestIdleCallback' in window) requestIdleCallback(probe, { timeout: 3000 });
    else setTimeout(probe, 1200);
})();

/* ------------------------------------------------------------------
   The key-mode control on /ssl/
   ------------------------------------------------------------------
   The page's argument is that you choose where the private key lives,
   so the choice is a real control rather than a sentence about one.
   Every mode's readout is already in the markup as data attributes:
   with no script the first mode stays selected and its radio still
   works, so the control degrades to a plain radio group.
   ------------------------------------------------------------------ */
(function () {
    const root = document.querySelector('[data-key-picker]');
    if (!root) return;

    const out = {
        where: root.querySelector('[data-key-where]'),
        path: root.querySelector('[data-key-path]'),
        reach: root.querySelector('[data-key-reach]'),
        verdict: root.querySelector('[data-key-verdict]'),
    };
    if (!out.where) return;

    const show = (input) => {
        out.where.textContent = input.dataset.where || '';
        out.path.textContent = input.dataset.path || '';
        out.reach.textContent = input.dataset.reach || '';
        out.verdict.textContent = input.dataset.verdict || '';
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'key_mode', { mode: input.value });
        }
    };

    const modes = [...root.querySelectorAll('input[name="keymode"]')];
    modes.forEach((m) => m.addEventListener('change', () => show(m)));
    show(modes.find((m) => m.checked) || modes[0]);
})();

/* Entrances: each part of a section arrives on its own, staggered, once.
   Content is visible by default, so nothing is lost if this never runs. */
(function () {
    if (!document.querySelector('.s-page')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const parts = document.querySelectorAll(
        '.s-flow h2, .s-xchg, .s-int-head, .s-int-set, .s-faq h2, .s-q, ' +
        '.s-cta-said, .s-cta-act, .s-page .section-header, .s-page .service-card, ' +
        '.s-page .price-card, .s-page .price-includes');
    if (!parts.length || !('IntersectionObserver' in window)) return;

    parts.forEach((el) => el.classList.add('s-enter'));
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const siblings = [...entry.target.parentElement.children]
                .filter((c) => c.classList.contains('s-enter'));
            const i = Math.max(0, siblings.indexOf(entry.target));
            entry.target.style.transitionDelay = Math.min(i, 5) * 70 + 'ms';
            entry.target.classList.add('s-in');
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -12% 0px' });
    parts.forEach((el) => io.observe(el));
})();

/* The board's tiles arrive in their own time. Visible by default. */
(function () {
    if (!document.querySelector('.b-page')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tiles = document.querySelectorAll(
        '.b-field .b-tile, .b-page .stat-item, .b-page .article-card, ' +
        '.b-page .faq-item, .b-page .section-header, .b-page .contact-card');
    if (!tiles.length || !('IntersectionObserver' in window)) return;
    tiles.forEach((t) => t.classList.add('b-enter'));
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const sibs = [...entry.target.parentElement.children]
                .filter((c) => c.classList.contains('b-enter'));
            entry.target.style.transitionDelay =
                Math.min(Math.max(0, sibs.indexOf(entry.target)), 5) * 60 + 'ms';
            entry.target.classList.add('b-in');
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -10% 0px' });
    tiles.forEach((t) => io.observe(t));
})();

/* Entrances on the service and platform pages. Visible by default. */
(function () {
    if (!document.querySelector('.p-page')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parts = document.querySelectorAll(
        '.p-page .section-header, .p-page .service-card, .p-page .price-card, ' +
        '.p-page .price-includes, .p-page .faq-item, .p-page .prose, ' +
        '.p-page .related-card, .p-page .p-band');
    if (!parts.length || !('IntersectionObserver' in window)) return;
    parts.forEach((el) => el.classList.add('p-enter'));
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const sibs = [...entry.target.parentElement.children]
                .filter((c) => c.classList.contains('p-enter'));
            entry.target.style.transitionDelay =
                Math.min(Math.max(0, sibs.indexOf(entry.target)), 5) * 65 + 'ms';
            entry.target.classList.add('p-in');
            io.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -10% 0px' });
    parts.forEach((el) => io.observe(el));
})();

/* Arriving with a hash from another page.
   The browser's own jump on load is unreliable here: html carries
   scroll-behavior: smooth, and a smooth scroll started while the page is
   still settling gets cancelled, which leaves the visitor at the top after
   clicking "服務項目" from a service page. Do the jump explicitly once the
   page has loaded, offset by the fixed bar, the same way the click handler
   on this page does it. */
(function () {
    const jump = () => {
        const id = location.hash.slice(1);
        if (!id) return;
        let target;
        try { target = document.getElementById(decodeURIComponent(id)); } catch (e) { return; }
        if (!target || window.scrollY > 4) return;   // the visitor already moved
        const bar = document.querySelector('.navbar');
        const offset = bar ? bar.offsetHeight : 0;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'auto' });
    };
    if (document.readyState === 'complete') jump();
    else window.addEventListener('load', jump);

    // Changing only the hash does not reload the page, so the guard above
    // ("the visitor already moved") would refuse a jump they just asked for.
    // A hashchange is an explicit request, so it always moves.
    window.addEventListener('hashchange', () => {
        const id = location.hash.slice(1);
        if (!id) return;
        let target;
        try { target = document.getElementById(decodeURIComponent(id)); } catch (e) { return; }
        if (!target) return;
        const bar = document.querySelector('.navbar');
        window.scrollTo({
            top: target.getBoundingClientRect().top + window.pageYOffset - (bar ? bar.offsetHeight : 0),
            behavior: 'smooth',
        });
    });
})();
