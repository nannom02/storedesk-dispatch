import { Palette } from "lucide-react";

export function ThemeGuidanceCallout({ onActivate }: { onActivate: () => void }) {
  return (
    <button type="button" data-theme-guidance onClick={onActivate}>
      <span data-theme-guidance-icon="palette" aria-hidden="true">
        <Palette size={17} />
      </span>
      <strong>원하는 분위기로 바꿔보세요</strong>
    </button>
  );
}
