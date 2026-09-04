import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";

export const SERVICE_INTRODUCTION_NAV_ITEM = {
  id: "service",
  label: "서비스 소개",
} as const;

export type LandingProofKind = "rfp-image" | "conceptual-illustration";

export interface ServiceIntroductionAction {
  label: string;
  screenId: string;
}

export interface ServiceIntroductionHero {
  kicker: string;
  title: string;
  lead: string;
  proofKind: LandingProofKind;
  image: {
    src: string;
    alt: string;
    position?: string;
  };
  primaryAction: ServiceIntroductionAction;
  secondaryAction?: ServiceIntroductionAction;
  proofPoints: string[];
}

export type ServiceFlowKind =
  | "role"
  | "end-to-end"
  | "approval"
  | "integration"
  | "data"
  | "journey";

export interface ServiceFlowLane {
  id: string;
  label: string;
  detail?: string;
  y: number;
  height: number;
}

export interface ServiceFlowNode extends ServiceIntroductionAction {
  id: string;
  index: string;
  actor: string;
  detail: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface ServiceFlowEdge {
  from: string;
  to: string;
  label?: string;
  labelX?: number;
  labelY?: number;
  labelAnchor?: "start" | "middle" | "end";
}

export interface ServiceFlowView {
  id: string;
  kind: ServiceFlowKind;
  label: string;
  title: string;
  summary: string;
  viewBox?: string;
  lanes?: ServiceFlowLane[];
  nodes: ServiceFlowNode[];
  edges: ServiceFlowEdge[];
}

export type ServiceFlowViews = readonly [ServiceFlowView, ServiceFlowView, ...ServiceFlowView[]];

export interface ServiceIntroductionResultSection {
  eyebrow: string;
  kicker: string;
  title: string;
  description: string;
  actions: readonly [ServiceIntroductionAction, ...ServiceIntroductionAction[]];
  visual: ReactNode;
}

export interface ServiceDemoStep extends ServiceIntroductionAction {
  index: string;
  detail: string;
}

export type ServiceDemoSteps = readonly [
  ServiceDemoStep,
  ServiceDemoStep,
  ServiceDemoStep,
  ...ServiceDemoStep[],
];

export interface ServiceIntroductionCard {
  title: string;
  description: string;
  icon?: ReactNode;
}

export type ServiceImprovementItems = readonly [
  ServiceIntroductionCard,
  ServiceIntroductionCard,
  ServiceIntroductionCard,
];

export interface ServiceIntroductionImprovementSection {
  eyebrow: string;
  title: string;
  lead?: string;
  items: ServiceImprovementItems;
}

export interface ServiceIntroductionSupportSection {
  eyebrow: string;
  title: string;
  description: string;
  action: ServiceIntroductionAction;
  icon?: ReactNode;
}

export interface ServiceWorkflowStep extends ServiceIntroductionAction {
  index: string;
  actor: string;
  detail: string;
}

export type ServiceWorkflowSteps = readonly [
  ServiceWorkflowStep,
  ServiceWorkflowStep,
  ServiceWorkflowStep,
  ServiceWorkflowStep,
  ...ServiceWorkflowStep[],
];

export interface ServiceIntroductionWorkflowSection {
  eyebrow: string;
  title: string;
  lead: string;
  steps: ServiceWorkflowSteps;
}

export type ServiceFeatureItems = readonly [
  ServiceIntroductionCard,
  ServiceIntroductionCard,
  ServiceIntroductionCard,
  ServiceIntroductionCard,
  ServiceIntroductionCard,
  ServiceIntroductionCard,
];

export interface ServiceIntroductionFeatureSection {
  eyebrow: string;
  title: string;
  lead?: string;
  items: ServiceFeatureItems;
}

export interface ServiceScopeColumn {
  title: string;
  subtitle: string;
  items: readonly [string, string, string, ...string[]];
  footnote?: string;
}

export interface ServiceIntroductionScopeSection {
  eyebrow: string;
  title: string;
  lead: string;
  included: ServiceScopeColumn;
  separate: ServiceScopeColumn;
  guide?: {
    title: string;
    description: string;
    action: ServiceIntroductionAction;
  };
}

export interface ServiceIntroductionFinalCta {
  title: string;
  description: string;
  action: ServiceIntroductionAction;
}

export interface ServiceRoleScreenStep extends ServiceIntroductionAction {
  index: string;
}

export interface ServiceRoleScreenRow {
  id: string;
  label: string;
  detail: string;
  steps: ServiceRoleScreenStep[];
}

const DEFAULT_FLOW_NODE_WIDTH = 160;
const DEFAULT_FLOW_NODE_HEIGHT = 78;

function navigate(
  onNavigate: (screenId: string) => void,
  action: ServiceIntroductionAction,
) {
  onNavigate(action.screenId);
}

function SectionMarker({ label, number }: { label: string; number: string }) {
  return (
    <div className="service-introduction-marker" aria-hidden="true">
      <span data-density="meta">{label}</span>
      <strong>{number}</strong>
    </div>
  );
}

function ServiceFlowDiagram({
  flow,
  onNavigate,
}: {
  flow: ServiceFlowView;
  onNavigate: (screenId: string) => void;
}) {
  const markerId = `service-flow-arrow-${useId().replace(/:/g, "")}`;
  const nodesById = useMemo(
    () => new Map(flow.nodes.map((node) => [node.id, node])),
    [flow.nodes],
  );
  const contentBottom = Math.max(
    0,
    ...flow.nodes.map((node) => node.y + (node.height ?? DEFAULT_FLOW_NODE_HEIGHT)),
    ...(flow.lanes?.map((lane) => lane.y + lane.height) ?? []),
  );
  const resolvedViewBox = flow.viewBox ?? `0 0 1200 ${Math.max(280, Math.ceil(contentBottom + 12))}`;

  return (
    <div className="service-introduction-flow-canvas">
      <svg
        viewBox={resolvedViewBox}
        role="img"
        aria-label={`${flow.label}: ${flow.summary}`}
        data-service-flow-svg={flow.kind}
        data-service-flow-layout={flow.kind === "role" ? "swimlane" : "sequence"}
        preserveAspectRatio="xMinYMin meet"
      >
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6.7"
            refY="4"
            orient="auto"
            markerUnits="userSpaceOnUse"
            viewBox="0 0 8 8"
          >
            <path d="M 0 1.5 L 7 4 L 0 6.5 Z" className="service-introduction-flow-arrow" />
          </marker>
        </defs>

        {flow.lanes?.map((lane) => (
          <g key={lane.id} className="service-introduction-flow-lane">
            <rect x="8" y={lane.y} width="1184" height={lane.height} rx="18" />
            <text x="30" y={lane.y + 30} className="service-introduction-flow-lane-label">
              {lane.label}
            </text>
            {lane.detail ? (
              <text x="30" y={lane.y + 51} className="service-introduction-flow-lane-detail" data-density="meta">
                {lane.detail}
              </text>
            ) : null}
          </g>
        ))}

        {flow.edges.map((edge) => {
          const from = nodesById.get(edge.from);
          const to = nodesById.get(edge.to);
          if (!from || !to) return null;
          const fromWidth = from.width ?? DEFAULT_FLOW_NODE_WIDTH;
          const fromHeight = from.height ?? DEFAULT_FLOW_NODE_HEIGHT;
          const toHeight = to.height ?? DEFAULT_FLOW_NODE_HEIGHT;
          const startX = from.x + fromWidth;
          const startY = from.y + fromHeight / 2;
          const endX = to.x;
          const endY = to.y + toHeight / 2;
          const bend = Math.max(48, Math.abs(endX - startX) * 0.42);
          const labelX = edge.labelX ?? (startX + endX) / 2 + 12;
          const labelY = edge.labelY ?? (startY + endY) / 2 - 10;

          return (
            <g
              key={`${edge.from}-${edge.to}`}
              className="service-introduction-flow-edge"
              data-service-flow-edge={`${edge.from}:${edge.to}`}
            >
              <path
                d={`M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`}
                markerEnd={`url(#${markerId})`}
              />
              {edge.label ? (
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor={edge.labelAnchor ?? "start"}
                  data-density="meta"
                >
                  {edge.label}
                </text>
              ) : null}
            </g>
          );
        })}

        {flow.nodes.map((node) => (
          <foreignObject
            key={node.id}
            x={node.x}
            y={node.y}
            width={node.width ?? DEFAULT_FLOW_NODE_WIDTH}
            height={node.height ?? DEFAULT_FLOW_NODE_HEIGHT}
            data-service-flow-node={node.id}
          >
            <button
              type="button"
              className="service-introduction-flow-node"
              data-service-screen-link={node.screenId}
              onClick={() => navigate(onNavigate, node)}
            >
              <span>
                <b data-density="meta">{node.index}</b>
                <em data-density="meta">{node.actor}</em>
              </span>
              <strong>{node.label}</strong>
              <small data-density="meta">{node.detail}</small>
            </button>
          </foreignObject>
        ))}
      </svg>
    </div>
  );
}

function ServiceRoleScreenRows({
  rows,
  onNavigate,
}: {
  rows: ServiceRoleScreenRow[];
  onNavigate: (screenId: string) => void;
}) {
  return (
    <div className="service-introduction-role-flows" data-service-role-screen-rows>
      {rows.map((row) => (
        <article key={row.id}>
          <div className="service-introduction-role-label">
            <strong>{row.label}</strong>
            <span data-density="support">{row.detail}</span>
          </div>
          <ol>
            {row.steps.map((step, index) => (
              <li key={`${row.id}-${step.screenId}`}>
                <button
                  type="button"
                  data-service-screen-link={step.screenId}
                  onClick={() => navigate(onNavigate, step)}
                >
                  <b data-density="support">{step.index}</b>
                  <span>{step.label}</span>
                </button>
                {index < row.steps.length - 1 ? (
                  <ArrowRight size={15} aria-hidden="true" />
                ) : null}
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}

export function ServiceIntroductionScreen({
  hero,
  flowEyebrow,
  flowTitle,
  flowLead,
  flowViews,
  roleScreenRows,
  result,
  demoTitle,
  demoLead,
  demoSteps,
  improvement,
  support,
  workflow,
  features,
  scope,
  finalCta,
  onNavigate,
}: {
  hero: ServiceIntroductionHero;
  flowEyebrow: string;
  flowTitle: string;
  flowLead: string;
  flowViews: ServiceFlowViews;
  roleScreenRows: ServiceRoleScreenRow[];
  result: ServiceIntroductionResultSection;
  demoTitle: string;
  demoLead: string;
  demoSteps: ServiceDemoSteps;
  improvement: ServiceIntroductionImprovementSection;
  support: ServiceIntroductionSupportSection;
  workflow: ServiceIntroductionWorkflowSection;
  features: ServiceIntroductionFeatureSection;
  scope: ServiceIntroductionScopeSection;
  finalCta: ServiceIntroductionFinalCta;
  onNavigate: (screenId: string) => void;
}) {
  const [requestedFlowId, setRequestedFlowId] = useState(flowViews[0].id);
  const activeFlow = flowViews.find((flow) => flow.id === requestedFlowId) ?? flowViews[0];

  return (
    <div
      className="service-introduction-screen"
      data-service-introduction-screen
      data-service-introduction-style="safedesk"
      data-service-master-template="safedesk-v2"
    >
      <section
        className="service-introduction-hero"
        data-landing-hero
        data-landing-hero-theme="reactive"
      >
        <div
          className="service-introduction-hero-visual"
          data-landing-proof={hero.proofKind}
        >
          <img
            src={hero.image.src}
            alt={hero.image.alt}
            style={{ objectPosition: hero.image.position ?? "center" }}
            data-landing-hero-image
            fetchPriority="high"
          />
        </div>
        <div className="service-introduction-hero-copy">
          <span data-density="support">{hero.kicker}</span>
          <h1>{hero.title}</h1>
          <p>{hero.lead}</p>
          <div className="service-introduction-actions">
            <button
              type="button"
              data-landing-primary-action
              onClick={() => navigate(onNavigate, hero.primaryAction)}
            >
              {hero.primaryAction.label}
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            {hero.secondaryAction ? (
              <button
                type="button"
                className="service-introduction-secondary-action"
                data-service-screen-link={hero.secondaryAction.screenId}
                onClick={() => navigate(onNavigate, hero.secondaryAction as ServiceIntroductionAction)}
              >
                {hero.secondaryAction.label}
              </button>
            ) : null}
          </div>
          <ul className="service-introduction-proof-points">
            {hero.proofPoints.map((point) => (
              <li key={point} data-density="support"><CheckCircle2 size={15} aria-hidden="true" />{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className="service-introduction-content">
        <section
          className="service-introduction-panel service-introduction-flow"
          data-service-section="flow"
        >
          <header>
            <span data-density="meta">{flowEyebrow}</span>
            <h2>{flowTitle}</h2>
            <p>{flowLead}</p>
          </header>
          <div
            className="service-introduction-flow-tabs"
            role="tablist"
            aria-label="업무 흐름 보기 방식"
            data-service-flow-tabs
          >
            {flowViews.map((flow) => (
              <button
                key={flow.id}
                type="button"
                role="tab"
                aria-selected={flow.id === activeFlow.id}
                data-service-flow-tab={flow.id}
                data-service-flow-kind={flow.kind}
                onClick={() => setRequestedFlowId(flow.id)}
              >
                {flow.label}
              </button>
            ))}
          </div>
          <div
            className="service-introduction-flow-panel"
            role="tabpanel"
            data-service-flow-panel={activeFlow.id}
            data-service-flow-kind={activeFlow.kind}
            data-service-role-flow={activeFlow.kind === "role" ? activeFlow.id : undefined}
          >
            <div className="service-introduction-flow-summary">
              <strong>{activeFlow.title}</strong>
              <p data-density="support">{activeFlow.summary}</p>
            </div>
            <ServiceFlowDiagram flow={activeFlow} onNavigate={onNavigate} />
            {activeFlow.kind === "role" ? (
              <ServiceRoleScreenRows rows={roleScreenRows} onNavigate={onNavigate} />
            ) : null}
          </div>
        </section>

        <section
          className="service-introduction-highlight service-introduction-result"
          data-service-section="result"
          data-service-highlight="result"
          data-service-result
        >
          <SectionMarker label={result.eyebrow} number="01" />
          <div className="service-introduction-highlight-copy">
            <span data-density="support">{result.kicker}</span>
            <h2>{result.title}</h2>
            <p>{result.description}</p>
            <div className="service-introduction-inline-actions">
              {result.actions.map((action, index) => (
                <button
                  type="button"
                  className={index > 0 ? "is-secondary" : undefined}
                  data-service-screen-link={action.screenId}
                  onClick={() => navigate(onNavigate, action)}
                  key={`${action.screenId}-${action.label}`}
                >
                  {action.label}
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
          <div className="service-introduction-highlight-visual">
            {result.visual}
          </div>
        </section>

        <section
          className="service-introduction-numbered-section service-introduction-demo"
          data-service-section="demo"
          data-service-highlight="demo"
          data-service-demo-route
        >
          <div className="service-introduction-section-heading">
            <SectionMarker label="시연" number="02" />
            <div>
              <h2>{demoTitle}</h2>
              <p>{demoLead}</p>
            </div>
          </div>
          <ol>
            {demoSteps.map((step) => (
              <li key={step.screenId} data-service-demo-step={step.screenId}>
                <button
                  type="button"
                  data-service-screen-link={step.screenId}
                  onClick={() => navigate(onNavigate, step)}
                >
                  <span>{step.index}</span>
                  <strong>{step.label}</strong>
                  <small data-density="support">{step.detail}</small>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="service-introduction-numbered-section service-introduction-improvement"
          data-service-section="improvement"
          data-service-highlight="improvement"
          data-service-improvement
        >
          <div className="service-introduction-section-heading">
            <SectionMarker label={improvement.eyebrow} number="03" />
            <div>
              <h2>{improvement.title}</h2>
              {improvement.lead ? <p>{improvement.lead}</p> : null}
            </div>
          </div>
          <div className="service-introduction-card-grid service-introduction-improvement-grid">
            {improvement.items.map((item) => (
              <article data-service-improvement-item key={item.title}>
                {item.icon ? <span className="service-introduction-card-icon" aria-hidden="true">{item.icon}</span> : null}
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="service-introduction-support-banner"
          data-service-section="support"
          data-service-support-banner
        >
          {support.icon ? <span className="service-introduction-card-icon" aria-hidden="true">{support.icon}</span> : null}
          <div>
            <span data-density="support">{support.eyebrow}</span>
            <h2>{support.title}</h2>
            <p>{support.description}</p>
          </div>
          <button
            type="button"
            data-service-screen-link={support.action.screenId}
            onClick={() => navigate(onNavigate, support.action)}
          >
            {support.action.label}
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </section>

        <section
          className="service-introduction-numbered-section service-introduction-workflow"
          data-service-section="workflow"
          data-service-workflow
        >
          <div className="service-introduction-section-heading">
            <SectionMarker label={workflow.eyebrow} number="04" />
            <div>
              <h2>{workflow.title}</h2>
              <p>{workflow.lead}</p>
            </div>
          </div>
          <div className="service-introduction-workflow-grid">
            {workflow.steps.map((step) => (
              <button
                type="button"
                data-service-workflow-step={step.screenId}
                data-service-screen-link={step.screenId}
                onClick={() => navigate(onNavigate, step)}
                key={`${step.index}-${step.screenId}`}
              >
                <span>{step.index}</span>
                <span>
                  <small data-density="support">{step.actor}</small>
                  <strong>{step.label}</strong>
                  <small data-density="support">{step.detail}</small>
                  <em data-density="support">이 단계 화면 열기 <ArrowRight size={14} aria-hidden="true" /></em>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          className="service-introduction-numbered-section service-introduction-features"
          data-service-section="features"
          data-service-features
        >
          <div className="service-introduction-section-heading">
            <SectionMarker label={features.eyebrow} number="05" />
            <div>
              <h2>{features.title}</h2>
              {features.lead ? <p>{features.lead}</p> : null}
            </div>
          </div>
          <div className="service-introduction-card-grid service-introduction-feature-grid">
            {features.items.map((item) => (
              <article data-service-feature-item key={item.title}>
                {item.icon ? <span className="service-introduction-card-icon" aria-hidden="true">{item.icon}</span> : null}
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="service-introduction-numbered-section service-introduction-scope"
          data-service-section="scope"
          data-service-scope
        >
          <div className="service-introduction-section-heading">
            <SectionMarker label={scope.eyebrow} number="06" />
            <div>
              <h2>{scope.title}</h2>
              <p>{scope.lead}</p>
            </div>
          </div>
          <div className="service-introduction-scope-grid">
            {(["included", "separate"] as const).map((kind) => {
              const column = scope[kind];
              return (
                <article data-service-scope-column={kind} key={kind}>
                  <header>
                    <h3>{column.title}</h3>
                    <p data-density="support">{column.subtitle}</p>
                  </header>
                  <ul>
                    {column.items.map((item) => (
                      <li key={item}>
                        {kind === "included" ? <CheckCircle2 size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {column.footnote ? <footer data-density="support">{column.footnote}</footer> : null}
                </article>
              );
            })}
          </div>
          {scope.guide ? (
            <div className="service-introduction-scope-guide" data-service-scope-guide>
              <div>
                <strong>{scope.guide.title}</strong>
                <span data-density="support">{scope.guide.description}</span>
              </div>
              <button
                type="button"
                data-service-screen-link={scope.guide.action.screenId}
                onClick={() => navigate(onNavigate, scope.guide!.action)}
              >
                {scope.guide.action.label}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </section>

        <section
          className="service-introduction-final-cta"
          data-service-section="cta"
          data-service-final-cta
        >
          <div>
            <h2>{finalCta.title}</h2>
            <p>{finalCta.description}</p>
          </div>
          <button
            type="button"
            data-service-screen-link={finalCta.action.screenId}
            onClick={() => navigate(onNavigate, finalCta.action)}
          >
            {finalCta.action.label}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}
