import { HILL_LISTS, isHillListId } from '../data/lists';
import { usePreferencesStore } from '../store';

/**
 * Restrained hill-list selector. Renders nothing while only one list is
 * registered; new registry entries surface here without code changes.
 */
export function HillListSwitcher() {
  const activeListId = usePreferencesStore((state) => state.activeListId);
  const setActiveListId = usePreferencesStore((state) => state.setActiveListId);

  if (HILL_LISTS.length < 2) {
    return null;
  }

  return (
    <label className="border-line text-secondary flex min-h-11 items-center justify-between gap-4 border px-3 py-2 text-sm">
      <span>Hill list</span>
      <select
        className="border-line bg-surface text-secondary min-h-9 border px-2 text-sm"
        value={activeListId}
        onChange={(event) => {
          const nextId = event.currentTarget.value;

          if (isHillListId(nextId)) {
            setActiveListId(nextId);
          }
        }}
      >
        {HILL_LISTS.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}
