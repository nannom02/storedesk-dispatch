import { useMemo, useState } from "react";
import { CalendarPlus, CheckCircle2 } from "lucide-react";

import { DescGrid, Modal, PageHead, Panel } from "../components/ui";
import { INBOUND_STEPS, OUTBOUND_STEPS, TODAY } from "../data/seed";
import type { Movement, MovementScope } from "../data/types";
import { formatKoreanDate } from "../data/utils";
import { useStore } from "../store";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTH_PREFIX = "2026-09";
const LEADING_BLANKS = 2; // 2026-09-01은 화요일
const DAYS_IN_MONTH = 30;
const VISIBLE_EVENTS = 2;

export default function ScheduleCalendar() {
  const { state, derived, actions } = useStore();
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [addOpen, setAddOpen] = useState(false);
  const [formKind, setFormKind] = useState<"입고" | "출고">("입고");
  const [formScope, setFormScope] = useState<MovementScope>("전체");
  const [formContract, setFormContract] = useState("SC-2026-0301");
  const [formTeam, setFormTeam] = useState<"A팀" | "B팀" | "C팀">("A팀");
  const [formDriver, setFormDriver] = useState("조현우");

  const byDate = useMemo(() => {
    const map = new Map<string, Movement[]>();
    for (const movement of state.movements) {
      if (!movement.scheduledDate.startsWith(MONTH_PREFIX)) continue;
      const list = map.get(movement.scheduledDate) ?? [];
      list.push(movement);
      map.set(movement.scheduledDate, list);
    }
    return map;
  }, [state.movements]);

  const selectedEvents = byDate.get(selectedDate) ?? [];
  const monthTotal = [...byDate.values()].reduce((sum, list) => sum + list.length, 0);
  const doneCount = [...byDate.values()]
    .flat()
    .filter((movement) => movement.done).length;

  const cells: (number | null)[] = [
    ...Array.from({ length: LEADING_BLANKS }, () => null),
    ...Array.from({ length: DAYS_IN_MONTH }, (_, index) => index + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="screen">
      <PageHead
        kicker="운영 · 2026년 9월"
        title="입출고 일정 캘린더"
        lead="팀별로 색을 나눈 입출고 일정을 확인하고, 날짜를 선택해 일정을 등록하거나 처리 완료를 표시합니다. 등록·완료는 입출고 관리와 처리 이력에 바로 반영됩니다."
        actions={
          <button type="button" className="primary-button" onClick={() => setAddOpen(true)}>
            <CalendarPlus size={16} aria-hidden="true" />
            선택 날짜에 일정 추가
          </button>
        }
      />

      <Panel
        title="2026년 9월 입출고 일정"
        description={`이번 달 ${monthTotal}건 · 처리 완료 ${doneCount}건 · 미완료 ${monthTotal - doneCount}건`}
      >
        <div className="legend">
          <span className="team-mark" data-team="A팀">A팀 · 형성 보관창고</span>
          <span className="team-mark" data-team="B팀">B팀 · 형동 송파지점</span>
          <span className="team-mark" data-team="C팀">C팀 · 형동 본사 실내창고</span>
        </div>

        <div data-scheduling-workspace>
          <div data-scheduling-calendar>
            <div data-calendar-week>
              {WEEKDAYS.map((day) => (
                <span key={day} data-calendar-weekday data-density="support">
                  {day}
                </span>
              ))}
            </div>
            <div data-calendar-grid>
              {cells.map((day, index) => {
                if (day === null) {
                  return (
                    <div
                      key={`blank-${index}`}
                      data-calendar-cell
                      data-calendar-empty="true"
                      aria-hidden="true"
                    />
                  );
                }
                const date = `${MONTH_PREFIX}-${String(day).padStart(2, "0")}`;
                const events = byDate.get(date) ?? [];
                return (
                  <button
                    key={date}
                    type="button"
                    data-calendar-cell
                    aria-pressed={selectedDate === date}
                    aria-label={`9월 ${day}일`}
                    onClick={() => setSelectedDate(date)}
                  >
                    <span data-calendar-date>
                      {day}
                      {date === TODAY ? <span data-calendar-today>오늘</span> : null}
                    </span>
                    {events.slice(0, VISIBLE_EVENTS).map((movement) => (
                      <span
                        key={movement.id}
                        data-calendar-event
                        data-density="support"
                        data-team={movement.team}
                        data-calendar-event-tone={movement.done ? "open" : undefined}
                      >
                        {movement.kind} {movement.containerNo}
                      </span>
                    ))}
                    {events.length > VISIBLE_EVENTS ? (
                      <span data-calendar-overflow data-density="meta">
                        그 외 {events.length - VISIBLE_EVENTS}건
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="stack">
            <Panel
              title={`${formatKoreanDate(selectedDate)} 일정`}
              description={`${selectedEvents.length}건 · ${selectedDate}`}
            >
              <div role="status" aria-label="선택 날짜 상세">
                {selectedEvents.length === 0 ? (
                  <p className="panel-note">
                    이 날짜에 등록된 입출고가 없습니다. 위의 `선택 날짜에 일정 추가`로 등록할 수 있습니다.
                  </p>
                ) : (
                  <ul className="record-list">
                    {selectedEvents.map((movement) => {
                      const contract = derived.contractById.get(movement.contractId);
                      const steps = movement.kind === "출고" ? OUTBOUND_STEPS : INBOUND_STEPS;
                      return (
                        <li key={movement.id}>
                          <div className="record-list-head">
                            <strong>
                              {movement.kind} · {movement.containerNo}
                            </strong>
                            <span className="team-mark" data-team={movement.team}>
                              {movement.team}
                            </span>
                          </div>
                          <p>
                            {contract ? derived.customerOf(contract)?.name : "-"} · {movement.contractId} · {movement.operationScope ?? "전체"} ·
                            기사 {movement.driver}
                          </p>
                          <p>
                            현재 단계 {steps[movement.stepIndex]}
                            {movement.done && movement.handledBy
                              ? ` · 처리자 ${movement.handledBy} · ${movement.handledAt}`
                              : ""}
                          </p>
                          <div className="inline">
                            <button
                              type="button"
                              className={movement.done ? "quiet-button" : "primary-button"}
                              aria-label={`${movement.id} 처리 완료 표시${movement.done ? " 해제" : ""}`}
                              onClick={() => actions.toggleMovementDone(movement.id)}
                            >
                              <CheckCircle2 size={16} aria-hidden="true" />
                              {movement.done ? "처리 완료 표시 해제" : "처리 완료 표시"}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Panel>

            <Panel title="이번 달 요약" description="캘린더에 표시된 건만 집계합니다.">
              <DescGrid
                columns="2"
                items={[
                  { label: "전체 일정", value: `${monthTotal}건` },
                  { label: "처리 완료", value: `${doneCount}건` },
                  {
                    label: "입고 / 출고",
                    value: `${[...byDate.values()].flat().filter((m) => m.kind === "입고").length}건 / ${
                      [...byDate.values()].flat().filter((m) => m.kind === "출고").length
                    }건`,
                  },
                  { label: "선택 날짜", value: selectedDate },
                ]}
              />
            </Panel>
          </div>
        </div>
      </Panel>

      {addOpen ? (
        <Modal
          title="선택 날짜에 일정 추가"
          description={`${selectedDate}에 등록합니다. 저장하면 캘린더와 입출고 관리에 동시에 반영됩니다.`}
          onClose={() => setAddOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setAddOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  actions.addSchedule({
                    kind: formKind,
                    operationScope: formKind === "입고" ? "전체" : formScope,
                    contractId: formContract,
                    scheduledDate: selectedDate,
                    team: formTeam,
                    driver: formDriver,
                  });
                  setAddOpen(false);
                }}
              >
                일정 저장
              </button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">구분</span>
              <select
                value={formKind}
                onChange={(event) => {
                  const nextKind = event.target.value as "입고" | "출고";
                  setFormKind(nextKind);
                  if (nextKind === "입고") setFormScope("전체");
                }}
              >
                <option value="입고">입고</option>
                <option value="출고">출고</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">처리 범위</span>
              <select
                value={formScope}
                disabled={formKind === "입고"}
                onChange={(event) => setFormScope(event.target.value as MovementScope)}
              >
                <option value="전체">전체</option>
                <option value="부분">부분 출고</option>
                <option value="재입고·재배치">재입고·재배치</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">계약</span>
              <select value={formContract} onChange={(event) => setFormContract(event.target.value)}>
                {state.contracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.id} · {derived.customerOf(contract)?.name} · {contract.containerNo}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">담당 팀</span>
              <select
                value={formTeam}
                onChange={(event) => setFormTeam(event.target.value as "A팀" | "B팀" | "C팀")}
              >
                <option value="A팀">A팀 · 형성 보관창고</option>
                <option value="B팀">B팀 · 형동 송파지점</option>
                <option value="C팀">C팀 · 형동 본사 실내창고</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">담당 기사</span>
              <input value={formDriver} onChange={(event) => setFormDriver(event.target.value)} />
            </label>
          </div>
          <p className="panel-note">
            같은 날짜·같은 컨테이너에 이미 일정이 있으면 저장 전에 경고합니다. 현재 {selectedDate}에는{" "}
            {selectedEvents.length}건이 있습니다.
          </p>
        </Modal>
      ) : null}
    </div>
  );
}
