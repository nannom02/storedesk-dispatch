import {
  ArrowRight,
  BellRing,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Cloud,
  Code2,
  Database,
  ExternalLink,
  FileArchive,
  FileSearch,
  KeyRound,
  ListChecks,
  MonitorCheck,
  Rocket,
  ServerCog,
  ShieldCheck,
  Smartphone,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export const PROPOSAL_EXPLANATION_NAV = [
  { id: "service", label: "서비스 소개" },
  { id: "overview", label: "전체 화면 구성" },
  { id: "delivery", label: "개발·검수 방식" },
  { id: "architecture", label: "연동·배포 설계" },
] as const;

export const CONDITIONAL_DECISION_NAV = {
  id: "decisions",
  label: "착수 전 결정사항",
} as const;

export type ProposalExplanationScreenId =
  | (typeof PROPOSAL_EXPLANATION_NAV)[number]["id"]
  | typeof CONDITIONAL_DECISION_NAV.id;

export function getProposalExplanationNav(includeKickoffDecisions = false) {
  return includeKickoffDecisions
    ? [
        PROPOSAL_EXPLANATION_NAV[0],
        PROPOSAL_EXPLANATION_NAV[1],
        CONDITIONAL_DECISION_NAV,
        PROPOSAL_EXPLANATION_NAV[2],
        PROPOSAL_EXPLANATION_NAV[3],
      ]
    : [...PROPOSAL_EXPLANATION_NAV];
}

export interface ProposalScreenLink {
  id: string;
  title: string;
  detail: string;
  icon?: ReactNode;
}

export interface ProposalWorkflowStep extends ProposalScreenLink {
  screenId: string;
}

export interface ProposalRoleGroup {
  id: string;
  title: string;
  responsibility: string;
  description: string;
  environments: string[];
  sections: {
    title: string;
    screens: (ProposalScreenLink & { screenId: string })[];
  }[];
}

export interface DeliveryStage {
  id: string;
  index: string;
  title: string;
  summary: string;
  owner: string;
  deliverable: string;
  clientCheck: string;
  exitEvidence: string;
  gate?: boolean;
}

export interface DeliverySupportContext {
  eyebrow: string;
  title: string;
  description: string;
  participants: string;
  schedule: string;
  overviewActionLabel?: string;
}

export const MSOFTECH_DELIVERY_STAGES: readonly DeliveryStage[] = [
  {
    id: "posting-analysis",
    index: "01",
    title: "공고 분석",
    summary: "제안 프로토타입",
    owner: "엠소프텍",
    deliverable: "공고 요구사항 대응표와 지금 보고 계신 1차 프로토타입",
    clientCheck: "발주사는 제안 방향과 업무 흐름이 요구사항에 맞는지 계약 전에 확인합니다.",
    exitEvidence: "제안 범위와 우선순위 확인",
  },
  {
    id: "kickoff-discovery",
    index: "02",
    title: "착수 분석",
    summary: "인터뷰·실제 서식 확인",
    owner: "엠소프텍·발주사",
    deliverable: "담당자 인터뷰 결과와 현재 사용 중인 실제 서식·업무 규칙 분석표",
    clientCheck: "말로 전달하기 어려운 규칙을 실제 자료와 업무 사례를 놓고 함께 확인합니다.",
    exitEvidence: "실제 자료와 예외 규칙 확인",
  },
  {
    id: "second-prototype",
    index: "03",
    title: "2차 프로토타입",
    summary: "실제 업무 기준 재설계",
    owner: "엠소프텍",
    deliverable: "계약 후 확인된 항목·권한·문서 양식을 반영한 작동형 프로토타입",
    clientCheck: "역할별 화면을 직접 눌러 보며 누락과 오해를 본 개발 전에 찾습니다.",
    exitEvidence: "역할별 시나리오와 산출물 확인",
  },
  {
    id: "final-confirmation",
    index: "04",
    title: "최종 확인",
    summary: "본 개발 착수 승인",
    owner: "발주사",
    deliverable: "확정 화면, 입력 항목, 처리 규칙, 최종 산출물과 개발 범위 기준선",
    clientCheck: "발주사가 최종 확인한 뒤에만 본 개발로 넘어갑니다. 이 단계가 핵심 기준점입니다.",
    exitEvidence: "본 개발 착수 승인",
    gate: true,
  },
  {
    id: "implementation",
    index: "05",
    title: "본 개발",
    summary: "상시 확인 주소 제공",
    owner: "엠소프텍",
    deliverable: "로그인 가능한 개발 주소, 변경 내역과 요청 시 화면 시연",
    clientCheck: "발주사는 개발 주소에서 수시로 확인하고 협업 채널에서 빠르게 의견을 전달합니다.",
    exitEvidence: "핵심 업무와 예외 시나리오 검증",
  },
  {
    id: "pilot-stabilization",
    index: "06",
    title: "시범운영·안정화",
    summary: "현장 검증·교육",
    owner: "엠소프텍·발주사",
    deliverable: "실제 업무 시나리오 검증, 최종 산출물 대조, 사용자 교육과 운영 문서",
    clientCheck: "실사용에서 발견된 초기 이슈를 우선 보완하고 운영 인수 기준을 함께 확인합니다.",
    exitEvidence: "운영 인수 확인",
  },
] as const;

const MSOFTECH_DELIVERY_SUPPORT_ITEMS = [
  ["착수", "담당자 인터뷰·업무 흐름·기존 자료 체계 확인"],
  ["설계", "실제 서식으로 입력 항목과 최종 산출물 대조"],
  ["중간 확인", "관리자·실무자·고객 역할별 화면 공동 검토"],
  ["시범운영", "실제 업무 시나리오와 최종 결과 확인"],
  ["안정화", "사용자 교육·운영 문서 전달·초기 이슈 우선 대응"],
] as const;

const MSOFTECH_DELIVERY_RULES = [
  {
    icon: FileSearch,
    title: "확인 자료를 먼저 만듭니다",
    detail: "요구사항 문장만 확정하지 않고 실제 입력 화면과 최종 산출물을 함께 보여드립니다.",
  },
  {
    icon: MonitorCheck,
    title: "개발 주소에서 상시 확인합니다",
    detail: "개발 URL을 계속 열어 두고, 고객이 필요할 때 시연을 요청하거나 협업 채널로 문의할 수 있게 합니다.",
  },
  {
    icon: ShieldCheck,
    title: "확정 이후 변경은 분리합니다",
    detail: "최종 확인 전 보완은 설계에 반영하고, 이후 변경은 영향 범위·일정·비용을 먼저 합의합니다.",
  },
] as const;

export interface KickoffDecision {
  id: string;
  index: string;
  title: string;
  recommendation: string;
  rationale: string;
  included: string;
  separate: string;
  later: string;
  clientCheck: string;
  detailScreenId?: string;
  detailLinkLabel?: string;
  icon?: ReactNode;
}

export interface ArchitectureNode {
  id: string;
  title: string;
  detail: string;
  transfer?: string;
  primary?: boolean;
}

export type ArchitectureNodeSet = readonly [
  ArchitectureNode,
  ArchitectureNode,
  ArchitectureNode,
  ArchitectureNode,
];

export type ArchitectureStackSet = readonly [
  { title: string; detail: string },
  { title: string; detail: string },
  { title: string; detail: string },
  { title: string; detail: string },
];

export type ArchitectureDecisionSet = readonly [
  { title: string; detail: string },
  { title: string; detail: string },
  { title: string; detail: string },
  { title: string; detail: string },
];

export type ArchitectureRunbook = readonly [
  { title: string; detail: string },
  { title: string; detail: string },
  { title: string; detail: string },
  { title: string; detail: string },
];

export interface ArchitectureOption {
  id: string;
  label: string;
  recommendation: string;
  facts: { label: string; value: string }[];
  guidance: { title: string; detail: string }[];
}

export interface ArchitectureOperatingProfile {
  ownership: string;
  scale: string;
  hosting: string;
  dataStorage: string;
  operations: string;
  maintenance: string;
}

export interface ArchitectureLegacyDataPlan {
  title: string;
  subtitle: string;
  steps: readonly [string, string, string, string];
  note: string;
}

export interface ArchitectureProviderLink {
  label: string;
  href: string;
}

export function createMsoftechManagedOperatingProfile({
  scale,
  maintenanceScope,
}: {
  scale: string;
  maintenanceScope: string;
}): ArchitectureOperatingProfile {
  return {
    ownership: "GitHub·Vercel·Supabase·도메인은 고객사 명의 계정으로 구성하고, 소스와 운영 데이터도 고객사에 남깁니다.",
    scale,
    hosting: "React 웹은 Vercel Preview에서 고객 검수 후 Production으로 승격하고, 배포 이력과 즉시 롤백 경로를 유지합니다.",
    dataStorage: "Supabase가 로그인·권한·PostgreSQL 데이터·업무 파일을 관리하며 환경별 키와 접근 정책을 분리합니다.",
    operations: "배포 상태와 오류 로그를 확인하고, 운영 반영 전 검증·버전 롤백·데이터 백업 및 복구 절차를 함께 운영합니다.",
    maintenance: maintenanceScope,
  };
}

export function ProposalSectionMarker({
  label,
  number,
}: {
  label: string;
  number: string;
}) {
  return (
    <span className="proposal-section-marker" aria-hidden="true">
      <span data-density="support">{label}</span>
      <strong>{number}</strong>
    </span>
  );
}

export function ProposalExplanationNav({
  active,
  includeKickoffDecisions = false,
  onNavigate,
}: {
  active: ProposalExplanationScreenId;
  includeKickoffDecisions?: boolean;
  onNavigate: (screen: ProposalExplanationScreenId) => void;
}) {
  return (
    <div className="proposal-explanation-nav" aria-label="필수 제안 설명 화면">
      {getProposalExplanationNav(includeKickoffDecisions).map((item) => (
        <button
          key={item.id}
          type="button"
          data-proposal-nav={item.id}
          data-service-introduction-nav={item.id === "service" ? "service" : undefined}
          aria-pressed={active === item.id}
          onClick={() => onNavigate(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function ProposalOverviewScreen({
  lead,
  workflow,
  roles,
  sourceOfTruth,
  onNavigate,
}: {
  lead: string;
  workflow: ProposalWorkflowStep[];
  roles: ProposalRoleGroup[];
  sourceOfTruth: string;
  onNavigate: (screenId: string) => void;
}) {
  return (
    <div
      className="proposal-explanation-stack"
      data-proposal-screen="overview"
      data-proposal-explanation-style="safedesk"
      data-proposal-template-version="safedesk-v1"
    >
      <header className="proposal-page-head">
        <span data-density="meta">역할별 화면 구성 설계</span>
        <h1>전체 화면 구성</h1>
        <p>{lead}</p>
      </header>

      <section className="proposal-explanation-panel" data-proposal-overview-section="workflow">
        <div className="proposal-marked-head">
          <ProposalSectionMarker label="흐름" number="01" />
          <div>
            <h2>핵심 업무가 하나의 결과로 이어지는 과정</h2>
            <p data-density="support">각 단계를 누르면 실제 구현 화면으로 이동합니다.</p>
          </div>
        </div>
        <ol className="proposal-flow-rail">
          {workflow.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                data-proposal-screen-link={step.screenId}
                onClick={() => onNavigate(step.screenId)}
              >
                <span className="proposal-icon-tile" aria-hidden="true">{step.icon}</span>
                <span><strong>{step.title}</strong><small data-density="support">{step.detail}</small></span>
              </button>
              {index < workflow.length - 1 ? <ArrowRight size={17} aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </section>

      <section className="proposal-explanation-panel proposal-role-directory" data-proposal-overview-section="roles">
        <div className="proposal-marked-head">
          <ProposalSectionMarker label="역할" number="02" />
          <div>
            <h2>역할별 업무와 조회 범위</h2>
            <p data-density="support">같은 업무 원본을 각 역할에 필요한 화면으로 나눕니다.</p>
          </div>
        </div>
        <div className="proposal-role-rail">
          {roles.map((role, index) => (
            <a href={`#proposal-role-${role.id}`} key={role.id}>
              <strong>{String(index + 1).padStart(2, "0")}</strong>
              <span>{role.title}<small data-density="support">{role.responsibility}</small></span>
            </a>
          ))}
        </div>
      </section>

      {roles.map((role, index) => (
        <section
          className="proposal-explanation-panel proposal-role-panel"
          data-proposal-overview-section="roles"
          id={`proposal-role-${role.id}`}
          key={role.id}
        >
          <header>
            <ProposalSectionMarker label="ROLE" number={String(index + 1).padStart(2, "0")} />
            <div>
              <span data-density="meta">{role.responsibility}</span>
              <h2>{role.title}</h2>
              <p>{role.description}</p>
            </div>
            <span className="proposal-environments">{role.environments.join(" · ")}</span>
          </header>
          <div className="proposal-role-sections">
            {role.sections.map((section) => (
              <section key={section.title}>
                <h3>{section.title}</h3>
                <div className="proposal-screen-links">
                  {section.screens.map((screen) => (
                    <button
                      key={screen.id}
                      type="button"
                      data-proposal-screen-link={screen.screenId}
                      onClick={() => onNavigate(screen.screenId)}
                    >
                      <span className="proposal-icon-tile" aria-hidden="true">{screen.icon}</span>
                      <span><strong>{screen.title}</strong><small data-density="support">{screen.detail}</small></span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>
      ))}

      <aside className="proposal-explanation-note" data-proposal-overview-source>
        <CheckCircle2 size={18} aria-hidden="true" />
        <span><strong>역할이 달라도 업무 원본은 하나입니다</strong>{sourceOfTruth}</span>
      </aside>
    </div>
  );
}

export function KickoffDecisionScreen({
  lead,
  recommendationTitle,
  recommendationDetail,
  decisions,
  onNavigate,
}: {
  lead: string;
  recommendationTitle: string;
  recommendationDetail: string;
  decisions: KickoffDecision[];
  onNavigate?: (screenId: string) => void;
}) {
  return (
    <div
      className="proposal-explanation-stack"
      data-proposal-screen="decisions"
      data-proposal-explanation-style="safedesk"
      data-proposal-template-version="safedesk-v1"
    >
      <header className="proposal-page-head">
        <span data-density="meta">엠소프텍 제안 · 착수 전 협의 항목 {decisions.length}건</span>
        <h1>착수 전 결정사항</h1>
        <p>{lead}</p>
      </header>

      <section className="proposal-decision-summary">
        <div>
          <span data-density="support">엠소프텍 권장 방향</span>
          <h2>{recommendationTitle}</h2>
          <p>{recommendationDetail}</p>
        </div>
        <ol>
          {decisions.map((decision) => (
            <li key={decision.id}>
              <span>{decision.index}</span>
              <span><strong>{decision.title}</strong><small data-density="support">{decision.recommendation}</small></span>
            </li>
          ))}
        </ol>
      </section>

      {decisions.map((decision) => (
        <section
          className="proposal-explanation-panel proposal-kickoff-decision"
          data-decision-item={decision.id}
          key={decision.id}
        >
          <header className="proposal-kickoff-decision-head">
            <ProposalSectionMarker label="제안" number={decision.index} />
            <div>
              <span className="proposal-icon-tile" aria-hidden="true">{decision.icon}</span>
              <div>
                <span data-density="support">{decision.recommendation}</span>
                <h2>{decision.title}</h2>
                <p>{decision.rationale}</p>
              </div>
            </div>
            {decision.detailScreenId && decision.detailLinkLabel && onNavigate ? (
              <button type="button" onClick={() => onNavigate(decision.detailScreenId!)}>
                {decision.detailLinkLabel}<ArrowRight size={16} aria-hidden="true" />
              </button>
            ) : null}
          </header>

          <div className="proposal-decision-boundary-grid" data-decision-boundary={decision.id}>
            <div><span><CheckCircle2 size={16} />엠소프텍 권장안</span><p>{decision.included}</p></div>
            <div><span><ListChecks size={16} />착수 미팅에서 조율</span><p>{decision.separate}</p></div>
            <div><span><ArrowRight size={16} />운영 후 확장</span><p>{decision.later}</p></div>
          </div>

          <div className="proposal-decision-client-check" data-decision-client-check={decision.id}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span><strong>미팅에서 함께 결정</strong>{decision.clientCheck}</span>
          </div>
        </section>
      ))}
    </div>
  );
}

export function DevelopmentReviewScreen({
  lead,
  support,
  onNavigateOverview,
}: {
  lead: string;
  support?: Partial<DeliverySupportContext>;
  onNavigateOverview?: () => void;
}) {
  const supportContext: DeliverySupportContext = {
    eyebrow: "프로젝트 수행팀 · 필요한 시점의 공동 확인",
    title: "요구사항 확인과 시범운영을 빠르게 이어서 지원합니다",
    description:
      "확인 속도가 품질을 좌우합니다. 착수 인터뷰부터 실제 자료 분석, 중간 화면 검토, 사용자 교육과 초기 안정화까지 확인이 필요한 시점을 일정에 먼저 반영합니다.",
    participants: "담당 관리자·실무자·최종 사용자 공동 확인",
    schedule: "대면 여부, 일정과 지원 범위는 계약 시 확정",
    overviewActionLabel: "역할별 화면 구성 보기",
    ...support,
  };
  const [selectedId, setSelectedId] = useState("final-confirmation");
  const selected =
    MSOFTECH_DELIVERY_STAGES.find((stage) => stage.id === selectedId) ??
    MSOFTECH_DELIVERY_STAGES[3];

  return (
    <div
      className="proposal-explanation-stack"
      data-proposal-screen="delivery"
      data-proposal-explanation-style="safedesk"
      data-proposal-template-version="safedesk-v1"
      data-delivery-master-template="safedesk-v2"
    >
      <header className="proposal-page-head">
        <span data-density="meta">소통 · 산출물 · 확인 기준</span>
        <h1>개발·검수 방식</h1>
        <p>{lead}</p>
      </header>

      <section className="proposal-explanation-panel" data-delivery-process>
        <div className="proposal-marked-head">
          <ProposalSectionMarker label="검수" number="01" />
          <div>
            <h2>제안 프로토타입부터 운영 인수까지 여섯 단계로 나눕니다</h2>
            <p data-density="support">단계를 누르면 그 시점의 결과물과 발주사 확인 기준이 바뀝니다.</p>
          </div>
        </div>
        <ol className="proposal-delivery-rail">
          {MSOFTECH_DELIVERY_STAGES.map((stage, index) => (
            <li key={stage.id}>
              <button
                type="button"
                data-delivery-stage={stage.id}
                aria-pressed={stage.id === selected?.id}
                className={stage.gate ? "is-gate" : undefined}
                onClick={() => setSelectedId(stage.id)}
              >
                <span>{stage.index}</span>
                <span><strong>{stage.title}</strong><small data-density="support">{stage.summary}</small></span>
              </button>
              {index < MSOFTECH_DELIVERY_STAGES.length - 1 ? <ArrowRight size={16} aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
        {selected ? (
          <article
            className={`proposal-delivery-detail${selected.gate ? " is-gate" : ""}`}
            data-delivery-stage-detail={selected.id}
            role="status"
          >
            <span className="proposal-icon-tile" aria-hidden="true">
              {selected.gate ? <ClipboardCheck size={20} /> : <Code2 size={20} />}
            </span>
            <div>
              <span data-density="support">{selected.index} · {selected.title} · 주도 {selected.owner}</span>
              <h3>{selected.deliverable}</h3>
              <p>{selected.clientCheck}</p>
            </div>
            {selected.gate ? <span className="proposal-gate-label">본 개발 착수 기준</span> : null}
          </article>
        ) : null}
      </section>

      <section className="proposal-explanation-panel proposal-delivery-support" data-delivery-support-plan>
        <div className="proposal-delivery-support-head">
          <ProposalSectionMarker label="수행" number="02" />
          <div>
            <span data-density="support">{supportContext.eyebrow}</span>
            <div className="proposal-delivery-support-title">
              <span className="proposal-icon-tile" aria-hidden="true"><Building2 size={20} /></span>
              <h2>{supportContext.title}</h2>
            </div>
            <p>{supportContext.description}</p>
          </div>
        </div>
        <div className="proposal-delivery-support-grid">
          {MSOFTECH_DELIVERY_SUPPORT_ITEMS.map(([title, detail]) => (
            <div key={title}>
              <CheckCircle2 size={17} aria-hidden="true" />
              <span><strong>{title}</strong><small data-density="support">{detail}</small></span>
            </div>
          ))}
        </div>
        <div className="proposal-delivery-support-actions">
          <span><UsersRound size={17} aria-hidden="true" />{supportContext.participants}</span>
          <span><BellRing size={17} aria-hidden="true" />{supportContext.schedule}</span>
          {onNavigateOverview ? (
            <button type="button" onClick={onNavigateOverview}>
              {supportContext.overviewActionLabel}<ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </section>

      <section className="proposal-explanation-panel" data-delivery-completion-rules>
        <div className="proposal-marked-head">
          <ProposalSectionMarker label="기준" number="03" />
          <div>
            <h2>확인 전에는 고치고, 확인 후에는 변경 영향을 먼저 합의합니다</h2>
            <p data-density="support">발주사와 수행사가 같은 기준으로 완료와 변경을 판단합니다.</p>
          </div>
        </div>
        <div className="proposal-delivery-rule-grid">
          {MSOFTECH_DELIVERY_RULES.map((rule) => {
            const Icon = rule.icon;
            return (
              <article key={rule.title}>
                <span className="proposal-icon-tile" aria-hidden="true"><Icon size={19} /></span>
                <h3>{rule.title}</h3>
                <p>{rule.detail}</p>
              </article>
            );
          })}
        </div>
        <div className="proposal-delivery-confirmation">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>
            <strong>엠소프텍의 착수 원칙</strong>
            현재 제안 프로토타입은 협의의 출발점이며, 계약 후 2차 프로토타입을 최종 확인받은 뒤 본 개발을 시작합니다.
          </span>
        </div>
      </section>
    </div>
  );
}

function ProposalOfficialLinks({
  label,
  links,
}: {
  label: string;
  links: ArchitectureProviderLink[];
}) {
  if (links.length === 0) return null;
  return (
    <div className="proposal-official-links" aria-label={label}>
      <span data-density="support">{label}</span>
      <div>
        {links.map((link) => (
          <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
            {link.label}<ExternalLink size={13} aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  );
}

export function IntegrationDeploymentScreen({
  lead,
  nodes,
  stack,
  operatingProfile,
  ownership,
  decisions,
  runbook,
  options,
  legacyData,
  recommendationTitle = "권장 기본안 · Vercel + Supabase",
  recommendationDetail,
  deploymentTitle = "Vercel + Supabase 배포 구성",
  deploymentSubtitle = "별도 장비 구매 없이 시작하고, 운영 계정에 서비스와 데이터를 귀속합니다.",
  costLinks = [],
  securityLinks = [],
}: {
  lead: string;
  nodes: ArchitectureNodeSet;
  stack: ArchitectureStackSet;
  operatingProfile: ArchitectureOperatingProfile;
  ownership: string;
  decisions: ArchitectureDecisionSet;
  runbook: ArchitectureRunbook;
  options: readonly [ArchitectureOption, ...ArchitectureOption[]];
  legacyData?: ArchitectureLegacyDataPlan | null;
  recommendationTitle?: string;
  recommendationDetail?: string;
  deploymentTitle?: string;
  deploymentSubtitle?: string;
  costLinks?: ArchitectureProviderLink[];
  securityLinks?: ArchitectureProviderLink[];
}) {
  const [selectedId, setSelectedId] = useState(options[0]?.id ?? "");
  const selected = options.find((option) => option.id === selectedId) ?? options[0];

  return (
    <div
      className="proposal-explanation-stack"
      data-proposal-screen="architecture"
      data-proposal-explanation-style="safedesk"
      data-proposal-template-version="safedesk-v1"
      data-architecture-master-template="safedesk-v2"
    >
      <header className="proposal-page-head">
        <span data-density="meta">구조 · 비용 · 소유권 · 복구</span>
        <h1>연동·배포 설계</h1>
        <p>{lead}</p>
      </header>

      <section className="proposal-explanation-panel" data-architecture-section="system-flow">
        <div className="proposal-marked-head">
          <ProposalSectionMarker label="구조" number="01" />
          <div><h2>사용자 접속부터 최종 업무 결과까지의 실제 경로</h2></div>
        </div>
        <ol className="proposal-system-flow proposal-system-flow-fixed">
          {nodes.map((node, index) => (
            <li key={node.id}>
              <div className={node.primary ? "is-primary" : undefined} data-architecture-node={node.id}>
                <span data-density="meta">{index + 1}</span>
                {index === 0 ? <Smartphone size={20} aria-hidden="true" /> : null}
                {index === 1 ? <Cloud size={20} aria-hidden="true" /> : null}
                {index === 2 ? <Database size={20} aria-hidden="true" /> : null}
                {index >= 3 ? <FileArchive size={20} aria-hidden="true" /> : null}
                <strong>{node.title}</strong>
                <small data-density="support">{node.detail}</small>
              </div>
              {index < nodes.length - 1 ? (
                <span className="proposal-transfer" data-density="support"><ArrowRight size={17} />{node.transfer}</span>
              ) : null}
            </li>
          ))}
        </ol>
        <div className="proposal-system-support-grid">
          <span><Rocket size={16} aria-hidden="true" />미리보기 검수, 운영 배포 이력과 이전 버전 복구 경로를 유지합니다.</span>
          <span><ShieldCheck size={16} aria-hidden="true" />인증·역할 권한·파일 접근·백업 기준을 운영 계정에서 관리합니다.</span>
        </div>
      </section>

      <div className="proposal-architecture-master-grid" data-architecture-section="deployment-stack">
        <section className="proposal-explanation-panel">
          <div className="proposal-marked-head">
            <ProposalSectionMarker label="배포" number="02" />
            <div>
              <h2>{deploymentTitle}</h2>
              <p data-density="support">{deploymentSubtitle}</p>
            </div>
          </div>
          <div className="proposal-cloud-stack-grid">
            {stack.map((item, index) => (
              <div className="proposal-cloud-stack-card" data-architecture-stack-card key={item.title}>
                <span className="proposal-icon-tile" aria-hidden="true">
                  {index === 0 ? <Cloud size={18} /> : null}
                  {index === 1 ? <ServerCog size={18} /> : null}
                  {index === 2 ? <Database size={18} /> : null}
                  {index >= 3 ? <FileArchive size={18} /> : null}
                </span>
                <span><strong>{item.title}</strong><small data-density="support">{item.detail}</small></span>
              </div>
            ))}
          </div>

          <div className="proposal-architecture-decision" role="status">
            <CheckCircle2 size={20} aria-hidden="true" />
            <span>
              <strong>{recommendationTitle}</strong>
              <small data-density="support">{recommendationDetail ?? ownership}</small>
            </span>
          </div>

          <div className="proposal-deployment-principles">
            <div data-architecture-ownership><KeyRound size={17} /><span><strong>소유권</strong><small data-density="support">{operatingProfile.ownership}</small></span></div>
            <div data-architecture-scale><UsersRound size={17} /><span><strong>규모</strong><small data-density="support">{operatingProfile.scale}</small></span></div>
            <div data-architecture-operations><BellRing size={17} /><span><strong>운영</strong><small data-density="support">{operatingProfile.operations}</small></span></div>
          </div>

          <section className="proposal-runbook" data-architecture-section="runbook">
            <div><h3>배포·복구 운영 절차</h3><p data-density="support">운영 화면을 바로 덮지 않고 확인 가능한 배포 이력을 남깁니다.</p></div>
            <ol>
              {runbook.map((item, index) => (
                <li data-architecture-runbook-step key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><small data-density="support">{item.detail}</small></div></li>
              ))}
            </ol>
          </section>
        </section>

        <div className="proposal-architecture-side-stack">
          <section className="proposal-explanation-panel" data-architecture-section="kickoff-items">
            <div className="proposal-compact-head"><h2>착수 전에 함께 정할 항목</h2><p data-density="support">구축 전에 소유권과 운영 책임부터 확정합니다.</p></div>
            <ol className="proposal-numbered-list proposal-decision-list">
              {decisions.map((item, index) => (
                <li data-architecture-kickoff-item key={item.title}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>
              ))}
            </ol>
          </section>

          {legacyData ? (
            <section className="proposal-explanation-panel" data-architecture-section="legacy-data">
              <div className="proposal-compact-head"><h2>{legacyData.title}</h2><p data-density="support">{legacyData.subtitle}</p></div>
              <ol className="proposal-migration-steps">
                {legacyData.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}
              </ol>
              <p className="proposal-panel-inline-note" data-density="support">{legacyData.note}</p>
            </section>
          ) : null}
        </div>
      </div>

      <section className="proposal-explanation-panel" data-architecture-section="server-maintenance">
        <div className="proposal-marked-head proposal-marked-head-actions">
          <ProposalSectionMarker label="운영" number="03" />
          <div><h2>서버·유지보수 구성</h2><p data-density="support">예상 이용 규모와 운영 책임을 기준으로 권장안과 근거 있는 대안만 비교합니다.</p></div>
          {options.length > 1 ? (
            <div className="proposal-segmented" role="group" aria-label="운영 구성 비교">
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-architecture-option={option.id}
                  aria-pressed={selected?.id === option.id}
                  onClick={() => setSelectedId(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : <span data-architecture-option={selected?.id}>{selected?.label}</span>}
        </div>
        {selected ? (
          <div className="proposal-server-comparison" data-architecture-option-detail={selected.id}>
            <div>
              <div className="proposal-architecture-notice"><ServerCog size={18} /><span><strong>운영 기준</strong><small data-density="support">{selected.recommendation}</small></span></div>
              <dl className="proposal-server-facts">
                <div data-architecture-hosting><dt>호스팅·배포</dt><dd>{operatingProfile.hosting}</dd></div>
                <div data-architecture-data-storage><dt>인증·DB·파일</dt><dd>{operatingProfile.dataStorage}</dd></div>
                <div data-architecture-maintenance><dt>유지보수</dt><dd>{operatingProfile.maintenance}</dd></div>
                {selected.facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}
              </dl>
              <ProposalOfficialLinks label="공식 요금 자료" links={costLinks} />
            </div>
            <div>
              <ul>{selected.guidance.map((item) => <li key={item.title}><ArrowRight size={16} /><span><strong>{item.title}</strong><small data-density="support">{item.detail}</small></span></li>)}</ul>
              <section className="proposal-security-boundary">
                <h3>보안 책임 구분</h3>
                <p>{ownership}</p>
                <ProposalOfficialLinks label="공식 보안 자료" links={securityLinks} />
              </section>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
