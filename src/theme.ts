export const VISUAL_PRESET_IDS = ['midnight', 'light', 'nature'] as const;

export type VisualPresetId = (typeof VISUAL_PRESET_IDS)[number];
export type MapPaletteId = VisualPresetId;

export interface VisualPresetDefinition {
  id: VisualPresetId;
  name: string;
  description: string;
  themeColor: string;
}

export const VISUAL_PRESETS: readonly VisualPresetDefinition[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Bone field notes over an ink and blue-black map.',
    themeColor: '#F2EFE7',
  },
  {
    id: 'light',
    name: 'Light',
    description: 'A midnight rail framing a pale topographic map.',
    themeColor: '#11110F',
  },
  {
    id: 'nature',
    name: 'Nature',
    description: 'White field notes with the original green terrain palette.',
    themeColor: '#FFFFFF',
  },
] as const;

export function isVisualPresetId(value: unknown): value is VisualPresetId {
  return (
    typeof value === 'string' &&
    VISUAL_PRESET_IDS.some((presetId) => presetId === value)
  );
}

export function applyVisualPreset(presetId: VisualPresetId) {
  document.documentElement.dataset.visualPreset = presetId;
  document.documentElement.style.colorScheme = 'light';

  const definition = VISUAL_PRESETS.find((preset) => preset.id === presetId);
  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]',
  );

  if (themeColor && definition) {
    themeColor.content = definition.themeColor;
  }
}
