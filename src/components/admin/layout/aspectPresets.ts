// Presets de proporção compartilhados pelo Admin (banners).
export interface AspectPreset {
  value: string; // ex: "16/5"
  label: string; // ex: "Panorâmico (16/5)"
}

export const HERO_ASPECT_PRESETS_DESKTOP: AspectPreset[] = [
  { value: "16/5", label: "Panorâmico (16/5) — padrão" },
  { value: "16/6", label: "Panorâmico curto (16/6)" },
  { value: "21/9", label: "Cinemático (21/9)" },
  { value: "16/9", label: "Widescreen (16/9)" },
  { value: "3/1", label: "Faixa fina (3/1)" },
  { value: "4/3", label: "Quadrado-ish (4/3)" },
];

export const HERO_ASPECT_PRESETS_MOBILE: AspectPreset[] = [
  { value: "4/5", label: "Retrato (4/5) — padrão" },
  { value: "1/1", label: "Quadrado (1/1)" },
  { value: "3/4", label: "Retrato curto (3/4)" },
  { value: "9/16", label: "Stories (9/16)" },
  { value: "16/9", label: "Widescreen (16/9)" },
];

export const SECONDARY_ASPECT_PRESETS_DESKTOP: AspectPreset[] = [
  { value: "16/5", label: "Panorâmico (16/5) — padrão" },
  { value: "16/6", label: "Panorâmico curto (16/6)" },
  { value: "16/9", label: "Widescreen (16/9)" },
  { value: "3/1", label: "Faixa fina (3/1)" },
  { value: "4/3", label: "Quadrado-ish (4/3)" },
];

export const SECONDARY_ASPECT_PRESETS_MOBILE: AspectPreset[] = [
  { value: "16/6", label: "Panorâmico (16/6) — padrão" },
  { value: "4/3", label: "4/3" },
  { value: "1/1", label: "Quadrado (1/1)" },
  { value: "4/5", label: "Retrato (4/5)" },
];

export const MINI_ASPECT_PRESETS: AspectPreset[] = [
  { value: "16/9", label: "Widescreen (16/9) — padrão" },
  { value: "4/3", label: "4/3" },
  { value: "1/1", label: "Quadrado (1/1)" },
  { value: "3/4", label: "Retrato (3/4)" },
  { value: "4/5", label: "Retrato (4/5)" },
  { value: "16/6", label: "Panorâmico (16/6)" },
  { value: "21/9", label: "Cinemático (21/9)" },
];
