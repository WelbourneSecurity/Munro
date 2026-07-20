import { VISUAL_PRESET_IDS, applyVisualPreset, isVisualPresetId } from './theme';

describe('visual presets', () => {
  it('guards the complete curated preset set', () => {
    expect(VISUAL_PRESET_IDS).toEqual(['midnight', 'light', 'nature']);
    expect(isVisualPresetId('nature')).toBe(true);
    expect(isVisualPresetId('system')).toBe(false);
  });

  it('applies the root contract and theme metadata', () => {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.append(meta);

    applyVisualPreset('nature');

    expect(document.documentElement.dataset.visualPreset).toBe('nature');
    expect(document.documentElement.style.colorScheme).toBe('light');
    expect(meta.content).toBe('#FFFFFF');
    meta.remove();
  });
});
