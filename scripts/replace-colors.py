import re, sys, os

# Map of hardcoded hex -> var() reference
COLOR_MAP = {
    '#17252d': 'var(--navy)',
    '#233b47': 'var(--navy-2)',
    '#2a4554': 'var(--navy-3)',
    '#302E91': 'var(--blue)',
    '#3d3b9e': 'var(--blue-2)',
    '#9490c9': 'var(--blue-soft)',
    '#25236d': 'var(--blue-hover)',
    '#2a2870': 'var(--blue-dark)',
    '#c8c7de': 'var(--blue-border)',
    '#b0aed6': 'var(--blue-icon)',
    '#f4f6f5': 'var(--paper)',
    '#fdfcf9': 'var(--panel)',
    '#fbfcfc': 'var(--bg-input)',
    '#ededf5': 'var(--bg-hover)',
    '#dbe3e7': 'var(--line)',
    '#e8eeec': 'var(--line-2)',
    '#e2e2e2': 'var(--line-light)',
    '#667477': 'var(--muted)',
    '#87969c': 'var(--muted-2)',
    '#71818a': 'var(--muted-3)',
    '#6b6b6b': 'var(--gray)',
    '#1b2b36': 'var(--ink-2)',
    '#1a5a3a': 'var(--green)',
    '#7fbf97': 'var(--green-soft)',
    '#EA1B23': 'var(--red)',
    '#e09080': 'var(--red-soft)',
    '#7a3028': 'var(--red-dark)',
    '#f9e9e7': 'var(--red-bg)',
    '#fdf0ef': 'var(--red-bg-alt)',
    '#e8d4d4': 'var(--red-border)',
    '#f0d48a': 'var(--warn-soft)',
    '#7a6420': 'var(--warn-dark)',
    '#e2eaed': 'var(--sidebar-text)',
    '#eef3f4': 'var(--sidebar-text-2)',
    '#f0f4f5': 'var(--sidebar-text-3)',
    '#7d7bb5': 'var(--sidebar-toggle)',
    '#1f3744': 'var(--sidebar-hover)',
    '#eac': 'var(--red-soft)',
}

def replace_colors(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    for hex_val, var_val in COLOR_MAP.items():
        # Case insensitive replace
        content = re.sub(re.escape(hex_val), var_val, content, flags=re.IGNORECASE)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Process all svelte and css files
changed = []
for root, dirs, files in os.walk('src'):
    for fname in files:
        if fname.endswith(('.svelte', '.css')):
            fpath = os.path.join(root, fname)
            if replace_colors(fpath):
                changed.append(fpath)

print(f"Updated {len(changed)} files:")
for f in changed:
    print(f"  {f}")
