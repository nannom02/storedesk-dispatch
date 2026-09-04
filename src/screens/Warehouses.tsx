import { useMemo, useState } from "react";
import { Container, PackagePlus } from "lucide-react";

import {
  ChipGroup,
  DescGrid,
  EmptyState,
  Modal,
  PageHead,
  Panel,
  PanelRow,
  StateText,
} from "../components/ui";
import { INBOUND_STEPS, OUTBOUND_STEPS, warehouses } from "../data/seed";
import { formatWon } from "../data/utils";
import type { Navigate } from "../navigation";
import { useStore } from "../store";

export default function Warehouses({ onNavigate }: { onNavigate: Navigate }) {
  const { state, derived, actions } = useStore();
  const [warehouseId, setWarehouseId] = useState("WH-1");
  const [selectedUnitId, setSelectedUnitId] = useState(
    () => state.containers.find((unit) => unit.warehouseId === "WH-1")?.id ?? "",
  );
  const [assignOpen, setAssignOpen] = useState(false);
  const [targetNo, setTargetNo] = useState("");
  const [targetContract, setTargetContract] = useState("SC-2026-0640");

  const warehouse = warehouses.find((item) => item.id === warehouseId) ?? warehouses[0];
  const units = useMemo(
    () => state.containers.filter((unit) => unit.warehouseId === warehouseId),
    [state.containers, warehouseId],
  );
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);
  const emptyUnits = units.filter((unit) => unit.occupancyStatus === "available");
  const visibleUsed = units.filter((unit) => unit.occupancyStatus === "occupied").length;
  const used = derived.occupancyOf(warehouseId);
  const rate = Math.round((used / warehouse.totalContainers) * 1000) / 10;
  const zoneLabel = `${units[0]?.no.split("-")[0] ?? ""}구역`;
  const lastAssignment = state.auditEntries.find((entry) => entry.action.startsWith("컨테이너 "));

  const selectedContract = selectedUnit?.contractId
    ? derived.contractById.get(selectedUnit.contractId)
    : undefined;
  const selectedCustomer = selectedContract ? derived.customerOf(selectedContract) : undefined;
  const selectedMovement = selectedContract
    ? state.movements.find((movement) => movement.contractId === selectedContract.id)
    : undefined;
  const selectedBilling = selectedContract
    ? state.billingItems.find((item) => item.contractId === selectedContract.id)
    : undefined;
  const selectedSnapshot = selectedUnit?.occupancyDetail;
  const selectedOccupied = selectedUnit?.occupancyStatus === "occupied";

  const selectedDetail = selectedContract
    ? {
        contractId: selectedContract.id,
        customerName: selectedCustomer?.name ?? "고객 정보 확인 중",
        customerKind: selectedCustomer?.kind ?? "개인",
        contact: selectedCustomer?.contact ?? "-",
        startDate: selectedContract.startDate,
        endDate: selectedContract.endDate,
        monthlyFee: selectedContract.monthlyFee - selectedContract.discount,
        contractStatus: selectedContract.status,
        paymentStatus:
          selectedBilling?.billingStatus ??
          (selectedContract.status === "연체" ? "확인 필요" : "입금 완료"),
        latestMovement: selectedMovement
          ? `${selectedMovement.kind} · ${
              (selectedMovement.kind === "입고" ? INBOUND_STEPS : OUTBOUND_STEPS)[
                selectedMovement.stepIndex
              ]
            } · ${selectedMovement.scheduledDate}`
          : "등록된 입출고 일정 없음",
        manager: `${warehouse.team} · ${selectedContract.driver ?? warehouse.managerName}`,
      }
    : selectedSnapshot;

  function openAssignment(containerNo?: string) {
    setTargetNo(containerNo ?? emptyUnits[0]?.no ?? "");
    setAssignOpen(true);
  }

  return (
    <div className="screen">
      <PageHead
        kicker="운영 · 창고 3개소 기준정보"
        title="창고·컨테이너"
        lead="창고별 보관 형태와 가동 현황을 확인하고, 배치도에서 컨테이너를 선택해 고객·계약·입출고 내역을 조회하거나 빈 컨테이너를 배정합니다."
        actions={
          <button type="button" className="primary-button" onClick={() => openAssignment()}>
            <PackagePlus size={16} aria-hidden="true" />
            컨테이너 배정
          </button>
        }
      />

      <Panel>
        <div className="filter-bar">
          <ChipGroup
            label="창고 선택"
            options={warehouses.map((item) => ({ id: item.id, label: item.name }))}
            value={warehouseId}
            onChange={(nextWarehouseId) => {
              setWarehouseId(nextWarehouseId);
              setSelectedUnitId(
                state.containers.find((unit) => unit.warehouseId === nextWarehouseId)?.id ?? "",
              );
            }}
          />
          <span className="panel-note" role="status" aria-label="창고 가동 현황">
            {warehouse.name} · {used} / {warehouse.totalContainers}기 사용 중 · 가동률 {rate}% ·{" "}
            {warehouse.team} {warehouse.managerName}
          </span>
        </div>
        <DescGrid
          columns="3"
          items={[
            { label: "주소", value: warehouse.address },
            { label: "보관 형태", value: warehouse.storageType },
            { label: "담당 팀", value: `${warehouse.team} · ${warehouse.managerName}` },
            { label: "총 컨테이너", value: `${warehouse.totalContainers}기` },
            { label: "사용 중", value: `${used}기` },
            { label: "여유", value: `${warehouse.totalContainers - used}기` },
          ]}
        />
      </Panel>

      <PanelRow columns="7-5">
        <Panel
          title={`${warehouse.name} ${zoneLabel} 배치도`}
          description={`전체 ${warehouse.totalContainers}기 중 ${zoneLabel} ${units.length}기를 표시합니다. 번호를 선택하면 우측에서 고객·계약·입출고 내역을 확인할 수 있습니다.`}
        >
          <div className="legend">
            <StateText tone="info">사용 중 {visibleUsed}기</StateText>
            <StateText tone="neutral">비어 있음 {units.length - visibleUsed}기</StateText>
            <span className="muted">전체 사용 {used}기 · 현재 표시 {units.length}기</span>
          </div>
          <div className="container-grid" aria-label={`${warehouse.name} ${zoneLabel} 컨테이너 배치도`}>
            {units.map((unit) => {
              const contract = unit.contractId
                ? derived.contractById.get(unit.contractId)
                : undefined;
              const customerName = contract
                ? derived.customerOf(contract)?.name
                : unit.occupancyDetail?.customerName;
              const occupied = unit.occupancyStatus === "occupied";
              const detailLabel = occupied
                ? `${unit.no} · ${customerName ?? "사용 중"}`
                : `${unit.no} · 비어 있음`;
              return (
                <button
                  key={unit.id}
                  type="button"
                  className="container-cell"
                  data-density="support"
                  data-occupied={occupied ? "true" : "false"}
                  aria-pressed={selectedUnit?.id === unit.id}
                  aria-label={`${detailLabel} 컨테이너 상세 보기`}
                  title={`${detailLabel} · ${unit.size}`}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  <strong>{unit.no}</strong>
                  <span>{unit.size}</span>
                  <span>{customerName ?? (occupied ? "사용 중" : "여유")}</span>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="stack">
          <Panel
            title={selectedUnit ? `${selectedUnit.no} 컨테이너 상세` : "컨테이너 상세"}
            description={selectedUnit ? `${warehouse.name} · ${zoneLabel} · ${selectedUnit.size}` : "배치도에서 컨테이너를 선택하세요."}
            actions={
              selectedUnit ? (
                <StateText tone={selectedOccupied ? "info" : "neutral"}>
                  {selectedOccupied ? "사용 중" : "비어 있음"}
                </StateText>
              ) : null
            }
          >
            <div
              className="container-detail"
              role="status"
              aria-label={selectedUnit ? `${selectedUnit.no} 컨테이너 상세` : "컨테이너 선택 안내"}
            >
              {selectedUnit && selectedOccupied && selectedDetail ? (
                <>
                  <div className="container-detail-heading">
                    <div>
                      <h3>{selectedDetail.customerName}</h3>
                      <p>{selectedDetail.customerKind} 고객 · {selectedDetail.contact}</p>
                    </div>
                    <StateText
                      tone={
                        selectedDetail.contractStatus === "정상"
                          ? "ok"
                          : selectedDetail.contractStatus === "연체"
                            ? "bad"
                            : "warn"
                      }
                    >
                      {selectedDetail.contractStatus}
                    </StateText>
                  </div>
                  <DescGrid
                    columns="2"
                    items={[
                      { label: "계약번호", value: selectedDetail.contractId },
                      { label: "컨테이너 규격", value: selectedUnit.size },
                      {
                        label: "계약 기간",
                        value: `${selectedDetail.startDate} ~ ${selectedDetail.endDate}`,
                      },
                      { label: "월 이용료", value: formatWon(selectedDetail.monthlyFee) },
                      { label: "입금 상태", value: selectedDetail.paymentStatus },
                      { label: "담당 팀·기사", value: selectedDetail.manager },
                      { label: "최근 입출고", value: selectedDetail.latestMovement },
                    ]}
                  />
                  <div className="container-detail-actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        onNavigate("contracts", {
                          warehouseId,
                          containerNo: selectedUnit.no,
                          contractId: selectedDetail.contractId,
                        })
                      }
                    >
                      계약 상세 보기
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        onNavigate("movements", {
                          warehouseId,
                          containerNo: selectedUnit.no,
                          contractId: selectedDetail.contractId,
                        })
                      }
                    >
                      {selectedUnit.no} 입출고 내역 보기
                    </button>
                  </div>
                </>
              ) : selectedUnit ? (
                <EmptyState>
                  <strong>{selectedUnit.no}는 현재 비어 있습니다.</strong>
                  <span>계약을 연결하면 사용 상태와 창고 가동률이 함께 갱신됩니다.</span>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => openAssignment(selectedUnit.no)}
                  >
                    이 컨테이너에 계약 배정
                  </button>
                </EmptyState>
              ) : (
                <EmptyState>배치도에서 확인할 컨테이너를 선택하세요.</EmptyState>
              )}
            </div>
          </Panel>

          <Panel
            title="최근 배정 결과"
            description="배정하면 컨테이너 상태·계약·가동률이 함께 바뀌고 처리 이력에 남습니다."
          >
            <div role="status" aria-label="컨테이너 배정 결과">
              {lastAssignment ? (
                <ul className="record-list">
                  <li>
                    <div className="record-list-head">
                      <strong>{lastAssignment.action}</strong>
                      <span className="record-meta" data-density="support">{lastAssignment.at}</span>
                    </div>
                    <p>
                      {lastAssignment.target} · 처리자 {lastAssignment.actor}
                    </p>
                  </li>
                </ul>
              ) : (
                <p className="panel-note">
                  아직 이번 세션에서 배정한 컨테이너가 없습니다. 빈 칸을 선택하거나 상단의
                  `컨테이너 배정`을 누르면 계약과 연결할 수 있습니다.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="보관 유형·규격 기준" description="창고별 보관 환경과 컨테이너 길이 구분입니다.">
            <ul className="record-list">
              {warehouses.map((item) => (
                <li key={item.id}>
                  <div className="record-list-head">
                    <strong>
                      <Container size={15} aria-hidden="true" /> {item.name}
                    </strong>
                    <span className="record-meta" data-density="support">{item.team}</span>
                  </div>
                  <p>
                    {item.storageType} · 총 {item.totalContainers}기
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </PanelRow>

      {assignOpen ? (
        <Modal
          title="컨테이너 배정"
          description={`${warehouse.name}의 빈 컨테이너를 계약에 배정합니다.`}
          onClose={() => setAssignOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setAssignOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={!targetNo}
                onClick={() => {
                  actions.assignContainer(warehouseId, targetNo, targetContract);
                  const assignedUnit = units.find((unit) => unit.no === targetNo);
                  if (assignedUnit) setSelectedUnitId(assignedUnit.id);
                  setAssignOpen(false);
                }}
              >
                배정 저장
              </button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">빈 컨테이너</span>
              <select value={targetNo} onChange={(event) => setTargetNo(event.target.value)}>
                {emptyUnits.map((unit) => (
                  <option key={unit.id} value={unit.no}>
                    {unit.no} · {unit.size}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">배정할 계약</span>
              <select
                value={targetContract}
                onChange={(event) => setTargetContract(event.target.value)}
              >
                {state.contracts
                  .filter((contract) => contract.status !== "중도 해지")
                  .map((contract) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.id} · {derived.customerOf(contract)?.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <p className="panel-note">
            저장하면 컨테이너가 사용 중으로 바뀌고 계약의 창고·컨테이너 정보와 가동률이 함께 갱신됩니다.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
