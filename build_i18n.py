import json
import os

BASE_URL = "https://www.kineticlinks.net"

LANGS = [
    {'file': 'zh-tw.json', 'lang_code': 'zh-TW', 'lang_path': '/', 'current_lang_name': '繁體中文'},
    {'file': 'en.json', 'lang_code': 'en', 'lang_path': '/en/', 'current_lang_name': 'English'},
    {'file': 'zh-cn.json', 'lang_code': 'zh-CN', 'lang_path': '/zh-cn/', 'current_lang_name': '简体中文'},
]

# Blog articles, newest first. Each becomes /blog/<slug>/ per language and is
# listed on the blog index. content_key is looked up in the locale JSON.
ARTICLES = [
    {'slug': 'ssl-certificate-validity-200-days', 'content_key': 'article_ssl_validity'},
]

# slug: '' means the language's home page. content_key is looked up in the
# locale JSON and flattened under the "page.*" namespace for service.html.
PAGES = [
    {'template': 'src/index.html', 'slug': '', 'content_key': None},
    {'template': 'src/service.html', 'slug': 'cdn', 'content_key': 'cdn_page'},
    {'template': 'src/service.html', 'slug': 'vps', 'content_key': 'vps_page'},
    {'template': 'src/service.html', 'slug': 'idc', 'content_key': 'idc_page'},
    {'template': 'src/service.html', 'slug': 'cloud', 'content_key': 'cloud_page'},
    {'template': 'src/platform.html', 'slug': 'ssl', 'content_key': 'ssl_page'},
    {'template': 'src/platform.html', 'slug': 'speedtest', 'content_key': 'speedtest_page'},
    {'template': 'src/blog.html', 'slug': 'blog', 'content_key': None},
] + [
    {
        'template': 'src/article.html',
        'slug': f"blog/{article['slug']}",
        'content_key': article['content_key'],
    }
    for article in ARTICLES
]


def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)


def build_article_list(translations, lang_path):
    """Render the blog index cards from ARTICLES, in listed order."""
    cards = []
    for article in ARTICLES:
        content = translations.get(article['content_key'], {})
        url = f"{lang_path}blog/{article['slug']}/"
        cards.append(f"""<a href="{url}" class="article-card">
                    <div class="article-card-meta">
                        <span class="article-card-tag">{content.get('category', '')}</span>
                        <time datetime="{content.get('date', '')}">{content.get('date_display', '')}</time>
                        <span>·</span>
                        <span>{content.get('reading_time', '')}</span>
                    </div>
                    <h2>{content.get('title', '')}</h2>
                    <p>{content.get('excerpt', '')}</p>
                    <span class="card-link">{translations.get('blog', {}).get('read_more', '')} →</span>
                </a>""")
    return '\n                '.join(cards)


def render(template, flat_translations):
    out_html = template
    # Replace longer keys first so e.g. "page.faq.q1" doesn't get clobbered
    # by a shorter key that happens to be a prefix of it.
    for key in sorted(flat_translations, key=len, reverse=True):
        value = str(flat_translations[key])
        out_html = out_html.replace(f"{{{{ {key} }}}}", value)
        out_html = out_html.replace(f"{{{{{key}}}}}", value)
    return out_html


def build():
    templates = {}
    for page in PAGES:
        if page['template'] not in templates:
            with open(page['template'], 'r', encoding='utf-8') as f:
                templates[page['template']] = f.read()

    sitemap_urls = []  # (loc, alternates: {lang_code: href})

    # Collect URLs per page-slug across all languages first so the sitemap
    # can emit hreflang alternates for every URL in one pass.
    page_urls = {page['slug']: {} for page in PAGES}

    for lang in LANGS:
        for page in PAGES:
            slug_path = f"{page['slug']}/" if page['slug'] else ''
            loc = f"{BASE_URL}{lang['lang_path']}{slug_path}"
            page_urls[page['slug']][lang['lang_code']] = loc

    for lang in LANGS:
        with open(f"locales/{lang['file']}", 'r', encoding='utf-8') as f:
            translations = json.load(f)

        base_flat = flatten_dict(translations)
        base_flat['lang_code'] = lang['lang_code']
        base_flat['lang_path'] = lang['lang_path']
        base_flat['current_lang_name'] = lang['current_lang_name']
        base_flat['article_list'] = build_article_list(translations, lang['lang_path'])

        for page in PAGES:
            flat = dict(base_flat)
            slug_path = f"{page['slug']}/" if page['slug'] else ''
            flat['service_slug'] = page['slug']
            flat['service_slug_path'] = slug_path

            if page['content_key']:
                page_content = translations.get(page['content_key'], {})
                flat.update(flatten_dict(page_content, parent_key='page'))

            out_html = render(templates[page['template']], flat)

            out_path = f"{lang['lang_path'].lstrip('/')}{slug_path}index.html"
            out_dir = os.path.dirname(out_path)
            if out_dir:
                os.makedirs(out_dir, exist_ok=True)
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(out_html)

            print(f"Generated {out_path}")

            if page['slug'] == '':
                priority = '1.0'
            elif page['slug'].startswith('blog'):
                priority = '0.7'
            else:
                priority = '0.8'

            alternates = page_urls[page['slug']]
            sitemap_urls.append({
                'loc': alternates[lang['lang_code']],
                'alternates': alternates,
                'priority': priority,
            })

    build_sitemap(sitemap_urls)


def build_sitemap(urls):
    lines = ['<?xml version="1.0" encoding="UTF-8"?>']
    lines.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    lines.append('        xmlns:xhtml="http://www.w3.org/1999/xhtml">')

    for entry in urls:
        lines.append('  <url>')
        lines.append(f"    <loc>{entry['loc']}</loc>")
        for hreflang, href in entry['alternates'].items():
            lines.append(f'    <xhtml:link rel="alternate" hreflang="{hreflang}" href="{href}" />')
        default_href = entry['alternates']['zh-TW']
        lines.append(f'    <xhtml:link rel="alternate" hreflang="x-default" href="{default_href}" />')
        lines.append('    <lastmod>2026-08-15</lastmod>')
        lines.append('    <changefreq>monthly</changefreq>')
        lines.append(f"    <priority>{entry['priority']}</priority>")
        lines.append('  </url>')

    lines.append('</urlset>')

    with open('sitemap.xml', 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')

    print('Generated sitemap.xml')


if __name__ == '__main__':
    build()
