"""
Comprehensive slugification utility for consistent folder and file naming.
Handles Unicode normalization, emoji removal, and collision detection.
Python equivalent of the TypeScript slugify module.
"""

import re
import unicodedata
from typing import List, Dict, Optional, Literal
from dataclasses import dataclass

CaseStyle = Literal['camel', 'pascal', 'snake', 'kebab']

@dataclass
class SlugifyOptions:
    """Options for slugification"""
    case_style: CaseStyle = 'snake'
    max_length: int = 50
    preserve_numbers: bool = True
    replacement: str = '_'

def remove_emojis(text: str) -> str:
    """Remove emojis and other Unicode symbols from text"""
    # Remove emoji ranges and other symbols
    emoji_pattern = re.compile(
        "["
        "\U0001F600-\U0001F64F"  # emoticons
        "\U0001F300-\U0001F5FF"  # symbols & pictographs
        "\U0001F680-\U0001F6FF"  # transport & map symbols
        "\U0001F1E0-\U0001F1FF"  # flags (iOS)
        "\U00002600-\U000026FF"  # miscellaneous symbols
        "\U00002700-\U000027BF"  # dingbats
        "\U0001F900-\U0001F9FF"  # supplemental symbols
        "\U0001F018-\U0001F270"  # various symbols
        "]+", 
        flags=re.UNICODE
    )
    return emoji_pattern.sub('', text)

def remove_markdown_artifacts(text: str) -> str:
    """Remove markdown fragments and metadata"""
    # Remove markdown code blocks
    text = re.sub(r'```[\s\S]*?```', '', text)
    # Remove inline code
    text = re.sub(r'`([^`]+)`', r'\1', text)
    # Remove markdown links
    text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
    # Remove markdown emphasis
    text = re.sub(r'[*_]{1,2}([^*_]+)[*_]{1,2}', r'\1', text)
    # Remove preview metadata patterns
    text = re.sub(r'Preview generated with \d+ files for', '', text, flags=re.IGNORECASE)
    text = re.sub(r'[✅❌⚠️📁📄🔄]', '', text)
    # Remove extra whitespace and newlines
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def normalize_unicode(text: str) -> str:
    """Normalize Unicode characters to ASCII equivalents"""
    # First normalize to NFD (decomposed form)
    normalized = unicodedata.normalize('NFD', text)
    
    # Remove diacritical marks
    without_diacritics = ''.join(
        char for char in normalized 
        if unicodedata.category(char) != 'Mn'
    )
    
    # Handle specific character replacements
    replacements = {
        'æ': 'ae', 'Æ': 'AE',
        'œ': 'oe', 'Œ': 'OE',
        'ß': 'ss',
        'ð': 'd', 'Ð': 'D',
        'þ': 'th', 'Þ': 'TH',
        'ø': 'o', 'Ø': 'O',
        'ł': 'l', 'Ł': 'L'
    }
    
    result = without_diacritics
    for char, replacement in replacements.items():
        result = result.replace(char, replacement)
    
    return result

def apply_case_style(text: str, case_style: CaseStyle) -> str:
    """Apply case style transformation"""
    if case_style == 'camel':
        # Convert to camelCase
        parts = text.split('_')
        return parts[0].lower() + ''.join(word.capitalize() for word in parts[1:])
    elif case_style == 'pascal':
        # Convert to PascalCase
        return ''.join(word.capitalize() for word in text.split('_'))
    elif case_style == 'kebab':
        # Convert to kebab-case
        return text.lower().replace('_', '-')
    else:  # snake (default)
        return text.lower()

def slugify(input_text: str, options: Optional[SlugifyOptions] = None) -> str:
    """Core slugify function"""
    if not input_text or not isinstance(input_text, str):
        return ''
    
    if options is None:
        options = SlugifyOptions()
    
    result = input_text
    
    # Step 1: Remove emojis and symbols
    result = remove_emojis(result)
    
    # Step 2: Remove markdown artifacts and metadata
    result = remove_markdown_artifacts(result)
    
    # Step 3: Normalize Unicode characters
    result = normalize_unicode(result)
    
    # Step 4: Replace non-alphanumeric characters
    if options.preserve_numbers:
        pattern = r'[^a-zA-Z0-9]'
    else:
        pattern = r'[^a-zA-Z]'
    result = re.sub(pattern, options.replacement, result)
    
    # Step 5: Collapse multiple replacement characters
    collapse_pattern = re.escape(options.replacement) + '+'
    result = re.sub(collapse_pattern, options.replacement, result)
    
    # Step 6: Trim replacement characters from ends
    trim_pattern = f'^\\{options.replacement}+|\\{options.replacement}+$'
    result = re.sub(trim_pattern, '', result)
    
    # Step 7: Apply case style
    result = apply_case_style(result, options.case_style)
    
    # Step 8: Enforce max length
    if len(result) > options.max_length:
        result = result[:options.max_length]
        # Remove any trailing partial words or replacement chars
        result = re.sub(f'\\{options.replacement}+$', '', result)
    
    # Step 9: Ensure result is not empty
    if not result:
        result = 'unnamed_task'
    
    return result

def create_unique_slug(
    input_text: str, 
    existing_slugs: List[str], 
    options: Optional[SlugifyOptions] = None
) -> str:
    """Generate a unique slug by appending a counter if collisions occur"""
    base_slug = slugify(input_text, options)
    
    if base_slug not in existing_slugs:
        return base_slug
    
    # Find next available number
    counter = 1
    unique_slug = f"{base_slug}_{counter}"
    
    while unique_slug in existing_slugs:
        counter += 1
        unique_slug = f"{base_slug}_{counter}"
    
    return unique_slug

def is_valid_slug(slug: str, options: Optional[SlugifyOptions] = None) -> bool:
    """Validate if a string is a proper slug"""
    if not slug or not isinstance(slug, str):
        return False
    
    if options is None:
        options = SlugifyOptions()
    
    # Check length
    if len(slug) > options.max_length:
        return False
    
    # Check character set
    if options.preserve_numbers:
        pattern = r'^[a-zA-Z0-9_-]+$'
    else:
        pattern = r'^[a-zA-Z_-]+$'
    
    if not re.match(pattern, slug):
        return False
    
    # Check for leading/trailing underscores or hyphens
    if re.match(r'^[_-]|[_-]$', slug):
        return False
    
    # Check for multiple consecutive separators
    if re.search(r'[_-]{2,}', slug):
        return False
    
    return True

def log_name_transformation(original: str, sanitized: str) -> None:
    """Log original vs sanitized names for audit"""
    if original != sanitized:
        print(f'[SLUG] "{original}" → "{sanitized}"')

def batch_slugify(
    inputs: List[str], 
    options: Optional[SlugifyOptions] = None
) -> List[Dict[str, any]]:
    """Batch process multiple names and return mapping"""
    existing_slugs = []
    results = []
    
    for input_text in inputs:
        slug = create_unique_slug(input_text, existing_slugs, options)
        existing_slugs.append(slug)
        
        changed = input_text != slug
        if changed:
            log_name_transformation(input_text, slug)
        
        results.append({
            'original': input_text,
            'slug': slug,
            'changed': changed
        })
    
    return results 