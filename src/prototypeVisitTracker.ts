const INTERNAL_QUERY = "__wishket_internal";
const AUTOMATION_QUERY = "__wishket_automation";
const VISITOR_KEY = "wishket:prototype:visitor";
const INTERNAL_REVIEWER_KEY = "wishket:prototype:internal";
const SESSION_RECORDED_KEY = "wishket:prototype:recorded:v2";
const SESSION_ID_KEY = "wishket:prototype:session";
const TRACKING_EXPIRY_KEY_PREFIX = "wishket:prototype:tracking-expires:";
const TRACKING_POLICY_CHECKED_KEY_PREFIX = "wishket:prototype:tracking-policy-checked:";
const TRACKING_POLICY_RECHECK_INTERVAL_MS = 60 * 60 * 1000;
const ACTIVITY_REPORT_INTERVAL_MS = 60 * 60 * 1000;
const SUMMARY_DEDUPLICATION_WINDOW_MS = 5_000;
const HUMAN_CONFIRMATION_DELAY_MS = 8_000;

type PrototypeVisitConfig = {
  dashboardUrl: string;
  jobId: string;
  projectId: string;
  variantId: string;
};

type DeviceType = "desktop" | "tablet" | "mobile";
type ThemeMode = "light" | "dark";
type ThemeSnapshot = {
  id: string | null;
  label: string;
  mode: ThemeMode;
};

type PrototypeActivity = {
  activityType: "action_click" | "mode_change" | "screen_view" | "session_summary" | "theme_change";
  actionLabel?: string;
  theme?: ThemeSnapshot;
  durationSeconds?: number;
  darkModeUsed?: boolean;
  themeUsage?: Array<ThemeSnapshot & { seconds: number }>;
  actionLabels?: string[];
  screenLabels?: string[];
  themeChanges?: ThemeSnapshot[];
};

type PrototypeTrackingPolicy = {
  trackingActive: boolean;
  trackingExpiresAt: string | null;
};

function storageGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string): boolean {
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function storageRemove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // 저장 공간이 차단된 브라우저에서도 프로토타입 화면은 정상 동작해야 한다.
  }
}

function trackingExpiryKey(config: PrototypeVisitConfig): string {
  return `${TRACKING_EXPIRY_KEY_PREFIX}${config.jobId}`;
}

function trackingPolicyCheckedKey(config: PrototypeVisitConfig): string {
  return `${TRACKING_POLICY_CHECKED_KEY_PREFIX}${config.jobId}`;
}

function readTrackingExpiry(config: PrototypeVisitConfig): string | null {
  const value = storageGet(window.localStorage, trackingExpiryKey(config));
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

function saveTrackingExpiry(config: PrototypeVisitConfig, expiresAt: string | null): void {
  if (!expiresAt || !Number.isFinite(Date.parse(expiresAt))) return;
  storageSet(window.localStorage, trackingExpiryKey(config), expiresAt);
}

function readTrackingPolicyCheckedAt(config: PrototypeVisitConfig): number | null {
  const value = storageGet(window.localStorage, trackingPolicyCheckedKey(config));
  if (!value) return null;
  const checkedAt = Number(value);
  return Number.isFinite(checkedAt) ? checkedAt : null;
}

function saveTrackingPolicyCheckedAt(config: PrototypeVisitConfig, checkedAt = Date.now()): void {
  storageSet(window.localStorage, trackingPolicyCheckedKey(config), String(checkedAt));
}

function trackingActive(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return true;
  const expiresAtTime = Date.parse(expiresAt);
  return Number.isFinite(expiresAtTime) && now < expiresAtTime;
}

function shouldCheckTrackingPolicy(
  expiresAt: string | null,
  checkedAt: number | null,
  now = Date.now(),
): boolean {
  if (trackingActive(expiresAt, now)) return true;
  return checkedAt === null || now - checkedAt >= TRACKING_POLICY_RECHECK_INTERVAL_MS;
}

function visitorId(): string {
  const stored = storageGet(window.localStorage, VISITOR_KEY);
  if (stored) return stored;

  const created = window.crypto.randomUUID();
  storageSet(window.localStorage, VISITOR_KEY, created);
  return created;
}

function sessionId(): string {
  const stored = storageGet(window.sessionStorage, SESSION_ID_KEY);
  if (stored) return stored;

  const created = window.crypto.randomUUID();
  storageSet(window.sessionStorage, SESSION_ID_KEY, created);
  return created;
}

function deviceType(): DeviceType {
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1180) return "tablet";
  return "desktop";
}

