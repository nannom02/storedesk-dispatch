import { useState } from "react";
import { CreditCard, RefreshCcw, Receipt, Wallet } from "lucide-react";

import {
  DescGrid,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { formatWon } from "../data/utils";
import { useStore } from "../store";

export default function Billing() {
  const { state, derived, actions } = useStore();
  const [selectedIds, setSelectedIds] = useState<string[]>(["BL-2609-001", "BL-2609-002"]);

  const pending = state.billingItems.filter((item) => item.invoiceStatus === "발행 대기");
  const failed = state.billingItems.filter((item) => item.invoiceStatus === "발행 실패");
  const recurring = state.billingItems.filter((item) => item.recurring);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="screen">
      <PageHead
        kicker="정산 · 결제선생 · 센드빌 연동"
        title="결제·세금계산서"
        lead="카드 결제 요청과 통장 입금 확인을 2단계로 처리하고, 매달 반복 청구 대상을 승인해 세금계산서를 일괄 발행합니다. 실패 건은 사유와 재시도 이력이 함께 남습니다."
      />

      {failed.length > 0 ? (
        <NoticeBar
          variant="attention"
          title={`세금계산서 발행 실패 ${failed.length}건`}
          action={
            <button
              type="button"
              className="notice-action"
              onClick={() => actions.retryInvoice(failed[0].id)}
            >
              발행 실패 재처리
            </button>
          }
        >
          {failed[0].failReason} · 재시도 {failed[0].retryCount}회. 인증서를 갱신한 뒤 재처리하면
          접수번호가 새로 발급됩니다.
        </NoticeBar>
      ) : (
        <NoticeBar variant="info" title="세금계산서 발행 실패 없음">
          모든 발행 건이 정상 처리되었습니다. 발행 이력에서 접수번호를 확인할 수 있습니다.
        </NoticeBar>
      )}

      <div className="integration-grid">
        <div className="integration-card">
          <div className="integration-card-head">
            <strong>결제선생 · 카드 결제</strong>
            <StateText tone="ok">연결됨</StateText>
          </div>
          <p>
            테스트 키로 요청·승인·취소를 확인했습니다. 운영 키 검수는 착수 후 발주사 계정으로
            진행합니다.
          </p>
          <span className="record-meta" data-density="support">
            최근 응답 · {state.billingItems.find((item) => item.cardResponse)?.cardResponse ?? "요청 이력 없음"}
          </span>
        </div>
        <div className="integration-card">
          <div className="integration-card-head">
            <strong>센드빌 · 세금계산서</strong>
            <StateText tone={failed.length > 0 ? "bad" : "ok"}>
              {failed.length > 0 ? "인증서 만료" : "연결됨"}
            </StateText>
          </div>
          <p>
            공동인증서로 발행·상태 조회를 연동합니다. 인증서 만료는 실패 사유와 함께 표시되고
            재처리로 복구합니다.
          </p>
          <span className="record-meta" data-density="support">
            발행 대기 {pending.length}건 · 실패 {failed.length}건
          </span>
        </div>
      </div>

      <Panel
        title="청구·발행 대상"
        description="미수 → 통장 입금 확인 → 입금 완료 2단계와 세금계산서 발행 상태를 함께 관리합니다."
        actions={
          <button
            type="button"
            className="primary-button"
            disabled={selectedIds.length === 0}
            onClick={() => actions.issueInvoices(selectedIds)}
          >
            <Receipt size={16} aria-hidden="true" />
            선택 건 일괄 발행
          </button>
        }
      >
        <TableWrap
          footer={
            <>
              <span role="status" aria-label="청구 발행 요약">
                전체 {state.billingItems.length}건 · 발행 대기 {pending.length} / 실패 {failed.length} ·
                선택 {selectedIds.length}건
              </span>
              <span className="tabular">
                청구 합계 {formatWon(state.billingItems.reduce((sum, item) => sum + item.amount, 0))}
              </span>
            </>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">선택</th>
                <th scope="col">청구</th>
                <th scope="col">고객 · 계약</th>
                <th scope="col" data-priority="low">대상 기간</th>
                <th scope="col" className="numeric">금액</th>
                <th scope="col">입금 단계</th>
                <th scope="col">세금계산서</th>
                <th scope="col" aria-label="행 작업" />
              </tr>
            </thead>
            <tbody>
              {state.billingItems.map((item) => {
                const contract = derived.contractById.get(item.contractId);
                const customer = contract ? derived.customerOf(contract) : undefined;
                return (
                  <tr key={item.id} aria-selected={selectedIds.includes(item.id)}>
                    <td data-label="선택">
                      <label className="inline">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggle(item.id)}
                          aria-label={`${item.id} 발행 대상 선택`}
                        />
                        <span className="visually-hidden">발행 대상 선택</span>
                      </label>
                    </td>
                    <td data-label="청구">
                      <span className="cell-strong id-cell">{item.id}</span>
                      <span className="cell-sub" data-density="support">
                        {item.recurring ? "매달 반복 청구" : "단건 청구"}
                      </span>
                    </td>
                    <td data-label="고객 · 계약">
                      {customer?.name}
                      <span className="cell-sub id-cell" data-density="support">{item.contractId}</span>
                    </td>
                    <td data-label="대상 기간" data-priority="low">{item.period}</td>
                    <td data-label="금액" className="numeric amount tabular">{formatWon(item.amount)}</td>
                    <td data-label="입금 단계">
                      <StateText
                        tone={
                          item.billingStatus === "입금 완료" || item.billingStatus === "카드 승인"
                            ? "ok"
                            : item.billingStatus === "통장 입금 확인"
                              ? "info"
                              : "warn"
                        }
                      >
                        {item.billingStatus}
                      </StateText>
                      {item.cashReceipt ? (
                        <span className="cell-sub" data-density="support">현금영수증 발행 완료</span>
                      ) : null}
                    </td>
                    <td data-label="세금계산서">
                      <StateText
                        tone={
                          item.invoiceStatus === "발행 완료"
                            ? "ok"
                            : item.invoiceStatus === "발행 실패"
                              ? "bad"
                              : "warn"
                        }
                      >
                        {item.invoiceStatus}
                      </StateText>
                      <span className="cell-sub" data-density="support">
                        {item.invoiceNo
                          ? `접수번호 ${item.invoiceNo}`
                          : (item.failReason ?? "승인 후 발행")}
                      </span>
                    </td>
                    <td data-label="작업">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${item.id} 통장 입금 확인`}
                          disabled={item.billingStatus === "입금 완료"}
                          onClick={() => actions.confirmBankDeposit(item.id)}
                        >
                          입금 확인
                        </button>
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${item.id} 카드 결제 요청`}
                          disabled={item.billingStatus === "카드 승인"}
                          onClick={() => actions.requestCardPayment(item.id)}
                        >
                          카드 요청
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

      <PanelRow columns="2">
        <Panel
          title="2단계 입금 처리와 카드 결제"
          description="화면의 두 버튼이 실제 상태를 바꿉니다."
          actions={
            <>
              <button
                type="button"
                className="primary-button"
                onClick={() => actions.confirmBankDeposit("BL-2609-001")}
              >
                <Wallet size={16} aria-hidden="true" />
                통장 입금 확인
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={() => actions.requestCardPayment("BL-2609-001")}
              >
                <CreditCard size={16} aria-hidden="true" />
                카드 결제 요청
              </button>
            </>
          }
        >
          <div role="status" aria-label="선택 청구 처리 상태">
            <DescGrid
              columns="2"
              items={[
                {
                  label: "대상 청구",
                  value: `BL-2609-001 · ${derived.contractLabel(
                    state.billingItems.find((item) => item.id === "BL-2609-001")?.contractId ?? null,
                  )}`,
                },
                {
                  label: "현재 입금 단계",
                  value:
                    state.billingItems.find((item) => item.id === "BL-2609-001")?.billingStatus ??
                    "-",
                },
                {
                  label: "카드 결제 응답",
                  value:
                    state.billingItems.find((item) => item.id === "BL-2609-001")?.cardResponse ??
                    "요청 전",
                },
                {
                  label: "현금영수증",
                  value: state.billingItems.find((item) => item.id === "BL-2609-001")?.cashReceipt
                    ? "발행 완료"
                    : "입금 완료 시 자동 발행",
                },
              ]}
            />
          </div>
          <p className="panel-note">
            미수 상태에서 `통장 입금 확인`을 누르면 확인 단계로, 한 번 더 누르면 입금 완료로 바뀌고
            현금영수증 발행이 연동됩니다.
          </p>
        </Panel>

        <Panel
          title="매달 반복 청구 대상"
          description={`${recurring.length}건이 매달 자동으로 발행 대기 목록에 올라옵니다.`}
          actions={
            failed.length > 0 ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => actions.retryInvoice(failed[0].id)}
              >
                <RefreshCcw size={16} aria-hidden="true" />
                발행 실패 재처리
              </button>
            ) : null
          }
        >
          <ul className="record-list">
            {recurring.map((item) => (
              <li key={item.id}>
                <div className="record-list-head">
                  <strong>
                    {derived.contractLabel(item.contractId)} · {item.period}
                  </strong>
                  <StateText tone={item.invoiceStatus === "발행 완료" ? "ok" : "warn"}>
                    {item.invoiceStatus}
                  </StateText>
                </div>
                <p>
                  {formatWon(item.amount)} · {item.contractId}
                  {item.invoiceNo ? ` · 접수번호 ${item.invoiceNo}` : ""}
                  {item.retryCount > 0 ? ` · 재시도 ${item.retryCount}회` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </PanelRow>
    </div>
  );
}
