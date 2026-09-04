export function formatWon(value: number): string {
  return `₩${value.toLocaleString("ko-KR")}`;
}

export function parseDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addMonths(value: string, months: number): string {
  const date = parseDate(value);
  const targetDay = date.getUTCDate();
  date.setUTCMonth(date.getUTCMonth() + months);
  if (date.getUTCDate() < targetDay) date.setUTCDate(0);
  return toDateString(date);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function formatDday(days: number): string {
  if (days === 0) return "D-day";
  return days > 0 ? `D-${days}` : `D+${Math.abs(days)}`;
}

export function formatKoreanDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

export const TABLE_PAGE_SIZE_OPTIONS = [5, 10, 20] as const;

export function readStoredTablePageSize(storageKey: string): number {
  if (typeof window === "undefined") return TABLE_PAGE_SIZE_OPTIONS[0];

  try {
    const stored = Number(window.localStorage.getItem(storageKey));
    return TABLE_PAGE_SIZE_OPTIONS.includes(
      stored as (typeof TABLE_PAGE_SIZE_OPTIONS)[number],
    )
      ? stored
      : TABLE_PAGE_SIZE_OPTIONS[0];
  } catch {
    return TABLE_PAGE_SIZE_OPTIONS[0];
  }
}

export function storeTablePageSize(storageKey: string, pageSize: number): void {
  try {
    window.localStorage.setItem(storageKey, String(pageSize));
  } catch {
    // 저장소를 사용할 수 없는 브라우저에서도 현재 화면의 선택은 유지한다.
  }
}

/**
 * 연체료 = 미납 원금 × 연이율 ÷ 365 × (연체일수 − 유예일수).
 * 환경 설정의 값이 바뀌면 연체·정산과 대시보드 미수금이 함께 다시 계산된다.
 */
export function overdueFee(
  principal: number,
  overdueDays: number,
  ratePercent: number,
  graceDays: number,
): number {
  const chargeable = Math.max(0, overdueDays - graceDays);
  return Math.round((principal * (ratePercent / 100) * chargeable) / 365);
}

let sequence = 0;

export function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${String(sequence).padStart(3, "0")}`;
}
