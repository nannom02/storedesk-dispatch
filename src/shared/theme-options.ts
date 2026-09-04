export type PaletteId = "A" | "B" | "C" | "D" | "E";

export interface PaletteOption {
  id: PaletteId;
  label: string;
  keyword: string;
  swatch: string;
}

export const paletteOptions = [
  { id: "A", label: "차콜 + 진청", keyword: "묵직한 전문가", swatch: "#0d47a1" },
  { id: "B", label: "라이트 미네랄", keyword: "글로벌 SaaS", swatch: "#0e7490" },
  { id: "C", label: "모노 블랙", keyword: "프리미엄 모노크롬", swatch: "#1f2937" },
  { id: "D", label: "스페이스 블랙", keyword: "웜 그래파이트", swatch: "#2e2c2e" },
  { id: "E", label: "모스 그린", keyword: "웜톤 포레스트", swatch: "#2f5340" },
] as const satisfies readonly PaletteOption[];

export function isPaletteId(value: string | null): value is PaletteId {
  return paletteOptions.some((option) => option.id === value);
}

export function normalizePalette(value: string | null): PaletteId {
  return isPaletteId(value) ? value : "A";
}
