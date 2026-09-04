import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BellRing,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Container,
  CreditCard,
  DatabaseZap,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Workflow,
  X,
} from "lucide-react";

import { ToastStack } from "./components/ui";
import { ThemeGuidanceCallout } from "./shared/ThemeGuidanceCallout";
import { normalizePalette, paletteOptions } from "./shared/theme-options";
import type { PaletteId } from "./shared/theme-options";
import { writeNavigationContext } from "./navigation";
import type { Navigate } from "./navigation";
import { StoreProvider, useStore } from "./store";
import { OPERATOR } from "./data/seed";

import ServiceIntroduction from "./screens/ServiceIntroduction";
import Dashboard from "./screens/Dashboard";
import Customers from "./screens/Customers";
import Contracts from "./screens/Contracts";
import Warehouses from "./screens/Warehouses";
import Movements from "./screens/Movements";
import TransportOperations from "./screens/TransportOperations";
import ScheduleCalendar from "./screens/ScheduleCalendar";
import DepositMatching from "./screens/DepositMatching";
import UnmatchedReview from "./screens/UnmatchedReview";
import Overdue from "./screens/Overdue";
import Billing from "./screens/Billing";
import Documents from "./screens/Documents";
import Notifications from "./screens/Notifications";
import Chatbot from "./screens/Chatbot";
import Migration from "./screens/Migration";
import AuditLog from "./screens/AuditLog";
import SettingsScreen from "./screens/SettingsScreen";
import ProposalOverview from "./screens/ProposalOverview";
import KickoffDecisions from "./screens/KickoffDecisions";
import DeliveryMethod from "./screens/DeliveryMethod";
import ArchitectureDesign from "./screens/ArchitectureDesign";
import PublicAccess from "./screens/PublicAccess";

const PALETTE_STORAGE_KEY = "storedesk:palette";

export interface ScreenDefinition {
  id: string;
  label: string;
  group: string;
  icon: React.ReactNode;
  render: (navigate: Navigate) => React.ReactNode;
  proposalNav?:
    "service" | "overview" | "delivery" | "architecture" | "decisions";
}

export const SCREENS: ScreenDefinition[] = [
  {
    id: "service",
    label: "서비스 소개",
    group: "제안 안내",
    icon: <Workflow size={17} />,
    proposalNav: "service",
    render: (navigate) => <ServiceIntroduction onNavigate={navigate} />,
  },
  {
    id: "dashboard",
    label: "운영 대시보드",
    group: "운영",
    icon: <LayoutDashboard size={17} />,
    render: (navigate) => <Dashboard onNavigate={navigate} />,
  },
  {
    id: "customers",
    label: "고객·상담",
    group: "운영",
    icon: <Users size={17} />,
    render: () => <Customers />,
  },
  {
    id: "contracts",
    label: "계약",
    group: "운영",
    icon: <ClipboardList size={17} />,
    render: (navigate) => <Contracts onNavigate={navigate} />,
  },
  {
    id: "warehouses",
    label: "창고·컨테이너",
    group: "운영",
    icon: <Container size={17} />,
    render: (navigate) => <Warehouses onNavigate={navigate} />,
  },
  {
    id: "movements",
    label: "입출고 관리",
    group: "운영",
    icon: <Truck size={17} />,
    render: (navigate) => <Movements onNavigate={navigate} />,
  },
  {
    id: "transport",
    label: "운송 배정·작업지시",
    group: "운영",
    icon: <Workflow size={17} />,
    render: () => <TransportOperations />,
  },
  {
    id: "schedule",
    label: "입출고 일정 캘린더",
    group: "운영",
    icon: <CalendarDays size={17} />,
    render: () => <ScheduleCalendar />,
  },
  {
    id: "deposits",
    label: "입금 계약 자동 대조",
    group: "정산",
    icon: <Wallet size={17} />,
    render: (navigate) => <DepositMatching onNavigate={navigate} />,
  },
  {
    id: "unmatched",
    label: "미매칭 검토",
    group: "정산",
    icon: <GitCompareArrows size={17} />,
    render: (navigate) => <UnmatchedReview onNavigate={navigate} />,
  },
  {
    id: "overdue",
    label: "연체·정산",
    group: "정산",
    icon: <Boxes size={17} />,
    render: (navigate) => <Overdue onNavigate={navigate} />,
  },
  {
    id: "billing",
    label: "결제·세금계산서",
    group: "정산",
    icon: <CreditCard size={17} />,
    render: () => <Billing />,
  },
  {
    id: "documents",
    label: "계약 안내문·문서 보관",
    group: "고객 소통",
    icon: <FileText size={17} />,
    render: () => <Documents />,
  },
  {
    id: "notifications",
    label: "알림 발송·이력",
    group: "고객 소통",
    icon: <BellRing size={17} />,
    render: () => <Notifications />,
  },
  {
    id: "chatbot",
    label: "챗봇 신청 접수",
    group: "고객 소통",
    icon: <MessageSquareText size={17} />,
    render: () => <Chatbot />,
  },
  {
    id: "migration",
    label: "데이터 이관·검증",
    group: "관리",
    icon: <DatabaseZap size={17} />,
    render: () => <Migration />,
  },
  {
    id: "audit",
    label: "권한·활동 로그",
    group: "관리",
    icon: <ShieldCheck size={17} />,
    render: () => <AuditLog />,
  },
  {
    id: "settings",
    label: "환경 설정",
    group: "관리",
    icon: <Settings2 size={17} />,
    render: (navigate) => <SettingsScreen onNavigate={navigate} />,
  },
  {
    id: "overview",
    label: "전체 화면 구성",
    group: "제안 안내",
    icon: <Workflow size={17} />,
    proposalNav: "overview",
    render: (navigate) => <ProposalOverview onNavigate={navigate} />,
  },
  {
    id: "decisions",
    label: "착수 전 결정사항",
    group: "제안 안내",
    icon: <ClipboardList size={17} />,
    proposalNav: "decisions",
    render: (navigate) => <KickoffDecisions onNavigate={navigate} />,
  },
  {
    id: "delivery",
    label: "개발·검수 방식",
    group: "제안 안내",
    icon: <ShieldCheck size={17} />,
    proposalNav: "delivery",
    render: (navigate) => <DeliveryMethod onNavigate={navigate} />,
  },
  {
    id: "architecture",
    label: "연동·배포 설계",
    group: "제안 안내",
    icon: <DatabaseZap size={17} />,
    proposalNav: "architecture",
    render: () => <ArchitectureDesign />,
  },
];

