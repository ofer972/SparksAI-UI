#!/usr/bin/env python3
"""
Migration script to replace hardcoded Tailwind color classes with semantic classes.
This will make all components theme-aware.
"""

import re
import os
from pathlib import Path

# Define replacement patterns - order matters!
REPLACEMENTS = [
    # Background colors - surfaces
    (r'\bbg-white\b', 'bg-surface'),
    (r'\bbg-gray-50\b', 'bg-surface-elevated'),
    (r'\bbg-gray-100\b', 'bg-surface-secondary'),
    (r'\bbg-slate-50\b', 'bg-surface-elevated'),
    (r'\bbg-slate-100\b', 'bg-surface-secondary'),
    
    # Text colors - content
    (r'\btext-gray-900\b', 'text-content-primary'),
    (r'\btext-gray-800\b', 'text-content-primary'),
    (r'\btext-gray-700\b', 'text-content-secondary'),
    (r'\btext-gray-600\b', 'text-content-secondary'),
    (r'\btext-gray-500\b', 'text-content-tertiary'),
    (r'\btext-gray-400\b', 'text-content-muted'),
    (r'\btext-slate-900\b', 'text-content-primary'),
    (r'\btext-slate-800\b', 'text-content-primary'),
    (r'\btext-slate-700\b', 'text-content-secondary'),
    (r'\btext-slate-600\b', 'text-content-secondary'),
    (r'\btext-slate-500\b', 'text-content-tertiary'),
    (r'\btext-slate-400\b', 'text-content-muted'),
    
    # Border colors - outline
    (r'\bborder-gray-200\b', 'border-outline'),
    (r'\bborder-gray-300\b', 'border-outline'),
    (r'\bborder-gray-400\b', 'border-outline-strong'),
    (r'\bborder-slate-200\b', 'border-outline'),
    (r'\bborder-slate-300\b', 'border-outline'),
    
    # Hover states for backgrounds
    (r'\bhover:bg-gray-50\b', 'hover:bg-surface-elevated'),
    (r'\bhover:bg-gray-100\b', 'hover:bg-surface-secondary'),
    (r'\bhover:bg-slate-50\b', 'hover:bg-surface-elevated'),
    (r'\bhover:bg-slate-100\b', 'hover:bg-surface-secondary'),
    
    # Primary/brand colors (blue, indigo)
    (r'\bbg-blue-600\b', 'bg-brand'),
    (r'\bbg-blue-500\b', 'bg-brand'),
    (r'\bbg-indigo-600\b', 'bg-brand'),
    (r'\bbg-indigo-500\b', 'bg-brand'),
    (r'\btext-blue-600\b', 'text-brand'),
    (r'\btext-blue-500\b', 'text-brand'),
    (r'\btext-indigo-600\b', 'text-brand'),
    (r'\bhover:bg-blue-700\b', 'hover:bg-brand-hover'),
    (r'\bhover:bg-indigo-700\b', 'hover:bg-brand-hover'),
    
    # Ring colors for focus states
    (r'\bring-blue-500\b', 'ring-brand'),
    (r'\bring-indigo-500\b', 'ring-brand'),
    (r'\bfocus:ring-blue-500\b', 'focus:ring-brand'),
    (r'\bfocus:ring-indigo-500\b', 'focus:ring-brand'),
]

def migrate_file(file_path):
    """Migrate a single file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes_made = 0
        
        for pattern, replacement in REPLACEMENTS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                changes_made += len(re.findall(pattern, content))
                content = new_content
        
        if content != original_content:
            # Create backup
            backup_path = f"{file_path}.bak"
            if not os.path.exists(backup_path):
                with open(backup_path, 'w', encoding='utf-8') as f:
                    f.write(original_content)
            
            # Write updated content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"✓ {file_path}: {changes_made} replacements")
            return changes_made
        
        return 0
    
    except Exception as e:
        print(f"✗ Error processing {file_path}: {e}")
        return 0

def main():
    """Main migration function."""
    base_dir = Path(__file__).parent
    
    # Find all .tsx and .jsx files
    patterns = ['**/*.tsx', '**/*.jsx']
    files_to_process = []
    
    for pattern in patterns:
        for directory in ['components', 'app', 'contexts']:
            dir_path = base_dir / directory
            if dir_path.exists():
                files_to_process.extend(dir_path.rglob(pattern))
    
    # Filter out backup files
    files_to_process = [f for f in files_to_process if not str(f).endswith('.bak')]
    
    print(f"Found {len(files_to_process)} files to process")
    print("Starting base color migration...\n")
    
    total_changes = 0
    files_modified = 0
    
    for file_path in sorted(files_to_process):
        changes = migrate_file(file_path)
        if changes > 0:
            total_changes += changes
            files_modified += 1
    
    print(f"\n{'='*60}")
    print(f"Migration complete!")
    print(f"Files modified: {files_modified}/{len(files_to_process)}")
    print(f"Total replacements: {total_changes}")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
