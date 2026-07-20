import { VISUAL_PRESETS, type VisualPresetId } from '../theme';

interface AppearanceSelectorProps {
  value: VisualPresetId;
  onChange: (preset: VisualPresetId) => void;
}

export function AppearanceSelector({ value, onChange }: AppearanceSelectorProps) {
  return (
    <fieldset className="mt-5">
      <legend className="sr-only">Visual mode</legend>
      <div className="border-hairline grid border-y md:grid-cols-3">
        {VISUAL_PRESETS.map((preset) => (
          <label
            key={preset.id}
            className={`appearance-option focus-within:outline-ink relative cursor-pointer border-b p-4 transition-colors focus-within:z-10 focus-within:outline focus-within:outline-2 focus-within:-outline-offset-2 md:border-r md:border-b-0 md:last:border-r-0 ${
              value === preset.id ? 'appearance-option-active' : ''
            }`}
          >
            <input
              checked={value === preset.id}
              className="sr-only"
              name="visual-mode"
              type="radio"
              value={preset.id}
              onChange={() => {
                onChange(preset.id);
              }}
            />
            <span className={`appearance-swatch appearance-swatch-${preset.id}`}>
              <span aria-hidden="true" />
            </span>
            <span className="mt-4 block text-sm font-semibold">{preset.name}</span>
            <span className="text-muted mt-1 block text-xs leading-5">
              {preset.description}
            </span>
            <span className="font-label mt-4 block text-[0.58rem]">
              {value === preset.id ? 'SELECTED' : 'SELECT'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
