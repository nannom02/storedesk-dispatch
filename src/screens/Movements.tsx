import { useState } from "react";
import { Camera, ChevronRight, Search, Smartphone, Truck } from "lucide-react";

import {
  ChipGroup,
  DescGrid,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StageRail,
  StateText,
  TableWrap,
} from "../components/ui";
import { INBOUND_STEPS, OUTBOUND_STEPS, TODAY } from "../data/seed";
import type { Movement } from "../data/types";
import { readNavigationContext } from "../navigation";
import type { Navigate } from "../navigation";
import { useStore } from "../store";

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "입고", label: "입고" },
  { id: "출고", label: "출고" },
  { id: "todo", label: "진행 중" },
];

const PHONE_TABS = [
  { id: "today", label: "오늘 작업" },
  { id: "customer", label: "고객 조회" },
  { id: "container", label: "창고번호" },
];

const QUICK_NUMBERS = ["A-14", "A-33", "B-07", "B-19", "C-04", "C-21"];

export default function Movements({ onNavigate }: { onNavigate: Navigate }) {
  const { state, derived, actions } = useStore();
  const focus = readNavigationContext();
  const focusedUnit = state.containers.find(
    (unit) =>
      unit.no === focus.containerNo &&
      (!focus.warehouseId || unit.warehouseId === focus.warehouseId),
  );
  const focusedMovements = focus.containerNo
    ? state.movements.filter(
        (movement) =>
          movement.containerNo === focus.containerNo &&
          (!focus.warehouseId || movement.warehouseId === focus.warehouseId),
      )
    : [];
  const focusedSnapshot = focusedMovements.length === 0 ? focusedUnit?.occupancyDetail : undefined;
  const snapshotMovement: Movement | undefined = focusedSnapshot
    ? {
        id: `HIST-${focusedUnit?.no ?? "CONTAINER"}`,
        kind: focusedSnapshot.latestMovement.includes("출고") ? "출고" : "입고",
        contractId: focusedSnapshot.contractId,
        warehouseId: focusedUnit?.warehouseId ?? focus.warehouseId ?? "WH-1",
        containerNo: focusedUnit?.no ?? focus.containerNo ?? "-",
        stepIndex: focusedSnapshot.latestMovement.includes("완료")
          ? focusedSnapshot.latestMovement.includes("출고")
            ? OUTBOUND_STEPS.length - 1
            : INBOUND_STEPS.length - 1
          : 0,
        scheduledDate: focusedSnapshot.latestMovement.split("·").at(-1)?.trim() ?? "-",
        team:
          derived.warehouseById.get(focusedUnit?.warehouseId ?? "")?.team ?? "A팀",
        driver: focusedSnapshot.manager.split("·").at(-1)?.trim() ?? "담당자 확인",
        handledBy: focusedSnapshot.latestMovement.includes("완료") ? "이관 기록" : undefined,
        handledAt: focusedSnapshot.latestMovement.includes("완료")
          ? focusedSnapshot.latestMovement.split("·").at(-1)?.trim()
          : undefined,
        done: focusedSnapshot.latestMovement.includes("완료"),
        photos: [],
      }
    : undefined;
  const allMovements = snapshotMovement ? [snapshotMovement, ...state.movements] : state.movements;
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(
    focusedMovements[0]?.id ?? snapshotMovement?.id ?? "MV-2609-021",
  );
  const [phoneTab, setPhoneTab] = useState("today");
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<string | null>(null);

  const rows = allMovements.filter((movement) => {
    if (
      focus.containerNo &&
      (movement.containerNo !== focus.containerNo ||
        (focus.warehouseId && movement.warehouseId !== focus.warehouseId))
    ) {
      return false;
    }
    if (filter === "all") return true;
    if (filter === "todo") return !movement.done;
    return movement.kind === filter;
  });

  const selected = allMovements.find((movement) => movement.id === selectedId);
  const selectedIsSnapshot = selected?.id === snapshotMovement?.id;
  const steps = selected?.kind === "출고" ? OUTBOUND_STEPS : INBOUND_STEPS;
  const contract = selected ? derived.contractById.get(selected.contractId) : undefined;
  const customer = contract ? derived.customerOf(contract) : undefined;
  const selectedCustomerName = selectedIsSnapshot
    ? focusedSnapshot?.customerName
    : customer?.name;

  const lookupContract = lookup
    ? state.contracts.find((item) => item.containerNo === lookup)
    : undefined;
  const lookupCustomer = lookupContract ? derived.customerOf(lookupContract) : undefined;
  const todayMovements = state.movements.filter((movement) => movement.scheduledDate === TODAY);

  return (
    <div className="screen">
      <PageHead
        kicker="운영 · 입고 4단계 · 출고 3단계"
        title="입출고 관리"
        lead="입고·출고 단계를 사무실과 현장에서 같은 기준으로 처리합니다. 출고완료 시 고객·계약·컨테이너 상태가 함께 갱신됩니다."
      />

      <Panel>
        {focus.containerNo ? (
          <div role="status" aria-label={`${focus.containerNo} 입출고 조회 결과`}>
            <NoticeBar
              title={`${focus.containerNo} 입출고 내역을 표시합니다`}
              action={
                <button type="button" className="notice-action" onClick={() => onNavigate("movements")}>
                  전체 입출고 보기
                </button>
              }
            >
              {focusedSnapshot?.customerName ?? customer?.name ?? "계약 고객 확인 중"} · {focus.contractId ?? selected?.contractId ?? "계약 미연결"} · {selected ? `${selected.kind} ${selected.done ? "완료" : "진행 중"}` : "등록된 내역 없음"}
            </NoticeBar>
          </div>
        ) : null}
        <div className="filter-bar">
          <ChipGroup label="입출고 구분" options={FILTERS} value={filter} onChange={setFilter} />
          <span className="panel-note" role="status" aria-label="입출고 목록 요약">
            표시 {rows.length}건 · 입고 {rows.filter((m) => m.kind === "입고").length} / 출고{" "}
            {rows.filter((m) => m.kind === "출고").length} · 미완료{" "}
            {rows.filter((m) => !m.done).length}건
          </span>
        </div>

        <TableWrap
          footer={
            <>
              <span>{rows.length}건 표시</span>
              <span>오늘 예정 {todayMovements.length}건</span>
            </>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">건번호</th>
                <th scope="col">구분</th>
                <th scope="col">계약 · 고객</th>
                <th scope="col">컨테이너</th>
                <th scope="col">예정일</th>
                <th scope="col">진행 단계</th>
                <th scope="col" data-priority="low">팀 · 운송업체</th>
                <th scope="col" aria-label="행 작업" />
              </tr>
            </thead>
            <tbody>
              {rows.map((movement) => {
                const target = derived.contractById.get(movement.contractId);
                const targetCustomerName =
                  movement.id === snapshotMovement?.id
                    ? focusedSnapshot?.customerName
                    : target
                      ? derived.customerOf(target)?.name
                      : undefined;
                const stepLabels = movement.kind === "출고" ? OUTBOUND_STEPS : INBOUND_STEPS;
                return (
                  <tr key={movement.id} aria-selected={movement.id === selectedId}>
                    <td data-label="건번호">
                      <span className="cell-strong id-cell">{movement.id}</span>
                    </td>
                    <td data-label="구분">{movement.kind}</td>
                    <td data-label="계약 · 고객">
                      {targetCustomerName ?? "-"}
                      <span className="cell-sub id-cell" data-density="support">{movement.contractId}</span>
                    </td>
                    <td data-label="컨테이너">{movement.containerNo}</td>
                    <td data-label="예정일" className="date-cell">{movement.scheduledDate}</td>
                    <td data-label="진행 단계">
                      <StateText tone={movement.done ? "ok" : "info"}>
                        {stepLabels[movement.stepIndex]}
                      </StateText>
                    </td>
                    <td data-label="팀 · 운송업체" data-priority="low">
                      {movement.team}<span className="cell-sub">{movement.vendorName ?? "미배정"}</span>
                    </td>
                    <td data-label="작업">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${movement.id} 상세`}
                          onClick={() => setSelectedId(movement.id)}
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
        <div className="stack">
          <Panel
            title={selected ? `${selected.id} 진행` : "진행"}
            description={
              selected
                ? `${selected.kind} · ${selectedCustomerName} · ${selected.containerNo} · ${selectedIsSnapshot ? "처리" : "예정"} ${selected.scheduledDate}`
                : "건을 선택하세요."
            }
            actions={
              selected && !selectedIsSnapshot ? (
                <>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={selected.done}
                    onClick={() => actions.advanceMovement(selected.id)}
                  >
                    <ChevronRight size={16} aria-hidden="true" />
                    다음 단계로 진행
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() =>
                      actions.attachMovementPhoto(
                        selected.id,
                        `${selected.containerNo}_현장_${state.movements.length}.jpg`,
                      )
                    }
                  >
                    <Camera size={16} aria-hidden="true" />
                    현장 사진 첨부
                  </button>
                </>
              ) : null
            }
          >
            {selected ? (
              <>
                {!selectedIsSnapshot ? (
                  <StageRail steps={steps} currentIndex={selected.stepIndex} />
                ) : null}
                <div role="status" aria-label="입출고 진행 상태">
                  <DescGrid
                    columns="3"
                    items={[
                      { label: "현재 단계", value: steps[selected.stepIndex] },
                      { label: "처리자", value: selected.handledBy ?? "미처리" },
                      { label: "처리 시각", value: selected.handledAt ?? "-" },
                      { label: "담당 팀·운송업체", value: `${selected.team} · ${selected.vendorName ?? "미배정"}` },
                      { label: "계약", value: selected.contractId },
                      {
                        label: "완료 여부",
                        value: selected.done ? "처리 완료" : "진행 중",
                      },
                    ]}
                  />
                </div>
                {selectedIsSnapshot ? (
                  <p className="panel-note">
                    기존 원장에서 이관할 완료 기록입니다. 신규 입출고 건부터 단계 진행과 현장 사진을
                    같은 화면에서 관리합니다.
                  </p>
                ) : null}
                {selected.done && !selectedIsSnapshot ? (
                  <div className="disabled-reason" role="status" aria-label="완료 연동 결과" data-density="support">
                    {selected.kind === "출고"
                      ? `출고완료 · 계약 ${selected.contractId} 만료 · 컨테이너 ${selected.containerNo} 사용 가능 · 고객 보관종료`
                      : `입고완료 · 고객 보관중 · 창고번호 ${selected.containerNo}로 원장 연결`}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="panel-note">목록에서 입출고 건을 선택하세요.</p>
            )}
          </Panel>

          <Panel
            title="현장 사진과 공개 범위"
            description="운영 담당자가 받은 사진을 입출고 건에 연결합니다. 입고는 고객 열람, 출고는 내부 전용이 기본안입니다."
          >
            <div role="status" aria-label="현장 사진 첨부">
              {selected && selected.photos.length > 0 ? (
                <ul className="record-list">
                  {selected.photos.map((photo) => (
                    <li key={photo.name}>
                      <div className="record-list-head">
                        <strong>{photo.name}</strong>
                        <span className="record-meta" data-density="support">{photo.at}</span>
                      </div>
                      <p>{photo.visibility ?? (selected.kind === "입고" ? "고객 열람" : "내부 전용")} · 업로더 {photo.uploadedBy ?? "이관 기록"}{photo.deleteAt ? ` · 삭제 ${photo.deleteAt}` : ""}</p>
                    </li>
                  ))}
                </ul>
              ) : selectedIsSnapshot ? (
                <p className="panel-note">이관된 과거 기록에는 연결된 현장 사진이 없습니다.</p>
              ) : (
                <p className="panel-note">
                  아직 첨부한 현장 사진이 없습니다. 사진을 올리면 입출고 구분에 따라 공개 범위를 자동 적용합니다.
                </p>
              )}
            </div>
            <p className="panel-note">
              사진 업로드 주체는 미확정입니다. 본 시안은 운영 담당자 업로드를 기본으로 하고, 운송업체 입력 링크는 선택 옵션으로 분리했습니다.
            </p>
          </Panel>
        </div>

        <Panel
          title="현장 모바일 화면"
          description="창고 담당자가 휴대폰에서 실제로 조작하는 화면입니다. 아래 탭을 눌러 확인하세요."
        >
          <div className="phone-column">
            <div className="phone-device">
              <div className="phone-screen">
                <span className="phone-notch" aria-hidden="true" />
                <div className="phone-statusbar" data-density="meta">
                  <span>09:41</span>
                  <span>LTE · 배터리 82%</span>
                </div>
                <div className="phone-appbar">
                  <strong>
                    {phoneTab === "today"
                      ? "오늘 작업"
                      : phoneTab === "customer"
                        ? "고객 조회"
                        : "창고번호 조회"}
                  </strong>
                  <span data-density="support">
                    {phoneTab === "today"
                      ? `${TODAY} · A팀 조현우`
                      : phoneTab === "customer"
                        ? "이름·연락처로 계약을 찾습니다"
                        : "컨테이너 번호로 계약을 확인합니다"}
                  </span>
                </div>

                <div className="phone-body" role="status" aria-label="현장 모바일 화면">
                  {phoneTab === "today" ? (
                    <>
                      {todayMovements.map((movement) => (
                        <div key={movement.id} className="phone-card">
                          <strong>
                            {movement.kind} · {movement.containerNo}
                          </strong>
                          <span data-density="support">
                            {derived.contractLabel(movement.contractId)} · {movement.team}{" "}
                            {movement.driver}
                          </span>
                          <StateText tone={movement.done ? "ok" : "info"}>
                            {(movement.kind === "출고" ? OUTBOUND_STEPS : INBOUND_STEPS)[
                              movement.stepIndex
                            ]}
                          </StateText>
                          <button
                            type="button"
                            className="phone-action"
                            disabled={movement.done}
                            onClick={() => actions.advanceMovement(movement.id)}
                          >
                            <Truck size={16} aria-hidden="true" />
                            {movement.done ? "완료됨" : "현장에서 단계 진행"}
                          </button>
                        </div>
                      ))}
                      {todayMovements.length === 0 ? (
                        <div className="phone-card">
                          <strong>오늘 예정된 작업이 없습니다</strong>
                          <span data-density="support">캘린더에서 일정을 확인하세요.</span>
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {phoneTab === "customer" ? (
                    <>
                      {state.customers.slice(0, 4).map((item) => {
                        const owned = state.contracts.find(
                          (contract) => contract.customerId === item.id,
                        );
                        return (
                          <div key={item.id} className="phone-card">
                            <strong>{item.name}</strong>
                            <span data-density="support">
                              {item.kind} · {item.contact}
                            </span>
                            <span data-density="support">
                              {owned
                                ? `${owned.containerNo} · ${owned.status} · 만료 ${owned.endDate}`
                                : "진행 중 계약 없음"}
                            </span>
                          </div>
                        );
                      })}
                    </>
                  ) : null}

                  {phoneTab === "container" ? (
                    <>
                      <div className="phone-card">
                        <strong>{query || "창고번호를 선택하세요"}</strong>
                        <span data-density="support">
                          컨테이너에 붙은 번호를 그대로 입력하면 계약과 고객을 확인할 수 있습니다.
                        </span>
                      </div>
                      <div className="phone-keypad">
                        {QUICK_NUMBERS.map((no) => (
                          <button
                            key={no}
                            type="button"
                            aria-label={`${no} 입력`}
                            onClick={() => setQuery(no)}
                          >
                            {no}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="phone-action"
                        disabled={!query}
                        onClick={() => setLookup(query)}
                      >
                        <Search size={16} aria-hidden="true" />
                        창고번호 조회
                      </button>
                      <div className="phone-card">
                        <strong>조회 결과</strong>
                        <span data-density="support">
                          {!lookup
                            ? "아직 조회하지 않았습니다."
                            : lookupContract
                              ? `${lookupCustomer?.name} · ${lookupContract.id} · ${lookupContract.status}`
                              : `${lookup}에 연결된 계약이 없습니다.`}
                        </span>
                        {lookup && lookupContract ? (
                          <span data-density="support">
                            보관 기간 {lookupContract.startDate} ~ {lookupContract.endDate} · 월{" "}
                            {lookupContract.monthlyFee.toLocaleString("ko-KR")}원
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="phone-nav">
                  {PHONE_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-density="meta"
                      aria-pressed={phoneTab === tab.id}
                      className={phoneTab === tab.id ? "active" : undefined}
                      onClick={() => setPhoneTab(tab.id)}
                    >
                      <Smartphone size={16} aria-hidden="true" />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <span className="phone-home-indicator" aria-hidden="true" />
              </div>
            </div>
            <div role="status" aria-label="창고번호 조회 결과" className="panel-note">
              {lookup
                ? lookupContract
                  ? `${lookup} · ${lookupCustomer?.name} · ${lookupContract.id} · 상태 ${lookupContract.status} · 만료 ${lookupContract.endDate}`
                  : `${lookup}에 연결된 계약이 없습니다.`
                : "휴대폰에서 창고번호를 선택하고 조회하면 결과가 여기에도 표시됩니다."}
            </div>
          </div>
        </Panel>
      </PanelRow>
    </div>
  );
}