function referrerHost(): string | null {
  if (!document.referrer) return null;

  try {
    return new URL(document.referrer).hostname || null;
  } catch {
    return null;
  }
}

function compactText(value: string | null | undefined, maxLength = 80): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function currentTheme(): ThemeSnapshot {
  const root = document.documentElement;
  const app = document.querySelector<HTMLElement>(".app, .app-shell");
  const selectedOption = document.querySelector<HTMLElement>(
    '[role="option"][aria-selected="true"], [role="option"][aria-checked="true"]',
  );
  const selectedText = compactText(selectedOption?.textContent);
  const visibleLabel = compactText(
    document.querySelector<HTMLElement>(".theme-current, .theme-name")?.textContent,
  );
  const id = compactText(root.dataset.palette || selectedText.match(/^[A-Z0-9]+/)?.[0] || "", 24) || null;
  const label = visibleLabel || selectedText.replace(/^[A-Z0-9]+\s*[·-]?\s*/, "") || id || "기본 테마";
  const explicitMode = root.dataset.mode;
  const mode: ThemeMode = explicitMode === "dark" || app?.classList.contains("dark")
    ? "dark"
    : "light";

  return { id, label, mode };
}

function browserEnvironment() {
  let timezone: string | null = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    timezone = null;
  }

  return {
    viewportWidth: Math.round(window.innerWidth),
    viewportHeight: Math.round(window.innerHeight),
    screenWidth: Math.round(window.screen.width),
    screenHeight: Math.round(window.screen.height),
    pixelRatio: Math.round(window.devicePixelRatio * 100) / 100,
    language: navigator.language || null,
    timezone,
    touchPoints: Math.max(0, navigator.maxTouchPoints || 0),
    colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
    initialTheme: currentTheme(),
  };
}

function removeTrackingQueries(): void {
  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete(INTERNAL_QUERY);
  cleanUrl.searchParams.delete(AUTOMATION_QUERY);
  window.history.replaceState(
    window.history.state,
    "",
    `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`,
  );
}

function hasAutomationEnvironmentSignal(): boolean {
  return navigator.webdriver === true || /HeadlessChrome|Playwright|Puppeteer|PhantomJS|Selenium/i.test(
    navigator.userAgent,
  );
}

/**
 * 링크 미리보기와 자동 렌더러가 자바스크립트까지 실행해도 고객 열람으로 오인하지
 * 않도록 실제 입력 또는 일정 시간의 가시 상태가 확인된 뒤에만 방문을 기록한다.
 */
function waitForHumanVisitConfirmation(): Promise<boolean> {
  if (hasAutomationEnvironmentSignal()) return Promise.resolve(false);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;
    let timer: number | null = null;

    const cleanup = () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("pointerdown", confirmFromInput, { capture: true });
      document.removeEventListener("keydown", confirmFromInput, { capture: true });
      document.removeEventListener("touchstart", confirmFromInput, { capture: true });
      document.removeEventListener("visibilitychange", confirmFromVisibility);
    };
    const settle = (confirmed: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(confirmed);
    };
    const confirmFromInput = () => settle(true);
    const confirmFromVisibility = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - startedAt >= HUMAN_CONFIRMATION_DELAY_MS
      ) {
        settle(true);
      }
    };

    document.addEventListener("pointerdown", confirmFromInput, { capture: true });
    document.addEventListener("keydown", confirmFromInput, { capture: true });
    document.addEventListener("touchstart", confirmFromInput, { capture: true });
    document.addEventListener("visibilitychange", confirmFromVisibility);
    timer = window.setTimeout(() => {
      if (document.visibilityState === "visible") settle(true);
    }, HUMAN_CONFIRMATION_DELAY_MS);
  });
}

