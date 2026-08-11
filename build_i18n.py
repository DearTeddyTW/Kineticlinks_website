import json
import os

def flatten_dict(d, parent_key='', sep='.'):
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def build():
    with open('src/index.html', 'r', encoding='utf-8') as f:
        template = f.read()

    configs = [
        {'file': 'zh-tw.json', 'out': 'index.html', 'lang_code': 'zh-TW', 'lang_path': '/', 'current_lang_name': '繁體中文'},
        {'file': 'en.json', 'out': 'en/index.html', 'lang_code': 'en', 'lang_path': '/en/', 'current_lang_name': 'English'},
        {'file': 'zh-cn.json', 'out': 'zh-cn/index.html', 'lang_code': 'zh-CN', 'lang_path': '/zh-cn/', 'current_lang_name': '简体中文'}
    ]

    for config in configs:
        with open(f"locales/{config['file']}", 'r', encoding='utf-8') as f:
            translations = json.load(f)
        
        flat_translations = flatten_dict(translations)
        
        # Add special variables
        flat_translations['lang_code'] = config['lang_code']
        flat_translations['lang_path'] = config['lang_path']
        flat_translations['current_lang_name'] = config['current_lang_name']

        out_html = template
        for key, value in flat_translations.items():
            # Replace both {{ key }} and {{key}}
            out_html = out_html.replace(f"{{{{ {key} }}}}", str(value))
            out_html = out_html.replace(f"{{{{{key}}}}}", str(value))

        out_dir = os.path.dirname(config['out'])
        if out_dir:
            os.makedirs(out_dir, exist_ok=True)
            
        with open(config['out'], 'w', encoding='utf-8') as f:
            f.write(out_html)
        
        print(f"Generated {config['out']}")

if __name__ == '__main__':
    build()
