const SKIN_TYPE_LABELS: Record<string, string> = {
  normal: 'Piel normal',
  dry: 'Piel seca',
  oily: 'Piel grasa',
  mixed: 'Piel mixta',
  sensitive: 'Piel sensible'
};

export function formatSkinType(skinType?: string | null): string {
  if (!skinType) return 'Piel no definida';
  return SKIN_TYPE_LABELS[skinType] ?? 'Piel no definida';
}
