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
