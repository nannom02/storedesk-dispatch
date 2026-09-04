export interface NavigationContext {
  warehouseId?: string;
  containerNo?: string;
  contractId?: string;
}

export type Navigate = (screenId: string, context?: NavigationContext) => void;

export const NAVIGATION_CONTEXT_KEYS = ["warehouse", "container", "contract"] as const;

export function readNavigationContext(): NavigationContext {
  const params = new URL(window.location.href).searchParams;
  return {
    warehouseId: params.get("warehouse") ?? undefined,
    containerNo: params.get("container") ?? undefined,
    contractId: params.get("contract") ?? undefined,
  };
}

export function writeNavigationContext(url: URL, context?: NavigationContext) {
  for (const key of NAVIGATION_CONTEXT_KEYS) url.searchParams.delete(key);
  if (!context) return;
  if (context.warehouseId) url.searchParams.set("warehouse", context.warehouseId);
  if (context.containerNo) url.searchParams.set("container", context.containerNo);
  if (context.contractId) url.searchParams.set("contract", context.contractId);
}
