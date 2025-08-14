interface SlugifyOptions {
  caseStyle?: 'snake' | 'kebab';
  maxLength?: number;
  preserveNumbers?: boolean;
}

export function slugify(text: string, options: SlugifyOptions = {}): string {
  const { caseStyle = 'kebab', maxLength, preserveNumbers = false } = options;

  let slug = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-");

  if (!preserveNumbers) {
    slug = slug.replace(/[0-9]/g, "");
  }

  slug = slug.replace(/[^\w-]+/g, "");

  if (caseStyle === 'snake') {
    slug = slug.replace(/-/g, "_");
  }

  if (maxLength) {
    slug = slug.substring(0, maxLength);
  }

  return slug;
} 