const GROUP_ORDER = ["제안 안내", "운영", "정산", "고객 소통", "관리"];

function readScreenFromLocation(): string {
  const requested = new URL(window.location.href).searchParams.get("screen");
  return SCREENS.some((screen) => screen.id === requested)
    ? (requested as string)
    : "service";
}

function ThemePicker() {
  const [palette, setPalette] = useState<PaletteId>("A");
  const [open, setOpen] = useState(false);
  const [guidanceVisible, setGuidanceVisible] = useState(true);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPalette(
      normalizePalette(window.localStorage.getItem(PALETTE_STORAGE_KEY)),
    );
  }, []);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    delete document.documentElement.dataset.dark;
  }, [palette]);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function changePalette(next: PaletteId) {
    setPalette(next);
    window.localStorage.setItem(PALETTE_STORAGE_KEY, next);
    setOpen(false);
  }

  const current =
    paletteOptions.find((option) => option.id === palette) ?? paletteOptions[0];

  return (
    <div className="theme-picker" ref={pickerRef}>
      {guidanceVisible ? (
        <div className="theme-guidance-slot">
        <ThemeGuidanceCallout
          onActivate={() => {
            setGuidanceVisible(false);
            setOpen(true);
          }}
        />
        </div>
      ) : null}
      <button
        type="button"
        className="theme-trigger"
        data-theme-trigger
        aria-expanded={open}
        aria-label={`테마 ${current.label} 선택기 열기`}
        onClick={() => {
          setGuidanceVisible(false);
          setOpen((value) => !value);
        }}
      >
        <span className="theme-trigger-label">테마</span>
        <span
          className="theme-swatch"
          style={{ background: current.swatch }}
          aria-hidden="true"
        />
        <span className="theme-trigger-name">{current.label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {/* 메뉴는 닫혀 있어도 DOM 에 남긴다. 렌더링 감사가 닫힌 상태에서 옵션을 찾아
          트리거를 눌러 여는 순서로 테마 반응을 확인하기 때문이다. */}
      <div
        className={open ? "theme-menu" : "theme-menu is-closed"}
        role="group"
        aria-label="테마 선택"
      >
        {paletteOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            data-theme-option={option.id}
            aria-pressed={option.id === palette}
            onClick={() => changePalette(option.id)}
          >
            <span
              className="theme-swatch"
              style={{ background: option.swatch }}
              aria-hidden="true"
            />
            <span className="theme-menu-name">
              {option.id} · {option.label}
            </span>
            <span className="theme-menu-keyword" data-density="support">
              {option.keyword}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Shell() {
  const { state, actions } = useStore();
  const [screenId, setScreenId] = useState<string>("service");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // 같은 메뉴를 다시 눌러도 화면을 새로 붙인다. 열려 있던 모달·패널이 닫혀서
  // 사이드바가 다음 클릭을 계속 받을 수 있다.
  const [screenNonce, setScreenNonce] = useState(0);
  const mainRef = useRef<HTMLElement>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const activeNavRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const initial = readScreenFromLocation();
    setScreenId(initial);
    window.history.replaceState(
      { ...(window.history.state ?? {}), screenId: initial, scrollY: 0 },
      "",
      window.location.href,
    );

    function onPopState(event: PopStateEvent) {
      const nextId =
        (event.state?.screenId as string | undefined) ??
        readScreenFromLocation();
      const valid = SCREENS.some((screen) => screen.id === nextId)
        ? nextId
        : "service";
      setScreenId(valid);
      setMobileNavOpen(false);
      const savedScroll = (event.state?.scrollY as number | undefined) ?? 0;
      window.requestAnimationFrame(() => window.scrollTo(0, savedScroll));
    }

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  const navigate = useCallback(
    (nextId: string, context?: Parameters<Navigate>[1]) => {
      if (!SCREENS.some((screen) => screen.id === nextId)) return;
      setMobileNavOpen(false);
      setScreenNonce((value) => value + 1);

      const url = new URL(window.location.href);
      url.searchParams.set("screen", nextId);
      writeNavigationContext(url, context);
      if (nextId === screenId && url.toString() === window.location.href) return;

      window.history.replaceState(
        { ...(window.history.state ?? {}), screenId, scrollY: window.scrollY },
        "",
        window.location.href,
      );

      window.history.pushState(
        { ...(window.history.state ?? {}), screenId: nextId, scrollY: 0 },
        "",
        url.toString(),
      );

      setScreenId(nextId);
      window.scrollTo(0, 0);
      window.requestAnimationFrame(() =>
        mainRef.current?.focus({ preventScroll: true }),
      );
    },
    [screenId],
  );

  // 좁은 폭에서는 메뉴가 자체 스크롤 영역이 된다. 현재 화면 항목을 그 안으로 끌어와
  // 지금 어디에 있는지 스크롤 없이 보이게 한다. 페이지 전체는 움직이지 않는다.
  useEffect(() => {
    const container = navScrollRef.current;
    const active = activeNavRef.current;
    if (!container || !active) return;
    const top = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    container.scrollTop = Math.max(0, top);
  }, [screenId, mobileNavOpen]);

  const groups = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: SCREENS.filter((screen) => screen.group === group),
      })).filter((entry) => entry.items.length > 0),
    [],
  );

  const active = SCREENS.find((screen) => screen.id === screenId) ?? SCREENS[0];

  return (
    <div className="app-shell">
      <aside className="app-sidebar" data-mobile-open={mobileNavOpen}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">
            <Container size={22} />
          </span>
          <span className="sidebar-brand-text">
            <strong>StoreDesk</strong>
            <span data-density="support">컨테이너 보관 창고 운영 ERP</span>
          </span>
          <button
            type="button"
            className="sidebar-mobile-toggle"
            aria-controls="prototype-navigation"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? "메뉴 닫기" : "메뉴 열기"}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <div className="sidebar-scroll" id="prototype-navigation" ref={navScrollRef}>
          <nav aria-label="업무 화면">
            {groups.map((entry) => (
              <div className="sidebar-group" key={entry.group}>
                <p className="sidebar-group-label" data-density="meta">
                  {entry.group}
                </p>
                {entry.items.map((screen) => (
                  <button
                    key={screen.id}
                    type="button"
                    className="sidebar-link"
                    ref={screen.id === screenId ? activeNavRef : undefined}
                    aria-current={screen.id === screenId ? "page" : undefined}
                    data-proposal-nav={screen.proposalNav}
                    data-service-introduction-nav={
                      screen.proposalNav === "service" ? "service" : undefined
                    }
                    onClick={() => navigate(screen.id)}
                  >
                    {screen.icon}
                    <span>{screen.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-account">
            <span className="sidebar-account-avatar" aria-hidden="true">
              윤
            </span>
            <span className="sidebar-account-text">
              <strong>
                {OPERATOR.name} · {state.role}
              </strong>
              <span data-density="support">{OPERATOR.team} 담당</span>
            </span>
          </div>
          <ThemePicker />
        </div>
      </aside>

      <main className="app-main" ref={mainRef} tabIndex={-1}>
        <div key={`${active.id}-${screenNonce}`}>{active.render(navigate)}</div>
      </main>

      <ToastStack toasts={state.toasts} onDismiss={actions.dismissToast} />
    </div>
  );
}

export default function App() {
  const params = new URL(window.location.href).searchParams;
  const publicMode = params.get("public");
  const publicId = params.get("id") ?? params.get("contract") ?? "SC-2026-0288";
  return (
    <StoreProvider>
      {publicMode ? <PublicAccess mode={publicMode} id={publicId} /> : <Shell />}
    </StoreProvider>
  );
}
