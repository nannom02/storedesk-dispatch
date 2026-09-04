import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Link2, PauseCircle, Save, Sigma } from "lucide-react";

import {
  DescGrid,
  EmptyState,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { currentBatch } from "../data/seed";
import { formatWon } from "../data/utils";
import { useStore } from "../store";

export default function UnmatchedReview({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  const { state, derived, actions } = useStore();
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [manualReason, setManualReason] = useState("입금자명과 대표자명이 일치하고 월 이용료와 입금액이 같아 해당 계약으로 연결 요청");

  const reviewable = useMemo(
    () => state.txs.filter((tx) => tx.status === "검토 필요" || tx.status === "보류"),
    [state.txs],
  );
  const currentBatchAvailable = state.batches.some((batch) => batch.id === currentBatch.id);

  useEffect(() => {
    if (!currentBatchAvailable) actions.uploadBatch();
  }, [actions, currentBatchAvailable]);

  const selected =
    state.txs.find((tx) => tx.id === selectedTxId) ?? reviewable[0] ?? null;

  useEffect(() => {
    if (!selected) return;
    setCandidateId((current) =>
      current && selected.candidateContractIds.includes(current)
        ? current
        : (selected.contractId ?? selected.candidateContractIds[0] ?? null),
    );
    setManualReason(selected.manualReason ?? "입금자명과 대표자명이 일치하고 월 이용료와 입금액이 같아 해당 계약으로 연결 요청");
  }, [selected]);

  const targetContractId = selected?.contractId ?? selected?.pendingContractId ?? candidateId;
  const targetContract = targetContractId ? derived.contractById.get(targetContractId) : undefined;
  const targetCustomer = targetContract ? derived.customerOf(targetContract) : undefined;

  const splitPartners = useMemo(() => {
    if (!selected || selected.reviewKind !== "분할 입금") return [];
    return state.txs.filter(
      (tx) =>
        tx.batchId === selected.batchId &&
        tx.payerName === selected.payerName &&
        tx.reviewKind === "분할 입금",
    );
  }, [selected, state.txs]);

  const splitTotal = splitPartners.reduce((sum, tx) => sum + tx.amount, 0);
  const aliasSaved = selected
    ? state.aliases.some((alias) => alias.payerName === selected.payerName)
    : false;
  const resolved = selected ? selected.status !== "검토 필요" : false;
  const approvalPending = selected?.approvalStatus === "승인 대기";
  const recommendedAction = (() => {
    if (!selected) return null;
    if (!resolved && splitPartners.length > 1 && targetContractId) return "merge";
    if (!resolved && splitPartners.length <= 1 && targetContractId && approvalPending) return "approve";
    if (!resolved && splitPartners.length <= 1 && targetContractId) return "request";
    if (resolved && selected.contractId && !aliasSaved && targetCustomer) return "save-alias";
    return null;
  })();

  const pendingCount = state.txs.filter((tx) => tx.status === "검토 필요").length;
  const heldCount = state.txs.filter((tx) => tx.status === "보류").length;

  return (
    <div className="screen">
      <PageHead
        kicker="정산 · 자동 판정이 멈춘 입금"
        title="미매칭 검토"
        lead="동명이인, 등록되지 않은 입금자명, 분할 입금, 계약 없는 입금을 한 건씩 판정합니다. 판정 결과는 계약 만료일·연체 상태·입금 이력에 그대로 반영됩니다."
        actions={
          <button type="button" className="ghost-button" onClick={() => onNavigate("deposits")}>
            입금 계약 자동 대조로 돌아가기
          </button>
        }
      />

      {reviewable.length === 0 ? (
        <NoticeBar
          variant="info"
          title="자동 대조를 실행하면 검토 대상이 표시됩니다"
          action={
            <button type="button" className="notice-action" onClick={() => onNavigate("deposits")}>
              입금 계약 자동 대조 시작
            </button>
          }
        >
          거래내역을 가져온 뒤 동명이인·분할 입금처럼 담당자 판정이 필요한 건만 이 화면으로 넘어옵니다.
        </NoticeBar>
      ) : null}

      <PanelRow columns="5-7">
          <Panel
            title="검토 대기 목록"
            description={`검토 ${pendingCount}건 · 보류 ${heldCount}건. 행을 열면 오른쪽에서 판정 근거를 비교합니다.`}
          >
            {reviewable.length === 0 ? (
              <EmptyState>
                <strong>검토 대기 0건</strong>
                <span>입금 계약 자동 대조에서 검토 대상을 생성해 주세요.</span>
              </EmptyState>
            ) : (
              <TableWrap
              footer={
                <>
                  <span>검토 대기 {pendingCount}건 · 보류 {heldCount}건</span>
                  <span className="tabular">
                    합계 {formatWon(reviewable.reduce((sum, tx) => sum + tx.amount, 0))}
                  </span>
                </>
              }
              >
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">거래</th>
                    <th scope="col">입금자명</th>
                    <th scope="col" className="numeric">금액</th>
                    <th scope="col">분류</th>
                    <th scope="col" aria-label="행 작업" />
                  </tr>
                </thead>
                <tbody>
                  {reviewable.map((tx) => (
                    <tr key={tx.id} aria-selected={selected?.id === tx.id}>
                      <td data-label="거래">
                        <span className="cell-strong id-cell">{tx.id}</span>
                        <span className="cell-sub" data-density="support">{tx.date}</span>
                      </td>
                      <td data-label="입금자명">{tx.payerName}</td>
                      <td data-label="금액" className="numeric amount tabular">{formatWon(tx.amount)}</td>
                      <td data-label="분류">
                        <StateText tone={tx.status === "보류" ? "bad" : "warn"}>
                          {tx.status === "보류" ? "보류" : tx.reviewKind}
                        </StateText>
                      </td>
                      <td data-label="작업">
                        <div className="row-actions">
                          <button
                            type="button"
                            className="quiet-button"
                            aria-label={`${tx.id} 검토 열기`}
                            onClick={() => setSelectedTxId(tx.id)}
                          >
                            검토
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </TableWrap>
            )}

          <div className="stack" data-gap="tight" role="status" aria-label="등록 입금자명 원장">
            <strong className="card-title">등록 입금자명 원장 {state.aliases.length}건</strong>
            <ul className="record-list">
              {state.aliases.slice(0, 4).map((alias) => (
                <li key={alias.id}>
                  <div className="record-list-head">
                    <strong>{alias.payerName}</strong>
                    <span className="record-meta" data-density="support">{alias.learnedAt}</span>
                  </div>
                  <p>
                    {derived.customerById.get(alias.customerId)?.name ?? alias.customerId} ·{" "}
                    {alias.learnedFrom}
                  </p>
                </li>
              ))}
            </ul>
          </div>
          </Panel>

          <Panel
            title={selected ? `${selected.id} 판정` : "판정"}
            description={
              selected
                ? `${selected.date} · ${selected.payerName} · ${formatWon(selected.amount)}`
                : "검토할 거래를 선택하세요."
            }
          >
          {!selected ? (
            <EmptyState>
              <strong>선택된 거래가 없습니다</strong>
              <span>왼쪽 목록에서 검토할 입금을 선택하세요.</span>
            </EmptyState>
          ) : (
            <>
              <div
                className={selected.status === "보류" ? "notice notice-attention" : "notice notice-review"}
              >
                <span className="notice-icon" aria-hidden="true">
                  <Sigma size={18} />
                </span>
                <div className="notice-body">
                  <strong className="notice-title">
                    {selected.status === "검토 필요" ? `${selected.reviewKind} 후보` : selected.status}
                  </strong>
                  <p role="status" aria-label="판정 근거">
                    {selected.reason}
                    {selected.reviewKind === "동명이인" && targetContract
                      ? ` 현재 비교 대상은 ${targetContract.id} · ${targetCustomer?.name}(${targetCustomer?.kind}) 월 이용료 ${formatWon(targetContract.monthlyFee)}입니다.`
                      : ""}
                  </p>
                </div>
              </div>

              {selected.candidateContractIds.length > 0 ? (
                <div className="stack" data-gap="tight">
                  <strong className="card-title">후보 계약 {selected.candidateContractIds.length}건</strong>
                  <div className="stack" data-gap="tight">
                    {selected.candidateContractIds.map((contractId) => {
                      const contract = derived.contractById.get(contractId);
                      const customer = contract ? derived.customerOf(contract) : undefined;
                      const active = targetContractId === contractId;
                      const lastPayment = contract?.payments[0];
                      return (
                        <button
                          key={contractId}
                          type="button"
                          className="kpi-card"
                          aria-label={`후보 ${contractId} 선택`}
                          aria-pressed={active}
                          style={
                            active
                              ? { borderColor: "var(--primary)", background: "var(--primary-soft)" }
                              : undefined
                          }
                          onClick={() => setCandidateId(contractId)}
                        >
                          <div className="kpi-card-head">
                            <strong>
                              {customer?.name} · {customer?.kind}
                            </strong>
                            <span className="record-meta" data-density="support">{contractId}</span>
                          </div>
                          <span className="kpi-foot">
                            월 이용료 {formatWon(contract?.monthlyFee ?? 0)} · 만료 {contract?.endDate} ·
                            최근 입금 {lastPayment ? `${lastPayment.date} ${formatWon(lastPayment.amount)}` : "없음"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {splitPartners.length > 1 ? (
                <DescGrid
                  columns="2"
                  items={[
                    { label: "합산 대상", value: splitPartners.map((tx) => tx.id).join(" + ") },
                    { label: "합산 금액", value: formatWon(splitTotal) },
                    {
                      label: "월 이용료",
                      value: formatWon(targetContract?.monthlyFee ?? 0),
                    },
                    {
                      label: "연장 개월",
                      value: `${Math.max(1, Math.round(splitTotal / Math.max(1, targetContract?.monthlyFee ?? 1)))}개월`,
                    },
                  ]}
                />
              ) : null}

              <div className="stack" data-gap="tight">
                <strong className="card-title">처리</strong>
                {splitPartners.length <= 1 ? (
                  <label className="field">
                    <span className="field-label">수동 매칭 사유</span>
                    <textarea value={manualReason} disabled={approvalPending || resolved} onChange={(event) => setManualReason(event.target.value)} />
                    <span className="support-text" data-density="support">승인자는 후보 계약·입금액·최근 입금 이력과 이 사유를 함께 확인합니다.</span>
                  </label>
                ) : null}
                {selected.approvalStatus ? (
                  <div role="status" aria-label="수동 연결 승인 상태" className="notice notice-info">
                    <span className="notice-icon" aria-hidden="true"><CheckCircle2 size={18} /></span>
                    <div className="notice-body">
                      <strong className="notice-title">{selected.approvalStatus}</strong>
                      <p>{selected.manualReason} · 요청 {selected.approvalRequestedBy} {selected.approvalRequestedAt}{selected.approvedBy ? ` · 승인 ${selected.approvedBy} ${selected.approvedAt}` : ""}</p>
                    </div>
                  </div>
                ) : null}
                <div className="inline">
                  <button
                    type="button"
                    className="primary-button unmatched-business-action"
                    data-guide-active={recommendedAction === "request" ? "true" : undefined}
                    disabled={resolved || approvalPending || !targetContractId || !manualReason.trim() || splitPartners.length > 1}
                    onClick={() => targetContractId && actions.requestManualMatchApproval(selected.id, targetContractId, manualReason)}
                  >
                    <Link2 size={16} aria-hidden="true" />
                    수동 연결 승인 요청
                  </button>
                  <button
                    type="button"
                    className="primary-button unmatched-business-action"
                    data-guide-active={recommendedAction === "approve" ? "true" : undefined}
                    disabled={!approvalPending || resolved}
                    onClick={() => actions.approveManualMatch(selected.id)}
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    수동 연결 승인
                  </button>
                  <button
                    type="button"
                    className="ghost-button unmatched-business-action"
                    data-guide-active={recommendedAction === "merge" ? "true" : undefined}
                    disabled={resolved || splitPartners.length < 2 || !targetContractId}
                    onClick={() =>
                      targetContractId &&
                      actions.mergeSplitTxs(
                        splitPartners.map((tx) => tx.id),
                        targetContractId,
                      )
                    }
                  >
                    <Sigma size={16} aria-hidden="true" />
                    분할 입금 합산
                  </button>
                  <button
                    type="button"
                    className="ghost-button unmatched-business-action"
                    data-guide-active={recommendedAction === "save-alias" ? "true" : undefined}
                    disabled={aliasSaved || !resolved || !selected.contractId || !targetCustomer}
                    onClick={() =>
                      targetCustomer && actions.saveAlias(selected.id, targetCustomer.id)
                    }
                  >
                    <Save size={16} aria-hidden="true" />
                    등록 입금자명으로 저장
                  </button>
                  <button
                    type="button"
                    className="danger-button"
                    disabled={selected.status !== "검토 필요" || approvalPending}
                    onClick={() => actions.holdTx(selected.id)}
                  >
                    <PauseCircle size={16} aria-hidden="true" />
                    보류로 이관
                  </button>
                </div>
                {splitPartners.length > 1 && !resolved ? (
                  <p className="disabled-reason" data-density="support">
                    같은 입금자명으로 나뉘어 들어온 건이라 단건 연결 대신 합산으로 처리합니다.
                  </p>
                ) : null}
                {aliasSaved ? (
                  <p className="disabled-reason" data-density="support">
                    `{selected.payerName}`은 이미{" "}
                    {derived.customerById.get(
                      state.aliases.find((alias) => alias.payerName === selected.payerName)
                        ?.customerId ?? "",
                    )?.name ?? "다른 고객"}{" "}
                    등록 입금자명으로 저장되어 있습니다. 같은 이름이 두 곳에 있어 이 건은 금액과 계약 정보로
                    판정합니다.
                  </p>
                ) : null}
              </div>

              <div className="stack" data-gap="tight">
                <strong className="card-title">처리 결과</strong>
                <div role="status" aria-label="처리 결과">
                  {selected.status === "검토 필요" ? (
                    <p className="panel-note">
                      아직 판정하지 않았습니다. 수동 연결은 사유를 남겨 승인을 받은 뒤 계약과 입금 이력에 반영됩니다.
                    </p>
                  ) : (
                    <DescGrid
                      columns="2"
                      items={[
                        { label: "거래 상태", value: selected.status },
                        {
                          label: "연결 계약",
                          value: selected.contractId
                            ? `${selected.contractId} · ${derived.contractLabel(selected.contractId)}`
                            : "연결 없음",
                        },
                        {
                          label: "계약 만료일",
                          value: selected.contractId
                            ? (derived.contractById.get(selected.contractId)?.endDate ?? "-")
                            : "-",
                        },
                        {
                          label: "계약 상태",
                          value: selected.contractId
                            ? (derived.contractById.get(selected.contractId)?.status ?? "-")
                            : "-",
                        },
                        { label: "처리자", value: selected.handledBy ?? "-" },
                        { label: "처리 시각", value: selected.handledAt ?? "-" },
                      ]}
                    />
                  )}
                </div>
                {selected.contractId ? (
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => onNavigate("contracts")}
                  >
                    계약 화면에서 입금 이력 확인
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </>
          )}
          </Panel>
      </PanelRow>
    </div>
  );
}
