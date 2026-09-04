import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  MessageSquare,
  ReceiptText,
  RefreshCcw,
  Send,
} from "lucide-react";

import {
  ChipGroup,
  DescGrid,
  Modal,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { TODAY } from "../data/seed";
import type { Contract } from "../data/types";
import { formatWon, overdueFee } from "../data/utils";
import { useStore } from "../store";

type TemplateId = "TP-EXPIRE" | "TP-UNPAID" | "TP-INVOICE";

type TemplateDefinition = {
  id: TemplateId;
  label: string;
  sampleButtonLabel: string;
  modalTitle: string;
  messageTitle: string;
  summary: string;
  actionLabel: string;
};

const TEMPLATES: TemplateDefinition[] = [
  {
    id: "TP-EXPIRE",
    label: "계약 만료 예정",
    sampleButtonLabel: "계약 만료 예정 알림 샘플 보기",
    modalTitle: "계약 만료 예정 알림 샘플",
    messageTitle: "계약 만료 예정 안내",
    summary: "만료일·계약번호·연장 또는 출고 신청 안내",
    actionLabel: "계약 내용 보기",
  },
  {
    id: "TP-UNPAID",
    label: "보관료 미납",
    sampleButtonLabel: "보관료 미납 알림 샘플 보기",
    modalTitle: "보관료 미납 알림 샘플",
    messageTitle: "보관료 미납 안내",
    summary: "미납 월·청구 금액·납부 계좌 안내",
    actionLabel: "청구 내역 보기",
  },
  {
    id: "TP-INVOICE",
    label: "세금계산서 발행 완료",
    sampleButtonLabel: "세금계산서 발행 완료 알림 샘플 보기",
    modalTitle: "세금계산서 발행 완료 알림 샘플",
    messageTitle: "세금계산서 발행 완료",
    summary: "발행번호·합계 금액·수신 이메일 안내",
    actionLabel: "발행 내역 보기",
  },
];

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "발송 완료", label: "발송 완료" },
  { id: "발송 실패", label: "발송 실패" },
  { id: "문자 재발송 성공", label: "재발송 복구" },
];

