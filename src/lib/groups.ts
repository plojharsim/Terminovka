// Uložené skupiny uživatele (User.selectedGroupIds) jsou JSON pole; null = ještě nevybíral.
export function parseGroupIds(raw: string | null | undefined): string[] | null {
  if (raw == null) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}