async function loadPrototypeVisitConfig(): Promise<PrototypeVisitConfig | null> {
  try {
    const response = await fetch("/prototype-visit.json", { cache: "no-store" });
    if (!response.ok) return null;

    const value = (await response.json()) as Partial<PrototypeVisitConfig>;
    if (!value.dashboardUrl || !value.jobId || !value.projectId || !value.variantId) return null;

    const dashboard = new URL(value.dashboardUrl);
    if (dashboard.protocol !== "https:") return null;

    return {
      dashboardUrl: dashboard.origin,
      jobId: value.jobId,
      projectId: value.projectId,
      variantId: value.variantId,
    };
  } catch {
    return null;
  }
}

async function markInternalReviewer(
  config: PrototypeVisitConfig,
  token: string,
  id: string,
): Promise<void> {
  const response = await fetch(`${config.dashboardUrl}/api/prototype-visits/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, visitorId: id }),
  });

  if (response.ok) {
    storageSet(window.localStorage, INTERNAL_REVIEWER_KEY, "true");
    storageRemove(window.sessionStorage, SESSION_RECORDED_KEY);
  }
}

async function recordExternalVisit(
  config: PrototypeVisitConfig,
  id: string,
  currentSessionId: string,
): Promise<PrototypeTrackingPolicy | null> {
  const stored = storageSet(window.sessionStorage, SESSION_RECORDED_KEY, "true");

  try {
    const response = await fetch(`${config.dashboardUrl}/api/prototype-visits`, {
      method: "POST",
      // text/plain은 CORS 단순 요청이므로 매 방문마다 OPTIONS 함수를 추가 실행하지 않는다.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        jobId: config.jobId,
        projectId: config.projectId,
        variantId: config.variantId,
        visitorId: id,
        sessionId: currentSessionId,
        deviceType: deviceType(),
        referrerHost: referrerHost(),
        ...browserEnvironment(),
      }),
      keepalive: true,
    });

    if (!response.ok) {
      if (stored) storageRemove(window.sessionStorage, SESSION_RECORDED_KEY);
      return null;
    }

    const payload = (await response.json().catch(() => null)) as Partial<PrototypeTrackingPolicy> | null;
    saveTrackingPolicyCheckedAt(config);
    if (payload?.trackingExpiresAt) saveTrackingExpiry(config, payload.trackingExpiresAt);

    if (payload?.trackingActive === false && stored) {
      storageRemove(window.sessionStorage, SESSION_RECORDED_KEY);
    }

    return {
      trackingActive: payload?.trackingActive !== false,
      trackingExpiresAt: payload?.trackingExpiresAt ?? null,
    };
  } catch {
    if (stored) storageRemove(window.sessionStorage, SESSION_RECORDED_KEY);
    return null;
  }
}

async function recordActivity(
  config: PrototypeVisitConfig,
  id: string,
  currentSessionId: string,
  activity: PrototypeActivity,
): Promise<void> {
  try {
    await fetch(`${config.dashboardUrl}/api/prototype-visits/activity`, {
      method: "POST",
      // 활동 요약도 CORS 사전 요청 없이 한 번의 함수 호출로 보낸다.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify({
        jobId: config.jobId,
        projectId: config.projectId,
        variantId: config.variantId,
        visitorId: id,
        sessionId: currentSessionId,
        ...activity,
      }),
      keepalive: true,
    });
  } catch {
    // 활동 기록 실패가 고객 화면을 막아서는 안 된다.
  }
}

function setupActivityTracking(
  config: PrototypeVisitConfig,
  id: string,
  currentSessionId: string,
  expiresAt: string | null,
): void {
  const sessionStartedAt = Date.now();
  const usage = new Map<string, { theme: ThemeSnapshot; milliseconds: number }>();
  const pendingActions: string[] = [];
  const pendingScreens: string[] = [];
  const pendingThemeChanges: ThemeSnapshot[] = [];
  let activeTheme = currentTheme();
  let activeThemeStartedAt = sessionStartedAt;
  let darkModeUsed = activeTheme.mode === "dark";
  let lastSummarySentAt = sessionStartedAt;
  let summaryRequestRunning = false;
  let stopped = false;
  let expiryTimer: number | null = null;

  const themeKey = (theme: ThemeSnapshot) => `${theme.id ?? "none"}:${theme.label}:${theme.mode}`;
  const sameTheme = (left: ThemeSnapshot, right: ThemeSnapshot) => themeKey(left) === themeKey(right);

  function addThemeDuration(theme: ThemeSnapshot, milliseconds: number) {
    const key = themeKey(theme);
    const previous = usage.get(key);
    usage.set(key, {
      theme,
      milliseconds: (previous?.milliseconds ?? 0) + Math.max(0, milliseconds),
    });
  }

  function themeUsage(now: number) {
    const snapshot = new Map(usage);
    const key = themeKey(activeTheme);
    const previous = snapshot.get(key);
    snapshot.set(key, {
      theme: activeTheme,
      milliseconds: (previous?.milliseconds ?? 0) + Math.max(0, now - activeThemeStartedAt),
    });

    return [...snapshot.values()]
      .map((entry) => ({ ...entry.theme, seconds: Math.round(entry.milliseconds / 1000) }))
      .sort((left, right) => right.seconds - left.seconds);
  }

  function pushLimited(values: string[], value: string, limit = 100) {
    if (values.length < limit) values.push(value);
  }

  function captureTheme() {
    window.setTimeout(() => {
      if (stopped) return;
      const nextTheme = currentTheme();
      if (sameTheme(activeTheme, nextTheme)) return;

      const now = Date.now();
      addThemeDuration(activeTheme, now - activeThemeStartedAt);
      activeTheme = nextTheme;
      activeThemeStartedAt = now;
      darkModeUsed ||= nextTheme.mode === "dark";
      if (pendingThemeChanges.length < 32) pendingThemeChanges.push(nextTheme);
    }, 0);
  }

  function sendSummary(force = false) {
    const now = Date.now();
    if (stopped || !trackingActive(expiresAt, now) || summaryRequestRunning) return;
    if (!force && now - lastSummarySentAt < ACTIVITY_REPORT_INTERVAL_MS) return;

    const hasPendingEvents = pendingActions.length || pendingScreens.length || pendingThemeChanges.length;
    if (force && !hasPendingEvents && now - lastSummarySentAt < SUMMARY_DEDUPLICATION_WINDOW_MS) return;

    const actionLabels = pendingActions.splice(0);
    const screenLabels = pendingScreens.splice(0);
    const themeChanges = pendingThemeChanges.splice(0);
    lastSummarySentAt = now;
    summaryRequestRunning = true;

    void recordActivity(config, id, currentSessionId, {
      activityType: "session_summary",
      durationSeconds: Math.round((now - sessionStartedAt) / 1000),
      darkModeUsed,
      theme: activeTheme,
      themeUsage: themeUsage(now),
      actionLabels,
      screenLabels,
      themeChanges,
    }).finally(() => {
      summaryRequestRunning = false;
    });
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>('button, a, [role="button"], [role="tab"], [role="option"]')
      : null;
    if (!target) return;

    const label = compactText(target.getAttribute("aria-label") || target.textContent);
    const isThemeOption = target.getAttribute("role") === "option" && Boolean(target.closest('[aria-label*="테마"]'));
    const isModeToggle = target.classList.contains("mode-toggle") || /어두운 화면|밝은 화면/.test(label);
    const isThemeTrigger = target.classList.contains("theme-trigger") || /테마 선택/.test(label);

    if (isThemeOption) {
      captureTheme();
      return;
    }
    if (isModeToggle) {
      captureTheme();
      return;
    }
    if (isThemeTrigger || !label) return;

    const activityType = target.closest("nav") ? "screen_view" : "action_click";
    pushLimited(activityType === "screen_view" ? pendingScreens : pendingActions, label);
  };

  const onPageHide = () => sendSummary(true);
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      sendSummary(true);
      return;
    }
    sendSummary(false);
  };
  const summaryTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") sendSummary(false);
  }, ACTIVITY_REPORT_INTERVAL_MS);

  function stopTracking() {
    if (stopped) return;
    stopped = true;
    window.clearInterval(summaryTimer);
    if (expiryTimer !== null) window.clearTimeout(expiryTimer);
    document.removeEventListener("click", onClick, { capture: true });
    window.removeEventListener("pagehide", onPageHide);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  }

  if (expiresAt) {
    const remaining = Date.parse(expiresAt) - Date.now();
    if (remaining <= 0) {
      stopTracking();
      return;
    }
    expiryTimer = window.setTimeout(stopTracking, remaining);
  }

  document.addEventListener("click", onClick, { capture: true });
  window.addEventListener("pagehide", onPageHide);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

/**
 * 운영 대시보드·AI 자동화에서 연 브라우저는 내부 검수자로 제외한다. 그 밖의
 * 운영 주소 방문도 실제 입력 또는 가시 체류가 확인된 뒤 탭 세션당 한 번만
 * 기록한다. 추적 실패가 고객 화면을 막아서는 안 되므로 호출부는 이 Promise를
 * 기다리지 않는다.
 */
export async function registerPrototypeVisit(): Promise<void> {
  if (["localhost", "127.0.0.1"].includes(window.location.hostname)) return;

  const url = new URL(window.location.href);
  const internalToken = url.searchParams.get(INTERNAL_QUERY);
  const automationVisit = url.searchParams.get(AUTOMATION_QUERY) === "1";
  if (internalToken || automationVisit) removeTrackingQueries();

  if (automationVisit || hasAutomationEnvironmentSignal()) {
    storageSet(window.localStorage, INTERNAL_REVIEWER_KEY, "true");
    storageRemove(window.sessionStorage, SESSION_RECORDED_KEY);
    return;
  }

  const config = await loadPrototypeVisitConfig();
  if (!config) return;

  const id = visitorId();
  if (internalToken) {
    try {
      await markInternalReviewer(config, internalToken, id);
    } catch {
      // 내부 토큰 판정 실패를 외부 방문으로 오인하거나 고객 화면에 노출하지 않는다.
    }
    return;
  }

  if (storageGet(window.localStorage, INTERNAL_REVIEWER_KEY) === "true") return;
  const cachedExpiry = readTrackingExpiry(config);
  const policyCheckedAt = readTrackingPolicyCheckedAt(config);
  if (!shouldCheckTrackingPolicy(cachedExpiry, policyCheckedAt)) return;

  const currentSessionId = sessionId();
  const sessionRecorded = storageGet(window.sessionStorage, SESSION_RECORDED_KEY) === "true";
  if (sessionRecorded && trackingActive(cachedExpiry)) {
    setupActivityTracking(config, id, currentSessionId, cachedExpiry);
    return;
  }
  if (sessionRecorded) storageRemove(window.sessionStorage, SESSION_RECORDED_KEY);

  const humanConfirmed = await waitForHumanVisitConfirmation();
  if (!humanConfirmed) return;

  const policy = await recordExternalVisit(config, id, currentSessionId);
  if (!policy?.trackingActive) return;

  const expiresAt = policy.trackingExpiresAt ?? cachedExpiry;
  if (!trackingActive(expiresAt)) return;
  setupActivityTracking(config, id, currentSessionId, expiresAt);
}