export default function Notifications() {
  const { state, derived, actions } = useStore();
  const [templateId, setTemplateId] = useState<TemplateId>("TP-UNPAID");
  const [sampleTemplateId, setSampleTemplateId] = useState<TemplateId | null>(null);
  const [filter, setFilter] = useState("all");
  const [selectedContracts, setSelectedContracts] = useState<string[]>([
    "SC-2025-0844",
    "SC-2026-0208",
  ]);
  const sampleOpenerRef = useRef<HTMLButtonElement | null>(null);

  const template = TEMPLATES.find((item) => item.id === templateId) ?? TEMPLATES[0];
  const invoiceReadyContracts = Array.from(
    new Set(
      state.billingItems
        .filter((item) => item.invoiceStatus === "발행 완료")
        .map((item) => item.contractId),
    ),
  )
    .map((contractId) => derived.contractById.get(contractId))
    .filter((item): item is Contract => item !== undefined);

  function getTargets(nextTemplateId: TemplateId) {
    if (nextTemplateId === "TP-EXPIRE") return derived.expiringContracts;
    if (nextTemplateId === "TP-INVOICE") return invoiceReadyContracts;
    return derived.overdueContracts;
  }

  const targets = getTargets(templateId);

  const rows = useMemo(
    () =>
      state.notifications.filter((item) => (filter === "all" ? true : item.status === filter)),
    [state.notifications, filter],
  );

  const failed = state.notifications.filter((item) => item.status === "발송 실패");
  const sampleTemplate = sampleTemplateId
    ? TEMPLATES.find((item) => item.id === sampleTemplateId)
    : undefined;

  function buildSample(nextTemplateId: TemplateId) {
    const sampleTargets = getTargets(nextTemplateId);
    const contract = sampleTargets[0];
    const customer = contract ? derived.customerOf(contract) : undefined;
    const recipient = customer?.kind === "법인"
      ? `${customer.name} 담당자님`
      : `${customer?.name ?? "고객"} 고객님`;
    const bankAccount = "국민은행 612301-04-882014";

    if (!contract) {
      return {
        recipient: "고객님",
        contractId: "-",
        channel: "카카오 알림톡 → 실패 시 문자",
        autoFields: "대상 데이터가 생성되면 자동으로 채워집니다.",
        fallback: "알림톡과 같은 핵심 정보를 문자로 재발송",
        lines: ["현재 이 문구를 보낼 수 있는 대상이 없습니다."],
      };
    }

    if (nextTemplateId === "TP-EXPIRE") {
      const daysUntil = Math.max(
        0,
        Math.ceil((Date.parse(contract.endDate) - Date.parse(TODAY)) / (24 * 60 * 60 * 1000)),
      );
      return {
        recipient,
        contractId: contract.id,
        channel: "카카오 알림톡 → 실패 시 문자",
        autoFields: "고객명 · 계약번호 · 창고번호 · 만료일 · 월 보관료",
        fallback: "만료일·신청 경로를 유지한 짧은 문자",
        lines: [
          `${recipient}, ${contract.containerNo} 컨테이너 보관 계약이 ${contract.endDate}에 만료됩니다.`,
          `계약번호 ${contract.id} · 만료 D-${daysUntil} · 월 보관료 ${formatWon(contract.monthlyFee)}`,
          "계약 연장 또는 출고가 필요하면 아래 버튼에서 신청해 주세요.",
        ],
      };
    }

    if (nextTemplateId === "TP-INVOICE") {
      const billing = state.billingItems.find(
        (item) => item.contractId === contract.id && item.invoiceStatus === "발행 완료",
      );
      const total = billing?.amount ?? contract.monthlyFee;
      const supply = Math.round(total / 1.1);
      const tax = total - supply;
      const period = `${(billing?.period ?? "2026-08").replace("-", "년 ")}월`;
      return {
        recipient,
        contractId: contract.id,
        channel: "카카오 알림톡 → 실패 시 문자",
        autoFields: "고객명 · 발행번호 · 대상 월 · 공급가액 · 부가세 · 합계",
        fallback: "발행번호·합계·이메일 발송 사실을 문자로 재발송",
        lines: [
          `${recipient}, ${period} 컨테이너 보관료 전자세금계산서가 발행되었습니다.`,
          `발행번호 ${billing?.invoiceNo ?? "발행번호 확인 중"} · 공급가액 ${formatWon(supply)} · 부가세 ${formatWon(tax)} · 합계 ${formatWon(total)}`,
          "전자세금계산서는 등록된 수신 이메일로 발송되었습니다. 확인이 어려우시면 발행 내역에서 재발송을 요청해 주세요.",
        ],
      };
    }

    const fee = overdueFee(
      contract.unpaidPrincipal,
      contract.overdueDays,
      state.settings.overdueRatePercent,
      state.settings.overdueGraceDays,
    );
    const amount = contract.unpaidPrincipal + fee;
    return {
      recipient,
      contractId: contract.id,
      channel: "카카오 알림톡 → 실패 시 문자",
      autoFields: "고객명 · 계약번호 · 미납 월 · 청구 금액 · 납부 기한 · 계좌번호",
      fallback: "미납 금액·납부 계좌·문의 기준을 유지한 문자",
      lines: [
        `${recipient}, 2026년 8월 보관료 ${formatWon(amount)}의 납부 기한이 지났습니다.`,
        `계약번호 ${contract.id} · 납부 기한 2026-08-31 · 입금 계좌 ${bankAccount}`,
        "이미 납부하셨다면 입금 반영까지 시간이 걸릴 수 있습니다. 문의 시 계약번호를 알려 주세요.",
      ],
    };
  }

  const sample = sampleTemplateId ? buildSample(sampleTemplateId) : undefined;

  useEffect(() => {
    if (!sampleTemplateId || !sampleTemplate) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSampleTemplateId(null);
      window.requestAnimationFrame(() => sampleOpenerRef.current?.focus());
    };
    document.addEventListener("keydown", handleKeyDown);
    window.requestAnimationFrame(() => {
      const dialog = document.querySelector<HTMLElement>(
        `[role="dialog"][aria-label="${sampleTemplate.modalTitle}"]`,
      );
      dialog?.querySelector<HTMLButtonElement>('button[aria-label="닫기"]')?.focus();
    });
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [sampleTemplateId, sampleTemplate]);

  function toggleTarget(contractId: string) {
    setSelectedContracts((current) =>
      current.includes(contractId)
        ? current.filter((item) => item !== contractId)
        : [...current, contractId],
    );
  }

  function changeTemplate(nextTemplateId: string) {
    const normalizedTemplateId = nextTemplateId as TemplateId;
    setTemplateId(normalizedTemplateId);
    setSelectedContracts(getTargets(normalizedTemplateId).slice(0, 2).map((contract) => contract.id));
  }

  function openSample(nextTemplateId: TemplateId, event: MouseEvent<HTMLButtonElement>) {
    sampleOpenerRef.current = event.currentTarget;
    setSampleTemplateId(nextTemplateId);
  }

  function closeSample() {
    setSampleTemplateId(null);
    window.requestAnimationFrame(() => sampleOpenerRef.current?.focus());
  }

  function sendSelected() {
    const eligibleContractIds = new Set(targets.map((contract) => contract.id));
    const payload = selectedContracts
      .filter((contractId) => eligibleContractIds.has(contractId))
      .map((contractId) => {
        const contract = derived.contractById.get(contractId);
        const customer = contract ? derived.customerOf(contract) : undefined;
        if (!contract || !customer || customer.smsOptOut) return null;
        return { contractId, target: `${customer.name} · ${customer.contact}` };
      })
      .filter((item): item is { contractId: string; target: string } => item !== null);
    if (payload.length > 0) actions.sendNotifications(payload, templateId, template.label);
  }

  return (
    <div className="screen">
      <PageHead
        kicker="고객 소통 · 알림톡·문자 발송"
        title="알림 발송·이력"
        lead="계약 만료·보관료 미납·세금계산서 발행 완료 문구를 실제 수신 형태로 확인한 뒤 대상 고객에게 선택 발송하고, 실패 건은 문자로 재발송합니다."
      />

      {failed.length > 0 ? (
        <NoticeBar
          variant="attention"
          title={`자동 처리 실패 ${failed.length}건`}
          action={
            <button
              type="button"
              className="notice-action"
              onClick={() => actions.retryNotification(failed[0].id)}
            >
              문자로 재발송
            </button>
          }
        >
          {failed[0].target} · {failed[0].failReason}. 알림톡이 실패하면 같은 문구를 문자로 재발송해
          도달을 복구합니다.
        </NoticeBar>
      ) : (
        <NoticeBar variant="info" title="자동 처리 실패 없음">
          최근 자동 발송에서 실패한 건이 없습니다. 재발송으로 복구한 이력은 아래 목록에서 확인할 수
          있습니다.
        </NoticeBar>
      )}

      <PanelRow columns="7-5">
        <Panel
          title="발송 대상 선택"
          description={`${template.label} 대상 ${targets.length}건입니다. 수신 제외 고객은 자동으로 빠집니다.`}
          actions={
            <button
              type="button"
              className="primary-button"
              disabled={selectedContracts.length === 0}
              onClick={sendSelected}
            >
              <Send size={16} aria-hidden="true" />
              선택 대상 발송
            </button>
          }
        >
          <ChipGroup
            label="발송 문구"
            options={TEMPLATES.map((item) => ({ id: item.id, label: item.label }))}
            value={templateId}
            onChange={changeTemplate}
          />

          <TableWrap
            footer={
              <>
                <span role="status" aria-label="발송 대상 요약">
                  {template.label} 대상 {targets.length}건 · 선택 {selectedContracts.length}건
                </span>
                <span>자동 발송 매일 {state.settings.sendTime} · 24시간 내 중복 발송 차단</span>
              </>
            }
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">선택</th>
                  <th scope="col">고객</th>
                  <th scope="col">계약 · 창고번호</th>
                  <th scope="col" className="numeric">청구 금액</th>
                  <th scope="col">수신</th>
                </tr>
              </thead>
              <tbody>
                {targets.map((contract) => {
                  const customer = derived.customerOf(contract);
                  const rowFee = overdueFee(
                    contract.unpaidPrincipal,
                    contract.overdueDays,
                    state.settings.overdueRatePercent,
                    state.settings.overdueGraceDays,
                  );
                  const invoiceBilling = state.billingItems.find(
                    (item) => item.contractId === contract.id && item.invoiceStatus === "발행 완료",
                  );
                  const amount = templateId === "TP-EXPIRE"
                    ? contract.monthlyFee
                    : templateId === "TP-INVOICE"
                      ? (invoiceBilling?.amount ?? contract.monthlyFee)
                      : contract.unpaidPrincipal + rowFee;
                  const alreadySent = state.notifications.some(
                    (item) =>
                      item.contractId === contract.id &&
                      item.templateId === templateId &&
                      item.sentAt.startsWith(TODAY),
                  );
                  return (
                    <tr key={contract.id} aria-selected={selectedContracts.includes(contract.id)}>
                      <td data-label="선택">
                        <input
                          type="checkbox"
                          checked={selectedContracts.includes(contract.id)}
                          onChange={() => toggleTarget(contract.id)}
                          aria-label={`${contract.id} 발송 대상 선택`}
                          disabled={customer?.smsOptOut}
                        />
                      </td>
                      <td data-label="고객">
                        {customer?.name}
                        <span className="cell-sub" data-density="support">{customer?.contact}</span>
                      </td>
                      <td data-label="계약 · 창고번호">
                        {contract.id}
                        <span className="cell-sub" data-density="support">{contract.containerNo}</span>
                      </td>
                      <td data-label="청구 금액" className="numeric amount tabular">
                        {formatWon(amount)}
                      </td>
                      <td data-label="수신">
                        {customer?.smsOptOut ? (
                          <StateText tone="warn">수신 제외</StateText>
                        ) : alreadySent ? (
                          <StateText tone="info">오늘 발송됨</StateText>
                        ) : (
                          <StateText tone="ok">발송 가능</StateText>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <div className="stack">
          <Panel
            title="발송 문구 샘플"
            description="발송 전에 고객에게 보이는 알림톡 문구와 버튼을 확인합니다."
          >
            <div className="notification-sample-list">
              {TEMPLATES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="notification-sample-button"
                  aria-label={item.sampleButtonLabel}
                  onClick={(event) => openSample(item.id, event)}
                >
                  <span className="notification-sample-icon" aria-hidden="true">
                    {item.id === "TP-EXPIRE" ? (
                      <CalendarClock size={18} />
                    ) : item.id === "TP-UNPAID" ? (
                      <CircleDollarSign size={18} />
                    ) : (
                      <ReceiptText size={18} />
                    )}
                  </span>
                  <span className="notification-sample-copy">
                    <strong>{item.label}</strong>
                    <span data-density="support">{item.summary}</span>
                  </span>
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="notification-sample-policy">
              <MessageSquare size={17} aria-hidden="true" />
              <div>
                <strong>공통 발송 기준</strong>
                <p>등록된 값 자동 치환 · 같은 계약과 문구는 24시간 내 1회 · 실패 시 문자 재발송</p>
              </div>
            </div>
          </Panel>

          <Panel title="자동 발송 예정" description="만료일 기준 자동 발송 대상입니다.">
            <ul className="record-list">
              {derived.expiringContracts.slice(0, 3).map((contract) => (
                <li key={contract.id}>
                  <div className="record-list-head">
                    <strong>{derived.customerOf(contract)?.name}</strong>
                    <span className="record-meta" data-density="support">
                      {contract.endDate} 만료
                    </span>
                  </div>
                  <p>
                    {contract.id} · {contract.containerNo} · 발송 예정 {state.settings.sendTime}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </PanelRow>

      <Panel
        title="발송 이력"
        description="채널·상태별로 걸러 확인하고 실패 건을 재발송합니다."
      >
        <div className="filter-bar">
          <ChipGroup label="발송 상태" options={FILTERS} value={filter} onChange={setFilter} />
          <span className="panel-note" role="status" aria-label="발송 이력 요약">
            전체 {state.notifications.length}건 중 {rows.length}건 표시 · 완료{" "}
            {state.notifications.filter((item) => item.status === "발송 완료").length} / 실패{" "}
            {failed.length} / 재발송 복구{" "}
            {state.notifications.filter((item) => item.status === "문자 재발송 성공").length}
          </span>
        </div>

        <TableWrap>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">발송</th>
                <th scope="col">채널 · 문구</th>
                <th scope="col">수신 대상</th>
                <th scope="col" data-priority="low">발송 시각</th>
                <th scope="col">상태</th>
                <th scope="col" aria-label="행 작업" />
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td data-label="발송">
                    <span className="cell-strong id-cell">{item.id}</span>
                    <span className="cell-sub" data-density="support">{item.handledBy}</span>
                  </td>
                  <td data-label="채널 · 문구">
                    {item.channel}
                    <span className="cell-sub" data-density="support">{item.templateName}</span>
                  </td>
                  <td data-label="수신 대상">{item.target}</td>
                  <td data-label="발송 시각" data-priority="low" className="date-cell">{item.sentAt}</td>
                  <td data-label="상태">
                    <StateText
                      tone={
                        item.status === "발송 실패"
                          ? "bad"
                          : item.status === "문자 재발송 성공"
                            ? "info"
                            : "ok"
                      }
                    >
                      {item.status}
                    </StateText>
                    {item.failReason && item.status === "발송 실패" ? (
                      <span className="cell-sub" data-density="support">{item.failReason}</span>
                    ) : null}
                    {item.retriedAt ? (
                      <span className="cell-sub" data-density="support">재발송 {item.retriedAt}</span>
                    ) : null}
                  </td>
                  <td data-label="작업">
                    <div className="row-actions">
                      {item.status === "발송 실패" ? (
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${item.id} 문자 재발송`}
                          onClick={() => actions.retryNotification(item.id)}
                        >
                          <RefreshCcw size={14} aria-hidden="true" />
                          재발송
                        </button>
                      ) : (
                        <span className="disabled-reason" data-density="support">
                          <MessageSquare size={13} aria-hidden="true" /> 재발송 불필요
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      {sampleTemplate && sample ? (
        <Modal
          title={sampleTemplate.modalTitle}
          description={
            sampleTemplate.id === "TP-INVOICE"
              ? "세금계산서 발행은 결제·세금계산서 화면에서 완료하고, 이 문구는 발행 결과를 고객에게 알립니다."
              : "선택한 대상의 실제 값이 자동으로 들어간 고객 수신 예시입니다."
          }
          onClose={closeSample}
          actions={
            <button type="button" className="ghost-button" onClick={closeSample}>
              샘플 닫기
            </button>
          }
        >
          <div className="notification-sample-dialog" data-notification-sample-dialog>
            <div
              className="alimtalk-preview"
              role="status"
              aria-label={`${sampleTemplate.messageTitle} 수신 문구`}
            >
              <div className="alimtalk-sender">
                <span className="alimtalk-sender-icon" aria-hidden="true">
                  <MessageSquare size={18} />
                </span>
                <div>
                  <strong>StoreDesk</strong>
                  <span data-density="support">카카오 알림톡</span>
                </div>
              </div>
              <div className="alimtalk-bubble">
                <strong>{sampleTemplate.messageTitle}</strong>
                <div className="alimtalk-message">
                  {sample.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <span
                  className="alimtalk-action"
                  aria-label={`고객 수신 버튼 예시: ${sampleTemplate.actionLabel}`}
                >
                  {sampleTemplate.actionLabel}
                </span>
              </div>
            </div>

            <DescGrid
              columns="2"
              items={[
                { label: "예시 대상", value: `${sample.recipient} · ${sample.contractId}` },
                { label: "발송 채널", value: sample.channel },
                { label: "자동 채움", value: sample.autoFields },
                { label: "실패 시 문자", value: sample.fallback },
              ]}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
