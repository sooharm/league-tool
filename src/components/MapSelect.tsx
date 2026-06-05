import { FORM_SELECT_CLASS } from "@/lib/form-styles";
import { MAP_OPTIONS } from "@/lib/maps";

export function MapSelect({
  value,
  onChange,
  className = `w-full ${FORM_SELECT_CLASS}`,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const legacyOption =
    value && !(MAP_OPTIONS as readonly string[]).includes(value) ? value : null;

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={className}>
      <option value="">맵 선택</option>
      {legacyOption ? (
        <option value={legacyOption}>{legacyOption} (기존)</option>
      ) : null}
      {MAP_OPTIONS.map((map) => (
        <option key={map} value={map}>
          {map}
        </option>
      ))}
    </select>
  );
}
