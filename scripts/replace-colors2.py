import re, os

# Every hardcoded hex that should become a var()
# Keys are lowercase, values are the CSS variable name
COLOR_MAP = {
    '#17252d': 'var(--navy)',
    '#233b47': 'var(--navy-2)',
    '#2a4554': 'var(--navy-3)',
    '#302e91': 'var(--blue)',
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
    '#ea1b23': 'var(--red)',
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
    # Additional colors found in components
    '#0f4658': 'var(--navy-3)',
    '#29465a': 'var(--sidebar-hover)',
    '#eef3f5': 'var(--bg-hover)',
    '#a84f42': 'var(--red)',
    '#d47c6c': 'var(--red-soft)',
    '#f5c2c2': 'var(--red-border)',
    '#fde8e8': 'var(--red-bg)',
    '#47646b': 'var(--muted-2)',
    '#1f2a2e': 'var(--ink)',
    '#64747a': 'var(--muted-3)',
    '#4a656f': 'var(--muted-2)',
    '#a5b4b9': 'var(--muted-3)',
    '#b8c4c8': 'var(--muted-3)',
    '#c4cdd0': 'var(--muted-3)',
    '#cbd9dd': 'var(--muted)',
    '#dee8eb': 'var(--line)',
    '#d9e2df': 'var(--line)',
    '#e6edeb': 'var(--line)',
    '#edf1ef': 'var(--line-2)',
    '#f0f3f3': 'var(--bg-hover)',
    '#f4f8f8': 'var(--bg-hover)',
    '#cbd8d1': 'var(--line)',
    '#f7f9fa': 'var(--bg-input)',
    '#f5f7f8': 'var(--bg-input)',
    '#dce2dc': 'var(--line-light)',
    '#e2e8ec': 'var(--line)',
    '#3b525c': 'var(--muted)',
    '#a8b5ba': 'var(--muted-3)',
    '#f5e0dd': 'var(--red-bg)',
    '#3d2a2a': 'var(--red-dark)',
    '#f5c2c2': 'var(--red-border)',
    '#fde8e8': 'var(--red-bg)',
}

def replace_in_file(filepath):
    # Skip layout.css :root block — we don't touch it
    if filepath.endswith('layout.css'):
        return False

    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    for hex_val, var_val in COLOR_MAP.items():
        content = re.sub(re.escape(hex_val), var_val, content, flags=re.IGNORECASE)

    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

changed = []
for root, dirs, files in os.walk('src'):
    for fname in files:
        if fname.endswith(('.svelte', '.css')) and not fname.endswith('layout.css'):
            fpath = os.path.join(root, fname)
            if replace_in_file(fpath):
                changed.append(fpath)

print(f"Updated {len(changed)} files:")
for f in changed:
    print(f"  {f}")
