import os
import re

# Simple mapping of static CSS rules to Tailwind classes
STYLE_MAP = {
    'display: "flex"': 'flex',
    'flexDirection: "column"': 'flex-col',
    'flexDirection: "row"': 'flex-row',
    'alignItems: "center"': 'items-center',
    'alignItems: "flex-start"': 'items-start',
    'justifyContent: "center"': 'justify-center',
    'justifyContent: "space-between"': 'justify-between',
    'justifyContent: "flex-end"': 'justify-end',
    'position: "relative"': 'relative',
    'position: "absolute"': 'absolute',
    'width: "100%"': 'w-full',
    'height: "100%"': 'h-full',
    'overflow: "hidden"': 'overflow-hidden',
    'cursor: "pointer"': 'cursor-pointer',
    'background: "transparent"': 'bg-transparent',
    'border: "none"': 'border-none',
    'fontWeight: 500': 'font-medium',
    'fontWeight: 600': 'font-semibold',
    'fontWeight: 700': 'font-bold',
    'fontWeight: 800': 'font-extrabold',
    'fontWeight: 900': 'font-black',
}

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # We only want to process simple one-line style objects like style={{ display: "flex", gap: 10 }}
    # Complex ones spanning multiple lines or using variables are too risky to regex.
    
    def replacer(match):
        style_str = match.group(1)
        # If it has ternary operators or variables, skip it to prevent breaking
        if '?' in style_str or '$' in style_str or '`' in style_str:
            return match.group(0)
            
        classes = []
        new_styles = []
        
        # Split by comma, but be careful (this is very naive, works for simple objects)
        parts = [p.strip() for p in style_str.split(',') if p.strip()]
        for p in parts:
            # Handle mapping
            matched = False
            for k, v in STYLE_MAP.items():
                if p.replace("'", '"') == k:
                    classes.append(v)
                    matched = True
                    break
            
            # Handle specific numeric mappings
            if not matched:
                if p.startswith('gap:'):
                    try:
                        val = int(re.search(r'\d+', p).group())
                        classes.append(f'gap-[{val}px]')
                        matched = True
                    except: pass
                elif p.startswith('padding:'):
                    try:
                        val = int(re.search(r'\d+', p).group())
                        classes.append(f'p-[{val}px]')
                        matched = True
                    except: pass
                elif p.startswith('borderRadius:'):
                    try:
                        val = int(re.search(r'\d+', p).group())
                        classes.append(f'rounded-[{val}px]')
                        matched = True
                    except: pass
                elif p.startswith('fontSize:'):
                    try:
                        val = int(re.search(r'\d+', p).group())
                        classes.append(f'text-[{val}px]')
                        matched = True
                    except: pass
            
            if not matched:
                new_styles.append(p)
                
        # Now we need to append the classes to className and leave remaining styles in style
        if not classes:
            return match.group(0)
            
        # This regex replacement doesn't natively parse JSX className="...". 
        # It's safer to just return a modified style object and a special data-tailwind prop 
        # and use another pass, but for simplicity we will just reduce the inline styles.
        if new_styles:
            return f'className="{ " ".join(classes) }" style={{{{ {", ".join(new_styles)} }}}}'
        else:
            return f'className="{ " ".join(classes) }"'

    # Regex to find style={{ ... }} on a single line
    new_content = re.sub(r'style=\{\{\s*([^}]+)\s*\}\}', replacer, content)
    
    # Merge adjacent classNames (e.g. className="flex" className="foo" -> className="flex foo")
    # This is also very hacky and could break if className contains variables.
    
    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.tsx', '.jsx')):
            process_file(os.path.join(root, file))

