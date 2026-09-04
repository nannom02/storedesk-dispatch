import { ChevronRight, Info, X } from "lucide-react";
import { Fragment, type ReactNode } from "react";

export function PageHead({
  kicker,
  title,
  lead,
  actions,
}: {
  kicker: string;
  title: string;
  lead: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-head">
      <span className="page-kicker" data-density="meta">
        {kicker}
      </span>
      <div className="page-head-row">
        <h1>{title}</h1>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
      <p className="page-lead">{lead}</p>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className ? `panel ${className}` : "panel"}>
      {title ? (
        <div className="panel-head">
          <div className="panel-head-text">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div className="inline">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function PanelRow({
  columns,
  children,
}: {
  columns: "2" | "3" | "7-5" | "5-7";
  children: ReactNode;
}) {
  return (
    <div className="panel-row" data-columns={columns}>
      {children}
    </div>
  );
}

export function StateText({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "bad" | "info" | "neutral";
  children: ReactNode;
}) {
  return (
    <span className="state" data-tone={tone === "neutral" ? undefined : tone}>
      {children}
    </span>
  );
}

export function Badge({
  tone = "neutral",
  attention = false,
  children,
}: {
  tone?: "ok" | "warn" | "info" | "neutral";
  attention?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={attention ? "badge attention" : "badge"}
      data-tone={tone === "neutral" ? undefined : tone}
    >
      {children}
    </span>
  );
}

export function NoticeBar({
  variant = "info",
  icon,
  title,
  children,
  action,
}: {
  variant?: "info" | "review" | "attention";
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`notice notice-${variant}`}>
      <span className="notice-icon" aria-hidden="true">
        {icon ?? <Info size={18} />}
      </span>
      <div className="notice-body">
        <strong className="notice-title">{title}</strong>
        <p>{children}</p>
      </div>
      {action}
    </div>
  );
}

export function Meter({
  label,
  value,
  max,
  valueLabel,
}: {
  label: string;
  value: number;
  max: number;
  valueLabel: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <strong>{valueLabel}</strong>
      </div>
      <div
        className="meter-track"
        role="img"
        aria-label={`${label} ${valueLabel}`}
      >
        <div className="meter-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function DescGrid({
  columns = "2",
  items,
}: {
  columns?: "1" | "2" | "3";
  items: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="desc-grid" data-columns={columns}>
      {items.map((item) => (
        <div key={item.label}>
          <dt data-density="support">{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TableWrap({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="table-wrap">
      <div className="table-scroll">{children}</div>
      {footer ? <div className="table-foot-note">{footer}</div> : null}
    </div>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
  actions,
  size,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  actions: ReactNode;
  size?: "wide";
}) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="dialog"
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="inline" data-justify="between">
          <div className="dialog-head">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="quiet-button" onClick={onClose} aria-label="닫기">
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        {children}
        <div className="dialog-actions">{actions}</div>
      </div>
    </div>
  );
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: { id: string; message: string }[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast">
          <Info size={17} aria-hidden="true" />
          <span>{toast.message}</span>
          <button
            type="button"
            className="quiet-button"
            onClick={() => onDismiss(toast.id)}
            aria-label="알림 닫기"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ChipGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  foot,
  icon,
  onOpen,
  openLabel,
}: {
  label: string;
  value: string;
  unit?: string;
  foot: string;
  icon: ReactNode;
  onOpen?: () => void;
  openLabel?: string;
}) {
  const body = (
    <>
      <div className="kpi-card-head">
        <strong>{label}</strong>
        <span className="kpi-card-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <span className="kpi-value">
        {value}
        {unit ? <small>{unit}</small> : null}
      </span>
      <span className="kpi-foot">
        {foot}
        {onOpen ? <ChevronRight size={15} aria-hidden="true" /> : null}
      </span>
    </>
  );

  if (!onOpen) {
    return <div className="kpi-card">{body}</div>;
  }

  return (
    <button type="button" className="kpi-card" onClick={onOpen} aria-label={openLabel ?? label}>
      {body}
    </button>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

export function StageRail({
  steps,
  currentIndex,
  connected = false,
}: {
  steps: string[];
  currentIndex: number;
  connected?: boolean;
}) {
  return (
    <div className="stage-rail" data-stage-connected={connected ? "true" : undefined}>
      {steps.map((step, index) => (
        <Fragment key={step}>
          <div
            className="stage-node"
            data-stage-state={
              index < currentIndex ? "done" : index === currentIndex ? "current" : "todo"
            }
          >
            <span className="stage-node-index" data-density="support">
              {String(index + 1).padStart(2, "0")}
              {index < currentIndex ? " · 완료" : index === currentIndex ? " · 진행 중" : ""}
            </span>
            <strong>{step}</strong>
          </div>
          {connected && index < steps.length - 1 ? (
            <span className="stage-connector" aria-hidden="true">
              <ChevronRight size={18} strokeWidth={1.8} />
            </span>
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}
