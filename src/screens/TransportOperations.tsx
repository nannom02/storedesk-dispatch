import { useMemo, useState } from "react";
import { Check, History, Search, Send, Truck } from "lucide-react";

import { DescGrid, NoticeBar, PageHead, Panel, PanelRow, StateText, TableWrap } from "../components/ui";
import { formatWon } from "../data/utils";
import { useStore } from "../store";

const INSTRUCTION_FIELDS = [
  "고객명·연락처",
  "상담 메모",
  "희망 날짜·시각",
  "출발지·도착지",
  "수취인·연락처",
  "엘리베이터 여부",
];

export default function TransportOperations() {
  const { state, derived, actions } = useStore();
  const targetMovements = state.movements.filter((movement) => !movement.done);
  const [movementId, setMovementId] = useState(targetMovements[0]?.id ?? "");
  const movement = state.movements.find((item) => item.id === movementId) ?? targetMovements[0];
  const [vendorId, setVendorId] = useState(movement?.vendorId ?? state.transportVendors[0]?.id ?? "");
  const [keyword, setKeyword] = useState("");
  const [reason, setReason] = useState("입고 당시 운송업체의 출고 일정 불가로 재배정");
  const [transportCost, setTransportCost] = useState(String(movement?.transportCost ?? 180000));
  const [ladderCost, setLadderCost] = useState(String(movement?.ladderTruckCost ?? 90000));
  const [fields, setFields] = useState<string[]>(INSTRUCTION_FIELDS);
  const [vendorSourceFeedback, setVendorSourceFeedback] = useState("");
  const [costFeedback, setCostFeedback] = useState("");

  const contract = movement ? derived.contractById.get(movement.contractId) : undefined;
  const customer = contract ? derived.customerOf(contract) : undefined;
  const warehouse = movement ? derived.warehouseById.get(movement.warehouseId) : undefined;
  const vendor = state.transportVendors.find((item) => item.id === vendorId);
  const histories = state.assignmentHistory.filter((item) => item.movementId === movement?.id);
  const instructions = state.workInstructions.filter((item) => item.movementId === movement?.id);
  const vendors = useMemo(() => {
    const term = keyword.trim();
    if (!term) return state.transportVendors;
    return state.transportVendors.filter((item) =>
      [item.name, item.manager, item.phone, item.businessNo, ...item.serviceAreas].some((value) => value.includes(term)),
    );
  }, [keyword, state.transportVendors]);

  function chooseMovement(nextId: string) {
    const next = state.movements.find((item) => item.id === nextId);
    setMovementId(nextId);
    setVendorId(next?.vendorId ?? state.transportVendors[0]?.id ?? "");
    setTransportCost(String(next?.transportCost ?? 0));
    setLadderCost(String(next?.ladderTruckCost ?? 0));
    setVendorSourceFeedback("");
    setCostFeedback("");
  }

  return (
    <div className="screen">
      <PageHead
        kicker="운영 · 재공고 추가 범위"
        title="운송 배정·작업지시"
        lead="외부 운송업체를 입출고 건에 배정하고, 고객·상담·희망 시각을 운영팀·창고팀·운송업체에 한 번에 전달합니다. 운송업체 화면은 로그인 없는 읽기 전용입니다."
      />

      <NoticeBar variant="review" title="이번 공고에서 확정된 변경 범위">
        기존의 담당 기사 메모를 운송업체 원장·배정 이력·작업지시 발송으로 확장했습니다. 견적 계산과 예약금 수납, 운송업체 정산은 이번 범위에서 제외합니다.
      </NoticeBar>

      <Panel title="배정할 입출고 건" description="진행 중인 건을 바꾸면 배정·작업지시 문맥도 함께 전환됩니다.">
        <div className="transport-job-strip" role="group" aria-label="입출고 건 선택">
          {targetMovements.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className="transport-job"
              aria-pressed={item.id === movement?.id}
              onClick={() => chooseMovement(item.id)}
            >
              <span>{item.kind} · {item.containerNo}</span>
              <strong>{item.id}</strong>
              <small>{item.scheduledDate} · {item.vendorName ?? "운송업체 미배정"}</small>
            </button>
          ))}
        </div>
      </Panel>

      <PanelRow columns="7-5">
        <Panel
          title="운송업체 찾기"
          description="업체명·담당자·전화·사업자번호·서비스 지역으로 검색합니다."
        >
          <label className="search-field transport-search">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">운송업체 검색</span>
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="예: 서울, 한결운송, 214-88" />
          </label>
          <TableWrap footer={<><span>{vendors.length}개 업체</span><span>운송업체 로그인 없음</span></>}>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">업체</th>
                  <th scope="col">담당자·연락처</th>
                  <th scope="col">서비스 지역</th>
                  <th scope="col">수행 실적</th>
                  <th scope="col" aria-label="선택" />
                </tr>
              </thead>
              <tbody>
                {vendors.map((item) => (
                  <tr key={item.id} aria-selected={item.id === vendorId}>
                    <td data-label="업체"><strong>{item.name}</strong><span className="cell-sub">{item.businessNo}</span></td>
                    <td data-label="담당자·연락처">{item.manager}<span className="cell-sub">{item.phone}</span></td>
                    <td data-label="서비스 지역">{item.serviceAreas.join(" · ")}</td>
                    <td data-label="수행 실적">{item.completedJobs}건<span className="cell-sub">정시 {item.onTimeRate}%</span></td>
                    <td data-label="선택"><button type="button" className="quiet-button" onClick={() => setVendorId(item.id)}>{item.id === vendorId ? "선택됨" : "선택"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel
          title="배정 패널"
          description={movement ? `${movement.id} · ${movement.kind} · ${customer?.name ?? "고객 확인 중"}` : "입출고 건을 선택하십시오."}
        >
          <div role="status" aria-label="배정 패널" className="stack">
            <DescGrid
              columns="2"
              items={[
                { label: "현재 운송업체", value: movement?.vendorName ?? "미배정" },
                { label: "선택 운송업체", value: vendor?.name ?? "선택 필요" },
                { label: "창고", value: warehouse?.name ?? "-" },
                { label: "예정일", value: movement?.scheduledDate ?? "-" },
              ]}
            />
            {movement?.kind === "출고" ? (
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  if (!movement) return;
                  actions.selectInboundTransportVendor(movement.id);
                  setVendorSourceFeedback(`${movement.id}에 입고 당시 운송업체를 불러왔습니다.`);
                }}
              >
                <History size={16} aria-hidden="true" /> 기존 입고 운송사 불러오기
              </button>
            ) : null}
            {vendorSourceFeedback ? <p className="support-text">{vendorSourceFeedback}</p> : null}
            <label className="field">
              <span className="field-label">배정·재배정 사유</span>
              <input value={reason} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button type="button" className="primary-button" disabled={!movement || !vendor} onClick={() => movement && vendor && actions.assignTransportVendor(movement.id, vendor.id, reason)}>
              <Truck size={16} aria-hidden="true" /> 운송업체 배정
            </button>
          </div>
        </Panel>
      </PanelRow>

      <PanelRow columns="5-7">
        <Panel title="비용 기록" description="운송·사다리차 비용만 기록하며 정산·매입 세금계산서 기능은 후속 범위입니다.">
          <div className="form-grid" data-columns="2">
            <label className="field"><span className="field-label">운송비</span><input inputMode="numeric" value={transportCost} onChange={(event) => setTransportCost(event.target.value.replace(/\D/g, ""))} /></label>
            <label className="field"><span className="field-label">사다리차 비용</span><input inputMode="numeric" value={ladderCost} onChange={(event) => setLadderCost(event.target.value.replace(/\D/g, ""))} /></label>
          </div>
          <button
            type="button"
            className="ghost-button"
            disabled={!movement}
            onClick={() => {
              if (!movement) return;
              actions.saveTransportCosts(movement.id, Number(transportCost), Number(ladderCost));
              setCostFeedback(`${movement.id} 비용을 작업 원장에 저장했습니다.`);
            }}
          >비용 저장</button>
          <div role="status" aria-label="작업지시 요약" className="transport-cost-summary">
            <span>운송비 {formatWon(Number(transportCost) || 0)}</span>
            <span>사다리차 {formatWon(Number(ladderCost) || 0)}</span>
            <strong>합계 {formatWon((Number(transportCost) || 0) + (Number(ladderCost) || 0))}</strong>
            {costFeedback ? <span className="support-text">{costFeedback}</span> : null}
          </div>
        </Panel>

        <Panel title="작업지시 만들기" description="실제로 전달할 정보만 선택합니다. 수신자는 운영팀·창고팀·운송업체로 고정됩니다.">
          <div className="instruction-fields" role="group" aria-label="작업지시 전달 항목">
            {INSTRUCTION_FIELDS.map((field) => (
              <label key={field}>
                <input
                  type="checkbox"
                  checked={fields.includes(field)}
                  onChange={(event) => setFields((current) => event.target.checked ? [...current, field] : current.filter((item) => item !== field))}
                />
                {field}
              </label>
            ))}
          </div>
          <div className="instruction-preview">
            <span className="panel-note">읽기 전용 운송업체 미리보기</span>
            <strong>{movement?.kind ?? "입출고"} 작업지시 · {movement?.containerNo ?? "-"}</strong>
            <p>{customer?.name ?? "고객"} · {movement?.desiredTime ?? "희망 시각 확인"} · {movement?.pickupAddress ?? "주소는 상담 정보에서 불러옵니다."}</p>
            <p>수취인 {movement?.recipient ?? customer?.name ?? "확인 필요"} · {movement?.recipientPhone ?? customer?.contact ?? "연락처 확인 필요"}</p>
            <span className="support-text">운송업체는 이 정보를 열람만 할 수 있으며 수정·입력 기능은 제공하지 않습니다.</span>
          </div>
          <button type="button" className="primary-button" disabled={!movement || fields.length === 0} onClick={() => movement && actions.sendWorkInstruction(movement.id, fields)}>
            <Send size={16} aria-hidden="true" /> 3자 작업지시 발송
          </button>
        </Panel>
      </PanelRow>

      <PanelRow columns="2">
        <Panel title="배정 이력" description="업체가 바뀐 이유와 처리자를 건별로 남깁니다.">
          <div role="status" aria-label="배정 이력">
            {histories.length ? <ul className="record-list">{histories.map((item) => <li key={item.id}><div className="record-list-head"><strong>{item.vendorName}</strong><StateText tone="info">{item.assignedAt}</StateText></div><p>{item.reason} · {item.assignedBy}</p></li>)}</ul> : <p className="panel-note">아직 배정 이력이 없습니다.</p>}
          </div>
        </Panel>
        <Panel title="발송 이력" description="한 번의 작업지시가 세 수신자에게 전달되었는지 확인합니다.">
          <div role="status" aria-label="발송 이력">
            {instructions.length ? <ul className="record-list">{instructions.map((item) => <li key={item.id}><div className="record-list-head"><strong>{item.id} · {item.vendorName}</strong><span className="record-meta">{item.sentAt}</span></div><p>{item.fields.join(" · ")}</p><div className="recipient-statuses">{item.recipients.map((recipient) => <span key={recipient.label}><Check size={14} aria-hidden="true" /> {recipient.label} {recipient.status}</span>)}</div></li>)}</ul> : <p className="panel-note">아직 발송한 작업지시가 없습니다.</p>}
          </div>
        </Panel>
      </PanelRow>
    </div>
  );
}
