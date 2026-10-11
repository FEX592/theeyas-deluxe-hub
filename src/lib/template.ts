export function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderTemplate(
  templateHtml: string,
  variables: Record<string, string | number | undefined | null>
): string {
  let output = templateHtml;
  for (const [key, val] of Object.entries(variables)) {
    const rawVal = val != null ? String(val) : '';
    const safeVal = key.endsWith('_url') ? rawVal : escapeHtml(rawVal);
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    output = output.replace(regex, safeVal);
  }
  return output;
}
