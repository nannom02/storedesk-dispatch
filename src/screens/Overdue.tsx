import { useState } from "react";
import { Calculator, FileText, Scale } from "lucide-react";

import {
  Badge,
  DescGrid,
  Modal,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { formatWon, overdueFee } from "../data/utils";
import { useStore } from "../store";

export default function Overdue({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  const { state, derived, actions } = useStore();
  const [selectedId, setSelectedId] = useState("SC-2025-0844");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(185000);
  const [adjustReason, setAdjustReason] = useState("8월 부분 입금 ₩100,000 반영");
  const [excessDays, setExcessDays] = useState(5);

  const rows = derived.overdueContracts;
  const selected = state.contracts.find((contract) => contract.id === selectedId);
  const customer = selected ? derived.customerOf(selected) : undefined;
  const fee = selected
    ? overdueFee(
        selected.unpaidPrincipal,
        selected.overdueDays,
        state.settings.overdueRatePercent,
        state.settings.overdueGraceDays,
      )
    : 0;
  const claims = state.documents.filter((doc) => doc.kind === "청구서");

  const accounts = [
    {
      name: "외상매출금",
      amount: derived.receivable,
      note: "연체 계약의 미납 원금과 연체료 합계",
    },
    {
      name: "미수금",
      amount: rows.reduce((sum, contract) => sum + contract.unpaidPrincipal, 0),
      note: "연체 원금만 집계",
    },
    {
      name: "미지급금",
      amount: 0,
      note: "보증금 반환 대기 없음",
    },
  ];

  return (
    <div className="screen">
      <PageHead
        kicker="정산 · 연체 판정과 청구"
        title="연체·정산"
        lead={`연체 ${rows.length}건의 연체료와 출고 초과 일수를 계산하고, 청구 금액을 조정한 사유와 처리자를 함께 남깁니다.`}
        actions={
          <button type="button" className="ghost-button" onClick={() => onNavigate("billing")}>
            결제·세금계산서 열기
          </button>
        }
      />

      <NoticeBar
        variant="attention"
        icon={<Scale size={18} />}
        title={`미수금 ${formatWon(derived.receivable)}`}
        action={
          <button type="button" className="notice-action" onClick={() => onNavigate("notifications")}>
            미납 안내 발송
          </button>
        }
      >
        연체료는 환경 설정의 연 {state.settings.overdueRatePercent}% 일할 계산과 유예{" "}
        {state.settings.overdueGraceDays}일 규칙을 적용합니다. 규칙을 바꾸면 이 금액이 즉시 다시 계산됩니다.
      </NoticeBar>

      <Panel
        title="연체 계약"
        description="대시보드의 연체 지표와 같은 목록입니다. 행의 조정 버튼으로 청구 금액을 바꾸면 합계가 함께 바뀝니다."
      >
        <TableWrap
          footer={
            <div className="inline" data-justify="between" style={{ width: "100%" }}>
              <span>연체 {rows.length}건</span>
              <span className="tabular" role="status" aria-label="연체 정산 요약">
                미납 원금 {formatWon(rows.reduce((sum, c) => sum + c.unpaidPrincipal, 0))} · 연체료{" "}
                {formatWon(
                  rows.reduce(
                    (sum, c) =>
                      sum +
                      overdueFee(
                        c.unpaidPrincipal,
                        c.overdueDays,
                        state.settings.overdueRatePercent,
                        state.settings.overdueGraceDays,
                      ),
                    0,
                  ),
                )}{" "}
                · 청구 합계 {formatWon(derived.receivable)}
              </span>
            </div>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">계약</th>
                <th scope="col">고객</th>
                <th scope="col" data-priority="low">만료일</th>
                <th scope="col">연체일</th>
                <th scope="col" className="numeric">미납 원금</th>
                <th scope="col" className="numeric">연체료</th>
                <th scope="col" className="numeric">청구 금액</th>
                <th scope="col">법적 절차</th>
                <th scope="col" aria-label="행 작업" />
              </tr>
            </thead>
            <tbody>
              {rows.map((contract) => {
                const owner = derived.customerOf(contract);
                const rowFee = overdueFee(
                  contract.unpaidPrincipal,
                  contract.overdueDays,
                  state.settings.overdueRatePercent,
                  state.settings.overdueGraceDays,
                );
                return (
                  <tr key={contract.id} aria-selected={contract.id === selectedId}>
                    <td data-label="계약">
                      <span className="cell-strong id-cell">{contract.id}</span>
                    </td>
                    <td data-label="고객">
                      {owner?.name}
                      <span className="cell-sub" data-density="support">{owner?.kind}</span>
                    </td>
                    <td data-label="만료일" data-priority="low" className="date-cell">{contract.endDate}</td>
                    <td data-label="연체일" className="tabular">{contract.overdueDays}일</td>
                    <td data-label="미납 원금" className="numeric amount tabular">
                      {formatWon(contract.unpaidPrincipal)}
                    </td>
                    <td data-label="연체료" className="numeric amount tabular">{formatWon(rowFee)}</td>
                    <td data-label="청구 금액" className="numeric amount tabular">
                      {formatWon(contract.unpaidPrincipal + rowFee)}
                    </td>
                    <td data-label="법적 절차">
                      {contract.legalCaseNo ? (
                        <Badge attention>{contract.legalCaseNo}</Badge>
                      ) : (
                        <StateText tone="neutral">해당 없음</StateText>
                      )}
                    </td>
                    <td data-label="작업">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${contract.id} 상세`}
                          onClick={() => setSelectedId(contract.id)}
                        >
                          상세
                        </button>
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${contract.id} 청구 금액 조정`}
                          onClick={() => {
                            setSelectedId(contract.id);
                            setAdjustAmount(Math.max(0, contract.unpaidPrincipal - 100000));
                            setAdjustOpen(true);
                          }}
                        >
                          조정
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <PanelRow columns="7-5">
        <Panel
          title={selected ? `${selected.id} 정산` : "정산"}
          description={
            selected
              ? `${customer?.name} · 연체 ${selected.overdueDays}일 · 만료 ${selected.endDate}`
              : "계약을 선택하세요."
          }
          actions={
            selected ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => actions.issueClaim(selected.id, selected.unpaidPrincipal + fee)}
              >
                <FileText size={16} aria-hidden="true" />
                연체 안내 청구서 발행
              </button>
            ) : null
          }
        >
          {selected ? (
            <>
              <DescGrid
                columns="3"
                items={[
                  { label: "미납 원금", value: formatWon(selected.unpaidPrincipal) },
                  {
                    label: "연체료",
                    value: `${formatWon(fee)} (연 ${state.settings.overdueRatePercent}% 일할)`,
                  },
                  { label: "청구 금액", value: formatWon(selected.unpaidPrincipal + fee) },
                  { label: "월 이용료", value: formatWon(selected.monthlyFee) },
                  { label: "보증금", value: formatWon(selected.deposit) },
                  {
                    label: "법적 절차",
                    value: selected.legalCaseNo ? `지급명령 ${selected.legalCaseNo}` : "해당 없음",
                  },
                ]}
              />

              <div className="stack" data-gap="tight">
                <strong className="card-title">출고 초과 일수 정산</strong>
                <div className="filter-bar">
                  <label className="field" style={{ maxWidth: "180px" }}>
                    <span className="field-label">초과 일수</span>
                    <select
                      value={excessDays}
                      onChange={(event) => setExcessDays(Number(event.target.value))}
                    >
                      <option value={3}>3일</option>
                      <option value={5}>5일</option>
                      <option value={10}>10일</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => actions.settleExcessDays(selected.id, excessDays)}
                  >
                    <Calculator size={16} aria-hidden="true" />
                    출고 초과 일수 정산
                  </button>
                  <span className="panel-note">
                    월 이용료를 30일로 나눈 일할 금액 ×{" "}
                    {excessDays}일 = {formatWon(Math.round((selected.monthlyFee / 30) * excessDays))}을
                    청구액에 가산합니다.
                  </span>
                </div>
              </div>

              <div className="stack" data-gap="tight">
                <strong className="card-title">입금 이력</strong>
                <TableWrap>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">입금일</th>
                        <th scope="col">입금자명</th>
                        <th scope="col" className="numeric">금액</th>
                        <th scope="col">비고</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td data-label="입금일" className="date-cell">{payment.date}</td>
                          <td data-label="입금자명">{payment.payerName}</td>
                          <td data-label="금액" className="numeric amount tabular">
                            {formatWon(payment.amount)}
                          </td>
                          <td data-label="비고">{payment.note ?? payment.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            </>
          ) : (
            <p className="panel-note">목록에서 연체 계약을 선택하세요.</p>
          )}
        </Panel>

        <div className="stack">
          <Panel title="회계 계정 항목" description="계정별 잔액은 위 목록에서 그대로 계산합니다.">
            <TableWrap>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">계정</th>
                    <th scope="col" className="numeric">잔액</th>
                    <th scope="col">산출 기준</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.name}>
                      <td data-label="계정">
                        <span className="cell-strong">{account.name}</span>
                      </td>
                      <td data-label="잔액" className="numeric amount tabular">
                        {formatWon(account.amount)}
                      </td>
                      <td data-label="산출 기준">{account.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel
            title="발행한 청구서"
            description={`${claims.length}건 발행 · 발행 즉시 문서 보관함과 발송 대상에 반영됩니다.`}
          >
            <div role="status" aria-label="발행한 청구서">
              {claims.length === 0 ? (
                <p className="panel-note">아직 발행한 연체 청구서가 없습니다.</p>
              ) : (
                <ul className="record-list">
                  {claims.map((claim) => (
                    <li key={claim.id}>
                      <div className="record-list-head">
                        <strong>{claim.title}</strong>
                        <span className="record-meta" data-density="support">{claim.createdAt}</span>
                      </div>
                      <p>
                        {claim.id} · {claim.contractId} · {claim.template} 양식 · 작성 {claim.uploadedBy}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="button" className="quiet-button" onClick={() => onNavigate("documents")}>
              문서 보관함 열기
            </button>
          </Panel>
        </div>
      </PanelRow>

      {adjustOpen && selected ? (
        <Modal
          title="청구 금액 조정"
          description={`${selected.id} · ${customer?.name}. 조정 사유와 처리자가 함께 기록됩니다.`}
          onClose={() => setAdjustOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setAdjustOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  actions.adjustCharge(selected.id, adjustAmount, adjustReason);
                  setAdjustOpen(false);
                }}
              >
                조정 저장
              </button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">조정 후 미납 원금</span>
              <input
                type="number"
                value={adjustAmount}
                onChange={(event) => setAdjustAmount(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span className="field-label">조정 사유</span>
              <input value={adjustReason} onChange={(event) => setAdjustReason(event.target.value)} />
            </label>
          </div>
          <p className="panel-note">
            현재 미납 원금 {formatWon(selected.unpaidPrincipal)} · 연체료 {formatWon(fee)}. 저장하면
            미수금 합계와 대시보드 지표가 함께 다시 계산됩니다.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
