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
