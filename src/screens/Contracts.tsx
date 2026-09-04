import { useState } from "react";
import { CalendarClock, Plus, Search, Trash2 } from "lucide-react";

import {
  Badge,
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
import { daysBetween, formatDday, formatWon } from "../data/utils";
import type { Contract } from "../data/types";
import { readNavigationContext } from "../navigation";
import type { Navigate } from "../navigation";
import { useStore } from "../store";

const PAYMENT_MONTHS = ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09"];

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "정상", label: "정상" },
  { id: "연체", label: "연체" },
  { id: "만료", label: "만료" },
  { id: "중도 해지", label: "중도 해지" },
];

type ContractForm = Pick<
  Contract,
  | "customerId"
  | "warehouseId"
  | "containerNo"
  | "startDate"
  | "endDate"
  | "monthlyFee"
  | "discount"
  | "deposit"
  | "payMethod"
>;

export default function Contracts({ onNavigate }: { onNavigate: Navigate }) {
  const { state, derived, actions } = useStore();
  const focus = readNavigationContext();
  const focusedUnit = state.containers.find(
    (unit) =>
      unit.no === focus.containerNo &&
      (!focus.warehouseId || unit.warehouseId === focus.warehouseId),
  );
  const focusedRealContract =
    state.contracts.find((contract) => contract.id === focus.contractId) ??
    state.contracts.find(
      (contract) =>
        contract.containerNo === focus.containerNo &&
        (!focus.warehouseId || contract.warehouseId === focus.warehouseId),
    );
  const focusedSnapshot = !focusedRealContract ? focusedUnit?.occupancyDetail : undefined;
  const focusedSnapshotContract: Contract | undefined = focusedSnapshot
    ? {
        id: focusedSnapshot.contractId,
        customerId: `SNAPSHOT-${focusedUnit?.id ?? focusedSnapshot.contractId}`,
        warehouseId: focusedUnit?.warehouseId ?? focus.warehouseId ?? "WH-1",
        containerNo: focusedUnit?.no ?? focus.containerNo ?? "-",
        startDate: focusedSnapshot.startDate,
        endDate: focusedSnapshot.endDate,
        monthlyFee: focusedSnapshot.monthlyFee,
        discount: 0,
        deposit: focusedSnapshot.monthlyFee,
        payMethod: "계좌이체",
        status: focusedSnapshot.contractStatus,
        overdueDays: 0,
        unpaidPrincipal:
          focusedSnapshot.contractStatus === "연체" ? focusedSnapshot.monthlyFee : 0,
        driver: focusedSnapshot.manager.split("·").at(-1)?.trim(),
        payments: [],
      }
    : undefined;
  const allContracts = focusedSnapshotContract
    ? [focusedSnapshotContract, ...state.contracts]
    : state.contracts;
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState(focus.containerNo ?? focus.contractId ?? "");
  const [selectedId, setSelectedId] = useState(
    focusedRealContract?.id ?? focusedSnapshotContract?.id ?? "SC-2026-0412",
  );
  const [months, setMonths] = useState(6);
  const [contractModal, setContractModal] = useState<"create" | "edit" | null>(null);
  const [contractError, setContractError] = useState("");
  const [contractResult, setContractResult] = useState("");
  const [contractForm, setContractForm] = useState<ContractForm>({
    customerId: state.customers[0]?.id ?? "",
    warehouseId: state.containers.find((unit) => unit.occupancyStatus === "available")?.warehouseId ?? "WH-1",
    containerNo: state.containers.find((unit) => unit.occupancyStatus === "available")?.no ?? "",
    startDate: TODAY,
    endDate: "2027-03-04",
    monthlyFee: 180000,
    discount: 0,
    deposit: 180000,
    payMethod: "계좌이체",
  });

  const customerNameOf = (contract: Contract) =>
    contract.id === focusedSnapshotContract?.id
      ? focusedSnapshot?.customerName
      : derived.customerOf(contract)?.name;
  const customerKindOf = (contract: Contract) =>
    contract.id === focusedSnapshotContract?.id
      ? focusedSnapshot?.customerKind
      : derived.customerOf(contract)?.kind;

  const rows = (() => {
    const term = keyword.trim();
    return allContracts.filter((contract) => {
      if (filter !== "all" && contract.status !== filter) return false;
      if (!term) return true;
      return (
        contract.id.includes(term) ||
        contract.containerNo.includes(term) ||
        (customerNameOf(contract)?.includes(term) ?? false)
      );
    });
  })();

  const selected = allContracts.find((contract) => contract.id === selectedId);
  const selectedIsSnapshot = selected?.id === focusedSnapshotContract?.id;
  const selectedCustomerName = selected ? customerNameOf(selected) : undefined;
  const warehouse = selected ? derived.warehouseById.get(selected.warehouseId) : undefined;
  const counts = {
    all: allContracts.length,
    정상: allContracts.filter((c) => c.status === "정상").length,
    연체: allContracts.filter((c) => c.status === "연체").length,
    만료: allContracts.filter((c) => c.status === "만료").length,
    "중도 해지": allContracts.filter((c) => c.status === "중도 해지").length,
  };

  const openCreateContract = () => {
    const available = state.containers.find((unit) => unit.occupancyStatus === "available");
    setContractForm({
      customerId: state.customers[0]?.id ?? "",
      warehouseId: available?.warehouseId ?? "WH-1",
      containerNo: available?.no ?? "",
      startDate: TODAY,
      endDate: "2027-03-04",
      monthlyFee: 180000,
      discount: 0,
      deposit: 180000,
      payMethod: "계좌이체",
    });
    setContractError("");
    setContractModal("create");
  };

  const openEditContract = () => {
    if (!selected || selectedIsSnapshot) return;
    setContractForm({
      customerId: selected.customerId,
      warehouseId: selected.warehouseId,
      containerNo: selected.containerNo,
      startDate: selected.startDate,
      endDate: selected.endDate,
      monthlyFee: selected.monthlyFee,
      discount: selected.discount,
      deposit: selected.deposit,
      payMethod: selected.payMethod,
    });
    setContractError("");
    setContractModal("edit");
  };

  const saveContract = () => {
    if (!contractForm.customerId || !contractForm.containerNo || !contractForm.startDate || !contractForm.endDate) {
      setContractError("고객·컨테이너·계약 기간을 모두 선택해 주십시오.");
      return;
    }
    if (contractForm.endDate < contractForm.startDate) {
      setContractError("계약 종료일은 시작일보다 빠를 수 없습니다.");
      return;
    }
    if (contractModal === "create") {
      const id = actions.createContract(contractForm);
      setSelectedId(id);
      setFilter("all");
      setKeyword("");
      setContractResult(`${id} 신규 계약을 등록했습니다.`);
    } else if (selected) {
      actions.updateContract(selected.id, contractForm);
      setContractResult(`${selected.id} 계약 전체 정보를 저장했습니다.`);
    }
    setContractModal(null);
  };

  const containerOptions = state.containers.filter(
    (unit) =>
      unit.warehouseId === contractForm.warehouseId &&
      (unit.occupancyStatus === "available" || unit.contractId === selected?.id),
  );

  return (
    <div className="screen">
      <PageHead
        kicker="운영 · 계약 원장"
        title="계약"
        lead="계약 기간·이용료·보증금·결제 구분과 입금 이력을 한 곳에서 확인하고, 기간을 바꾸면 만료일과 상태가 함께 다시 계산됩니다."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => onNavigate("deposits")}>
              입금 계약 자동 대조 열기
            </button>
            <button type="button" className="primary-button" onClick={openCreateContract}>
              <Plus size={16} aria-hidden="true" /> 신규 계약
            </button>
          </>
        }
      />

      <Panel>
        {contractResult ? <p className="panel-note" role="status" aria-label="계약 처리 결과">{contractResult}</p> : null}
        {focus.containerNo && selected ? (
          <div role="status" aria-label={`${focus.containerNo} 연결 계약`}>
            <NoticeBar
              title={`${focus.containerNo} 연결 계약을 표시합니다`}
              action={
                <button type="button" className="notice-action" onClick={() => onNavigate("contracts")}>
                  전체 계약 보기
                </button>
              }
            >
              {selectedCustomerName} · {selected.id} · {warehouse?.name} · 계약 상태 {selected.status}
            </NoticeBar>
          </div>
        ) : null}
        <div className="filter-bar">
          <ChipGroup label="계약 상태" options={FILTERS} value={filter} onChange={setFilter} />
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">계약 검색</span>
            <input
              type="search"
              value={keyword}
              placeholder="계약번호 · 고객명 · 컨테이너 번호"
              onChange={(event) => setKeyword(event.target.value)}
            />
          </label>
          <span className="panel-note" role="status" aria-label="계약 목록 요약">
            전체 {counts.all}건 중 {rows.length}건 표시 · 정상 {counts["정상"]} / 연체 {counts["연체"]} /
            만료 {counts["만료"]} / 중도 해지 {counts["중도 해지"]}
          </span>
        </div>

        <TableWrap
          footer={
            <>
              <span>{rows.length}건 표시</span>
              <span className="tabular">
                월 이용료 합계 {formatWon(rows.reduce((sum, c) => sum + c.monthlyFee - c.discount, 0))}
              </span>
            </>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">계약</th>
                <th scope="col">고객</th>
                <th scope="col">창고 · 컨테이너</th>
                <th scope="col" data-priority="low">계약 기간</th>
                <th scope="col" className="numeric">월 이용료</th>
                <th scope="col">상태</th>
                <th scope="col">만료</th>
                <th scope="col" aria-label="행 작업" />
              </tr>
            </thead>
            <tbody>
              {rows.map((contract) => {
                const home = derived.warehouseById.get(contract.warehouseId);
                const remaining = daysBetween(TODAY, contract.endDate);
                return (
                  <tr key={contract.id} aria-selected={contract.id === selectedId}>
                    <td data-label="계약">
                      <span className="cell-strong id-cell">{contract.id}</span>
                      <span className="cell-sub" data-density="support">
                        {contract.payMethod}
                      </span>
                    </td>
                    <td data-label="고객">
                      {customerNameOf(contract)}
                      <span className="cell-sub" data-density="support">{customerKindOf(contract)}</span>
                    </td>
                    <td data-label="창고 · 컨테이너">
                      {home?.name}
                      <span className="cell-sub" data-density="support">{contract.containerNo}</span>
                    </td>
                    <td data-label="계약 기간" data-priority="low" className="date-cell">
                      {contract.startDate} ~ {contract.endDate}
                    </td>
                    <td data-label="월 이용료" className="numeric amount tabular">
                      {formatWon(contract.monthlyFee - contract.discount)}
                    </td>
                    <td data-label="상태">
                      <StateText
                        tone={
                          contract.status === "정상"
                            ? "ok"
                            : contract.status === "연체"
                              ? "bad"
                              : contract.status === "만료"
                                ? "warn"
                                : "neutral"
                        }
                      >
                        {contract.status}
                        {contract.status === "연체" ? ` ${contract.overdueDays}일` : ""}
                      </StateText>
                    </td>
                    <td data-label="만료">
                      {contract.status === "중도 해지" ? (
                        <span className="muted">종료 {contract.endDate}</span>
                      ) : (
                        <span className="dday">{formatDday(remaining)}</span>
                      )}
                    </td>
                    <td data-label="작업">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${contract.id} 계약 상세`}
                          onClick={() => setSelectedId(contract.id)}
                        >
                          상세
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
          title={selected ? `${selected.id} 계약 상세` : "계약 상세"}
          description={
            selected
              ? `${selectedCustomerName} · ${warehouse?.name} ${selected.containerNo}`
              : "계약을 선택하세요."
          }
          actions={
            selected && !selectedIsSnapshot ? (
              <button type="button" className="ghost-button" onClick={openEditContract}>
                계약 전체 정보 수정
              </button>
            ) : null
          }
        >
          <div role="status" aria-label="계약 상세">
            {selected ? (
              <DescGrid
                columns="3"
                items={[
                  { label: "계약 기간", value: `${selected.startDate} ~ ${selected.endDate}` },
                  {
                    label: "남은 기간",
                    value:
                      selected.status === "중도 해지"
                        ? "종료"
                        : formatDday(daysBetween(TODAY, selected.endDate)),
                  },
                  { label: "계약 상태", value: selected.status },
                  { label: "월 이용료", value: formatWon(selected.monthlyFee) },
                  { label: "할인", value: selected.discount ? formatWon(selected.discount) : "없음" },
                  { label: "보증금", value: formatWon(selected.deposit) },
                  { label: "결제 구분", value: selected.payMethod },
                  { label: "최근 운송 담당", value: selected.driver ?? "미배정" },
                  {
                    label: "법적 절차",
                    value: selected.legalCaseNo ? `지급명령 ${selected.legalCaseNo}` : "해당 없음",
                  },
                ]}
              />
            ) : (
              <p className="panel-note">왼쪽 목록에서 계약을 선택하면 상세와 입금 이력이 표시됩니다.</p>
            )}
          </div>

          {selected && !selectedIsSnapshot ? (
            <>
              <div className="stack" data-gap="tight">
                <strong className="card-title">계약 기간 변경</strong>
                <div className="filter-bar">
                  <label className="field" style={{ maxWidth: "180px" }}>
                    <span className="field-label">연장 개월</span>
                    <select
                      value={months}
                      onChange={(event) => setMonths(Number(event.target.value))}
                    >
                      <option value={1}>1개월</option>
                      <option value={3}>3개월</option>
                      <option value={6}>6개월</option>
                      <option value={12}>12개월</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => actions.extendContract(selected.id, months)}
                  >
                    <CalendarClock size={16} aria-hidden="true" />
                    계약 기간 저장
                  </button>
                  <span className="panel-note">
                    저장하면 만료일 {selected.endDate} 기준으로 자동 재계산되고 처리 이력이 남습니다.
                  </span>
                </div>
              </div>

              <div className="stack" data-gap="tight">
                <strong className="card-title">입금 이력 · 월별 입금 기록</strong>
                <TableWrap
                  footer={
                    <>
                      <span>{selected.payments.length}건</span>
                      <span className="tabular">
                        누적 {formatWon(selected.payments.reduce((sum, p) => sum + p.amount, 0))}
                      </span>
                    </>
                  }
                >
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th scope="col">입금일</th>
                        <th scope="col">입금자명</th>
                        <th scope="col" className="numeric">금액</th>
                        <th scope="col">처리 방식</th>
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
                          <td data-label="처리 방식">
                            <StateText tone={payment.source === "자동 매칭" ? "ok" : "info"}>
                              {payment.source}
                            </StateText>
                          </td>
                          <td data-label="비고">{payment.note ?? "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
                <div className="payment-year-grid" role="status" aria-label="최근 12개월 입금 기록">
                  {PAYMENT_MONTHS.map((month, index) => {
                    const payment = selected.payments.find((item) => item.date.startsWith(month));
                    return (
                      <div key={month} data-paid={payment ? "true" : undefined}>
                        <span>{month.slice(5)}월</span>
                        <strong>{payment ? formatWon(payment.amount) : "기록 없음"}</strong>
                        <small>{payment?.note ?? (index === PAYMENT_MONTHS.length - 1 ? "최종 확인 메모: 자동 대조 예정" : "-")}</small>
                      </div>
                    );
                  })}
                </div>
                <p className="panel-note">최종 입금 금액 {formatWon(selected.payments[0]?.amount ?? 0)} · 메모 {selected.payments[0]?.note ?? "정상 입금 확인"}</p>
              </div>
            </>
          ) : selectedIsSnapshot ? (
            <p className="panel-note">
              기존 원장에서 이관할 계약의 조회 예시입니다. 원장 이관 후에는 같은 화면에서 기간 변경과
              월별 입금 이력을 함께 관리합니다.
            </p>
          ) : null}
        </Panel>

        <div className="stack">
          <Panel title="종료 구분" description="정상 종료와 중도 해지·연체 종료를 구분해 관리합니다.">
            <ul className="record-list">
              {state.contracts
                .filter((contract) => contract.status === "중도 해지" || contract.status === "연체")
                .map((contract) => {
                  const owner = derived.customerOf(contract);
                  return (
                    <li key={contract.id}>
                      <div className="record-list-head">
                        <strong>
                          {owner?.name} · {contract.id}
                        </strong>
                        {contract.legalCaseNo ? (
                          <Badge attention>법적 절차 진행</Badge>
                        ) : (
                          <StateText tone={contract.status === "연체" ? "bad" : "neutral"}>
                            {contract.status === "연체" ? "연체 종료 예정" : "정상 종료"}
                          </StateText>
                        )}
                      </div>
                      <p>
                        {contract.closeReason ?? `연체 ${contract.overdueDays}일 · 미납 ${formatWon(contract.unpaidPrincipal)}`}
                        {contract.legalCaseNo ? ` · 사건번호 ${contract.legalCaseNo}` : ""}
                      </p>
                    </li>
                  );
                })}
            </ul>
          </Panel>

          <Panel title="운송업체·입출고 내역" description="배정된 외부 운송업체와 처리 시각, 비용 기록을 계약별로 확인합니다.">
            <ul className="record-list">
              {state.movements
                .filter((movement) => movement.contractId === selectedId)
                .map((movement) => (
                  <li key={movement.id}>
                    <div className="record-list-head">
                      <strong>
                        {movement.kind} · {movement.id}
                      </strong>
                      <span className="record-meta" data-density="support">
                        {movement.scheduledDate}
                      </span>
                    </div>
                    <p>
                      {movement.team} · {movement.vendorName ?? "운송업체 미배정"} · 담당 {movement.driver} ·{" "}
                      {movement.done
                        ? `완료 ${movement.handledAt ?? ""}`
                        : "진행 중"}
                    </p>
                  </li>
                ))}
              {state.movements.filter((movement) => movement.contractId === selectedId).length === 0 ? (
                <li>
                  <p>이 계약에 등록된 운송 내역이 없습니다.</p>
                </li>
              ) : null}
            </ul>
            <button type="button" className="quiet-button" onClick={() => onNavigate("movements")}>
              입출고 관리 열기
            </button>
            <button type="button" className="quiet-button" onClick={() => onNavigate("transport")}>
              운송 배정·작업지시 열기
            </button>
          </Panel>
        </div>
      </PanelRow>

      {contractModal ? (
        <Modal
          title={contractModal === "create" ? "신규 계약 등록" : `${selected?.id ?? "계약"} 전체 정보 수정`}
          description="고객·창고·컨테이너·기간·금액·결제수단을 한 번에 저장하며 배정 원장도 함께 갱신합니다."
          onClose={() => setContractModal(null)}
          actions={
            <>
              {contractModal === "edit" && selected ? (
                <button
                  type="button"
                  className="danger-button"
                  disabled={
                    state.movements.some((item) => item.contractId === selected.id) ||
                    state.billingItems.some((item) => item.contractId === selected.id) ||
                    state.documents.some((item) => item.contractId === selected.id)
                  }
                  title="입출고·결제·문서 이력이 없는 계약만 삭제할 수 있습니다."
                  onClick={() => {
                    actions.deleteContract(selected.id);
                    setContractResult(`${selected.id} 계약을 삭제하고 컨테이너를 반환했습니다.`);
                    setSelectedId(state.contracts.find((item) => item.id !== selected.id)?.id ?? "");
                    setContractModal(null);
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" /> 계약 삭제
                </button>
              ) : null}
              <button type="button" className="ghost-button" onClick={() => setContractModal(null)}>취소</button>
              <button type="button" className="primary-button" onClick={saveContract}>
                {contractModal === "create" ? "신규 계약 저장" : "계약 전체 정보 저장"}
              </button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">고객</span>
              <select value={contractForm.customerId} onChange={(event) => setContractForm((form) => ({ ...form, customerId: event.target.value }))}>
                {state.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.id}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">창고</span>
              <select
                value={contractForm.warehouseId}
                onChange={(event) => {
                  const warehouseId = event.target.value;
                  const first = state.containers.find((unit) => unit.warehouseId === warehouseId && unit.occupancyStatus === "available");
                  setContractForm((form) => ({ ...form, warehouseId, containerNo: first?.no ?? "" }));
                }}
              >
                {derived.warehouseById.size ? Array.from(derived.warehouseById.values()).map((item) => <option key={item.id} value={item.id}>{item.name}</option>) : null}
              </select>
            </label>
            <label className="field">
              <span className="field-label">컨테이너</span>
              <select value={contractForm.containerNo} onChange={(event) => setContractForm((form) => ({ ...form, containerNo: event.target.value }))}>
                {containerOptions.map((unit) => <option key={unit.id} value={unit.no}>{unit.no} · {unit.size}</option>)}
              </select>
            </label>
            <label className="field"><span className="field-label">계약 시작일</span><input type="date" value={contractForm.startDate} onChange={(event) => setContractForm((form) => ({ ...form, startDate: event.target.value }))} /></label>
            <label className="field"><span className="field-label">계약 종료일</span><input type="date" value={contractForm.endDate} onChange={(event) => setContractForm((form) => ({ ...form, endDate: event.target.value }))} /></label>
            <label className="field"><span className="field-label">월 이용료</span><input type="number" value={contractForm.monthlyFee} onChange={(event) => setContractForm((form) => ({ ...form, monthlyFee: Number(event.target.value) }))} /></label>
            <label className="field"><span className="field-label">할인</span><input type="number" value={contractForm.discount} onChange={(event) => setContractForm((form) => ({ ...form, discount: Number(event.target.value) }))} /></label>
            <label className="field"><span className="field-label">보증금</span><input type="number" value={contractForm.deposit} onChange={(event) => setContractForm((form) => ({ ...form, deposit: Number(event.target.value) }))} /></label>
            <label className="field">
              <span className="field-label">결제 구분</span>
              <select value={contractForm.payMethod} onChange={(event) => setContractForm((form) => ({ ...form, payMethod: event.target.value as Contract["payMethod"] }))}>
                <option value="계좌이체">계좌이체</option><option value="카드(결제선생)">카드(결제선생)</option><option value="현금">현금</option>
              </select>
            </label>
          </div>
          {contractError ? <p className="form-error" role="alert">{contractError}</p> : null}
          {contractModal === "edit" && selected && (state.movements.some((item) => item.contractId === selected.id) || state.billingItems.some((item) => item.contractId === selected.id) || state.documents.some((item) => item.contractId === selected.id)) ? (
            <p className="panel-note">입출고·결제·문서 이력이 있어 이 계약은 수정만 가능하며 삭제할 수 없습니다.</p>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
