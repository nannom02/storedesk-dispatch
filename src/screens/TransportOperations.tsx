import { useMemo, useState } from "react";
import { Check, ExternalLink, History, Plus, Search, Send, Trash2, Truck } from "lucide-react";

import { DescGrid, Modal, NoticeBar, PageHead, Panel, PanelRow, StateText, TableWrap } from "../components/ui";
import { formatWon } from "../data/utils";
import type { WorkInstruction } from "../data/types";
import { useStore } from "../store";

const INSTRUCTION_FIELDS = [
  "고객명·연락처",
  "상담 메모",
  "희망 날짜·시각",
  "출발지·도착지",
  "수취인·연락처",
  "엘리베이터 여부",
];

const RECIPIENT_LABELS: WorkInstruction["recipients"][number]["label"][] = [
  "운영팀",
  "창고팀",
  "운송업체",
];

const NEW_VENDOR = {
  name: "한빛로지스",
  manager: "정현수",
  phone: "010-7721-4085",
  businessNo: "212-86-51042",
  serviceAreas: "서울, 경기 남부",
  note: "평일 입출고와 리프트 동시 배차 가능",
};

function formatCurrencyInput(value: string | number) {
  const digits = String(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("ko-KR") : "";
}

function parseCurrencyInput(value: string) {
  return Number(value.replace(/\D/g, "")) || 0;
}

export default function TransportOperations() {
  const { state, derived, actions } = useStore();
  const targetMovements = state.movements.filter((movement) => !movement.done);
  const [movementId, setMovementId] = useState(targetMovements[0]?.id ?? "");
  const movement = state.movements.find((item) => item.id === movementId) ?? targetMovements[0];
  const [vendorId, setVendorId] = useState(movement?.vendorId ?? state.transportVendors[0]?.id ?? "");
  const [keyword, setKeyword] = useState("");
  const [reason, setReason] = useState("입고 당시 운송업체의 출고 일정 불가로 재배정");
  const [transportCost, setTransportCost] = useState(formatCurrencyInput(movement?.transportCost ?? 180000));
  const [ladderCost, setLadderCost] = useState(formatCurrencyInput(movement?.ladderTruckCost ?? 90000));
  const [fields, setFields] = useState<string[]>(INSTRUCTION_FIELDS);
  const [recipients, setRecipients] = useState<WorkInstruction["recipients"][number]["label"][]>(RECIPIENT_LABELS);
  const [vendorSourceFeedback, setVendorSourceFeedback] = useState("");
  const [costFeedback, setCostFeedback] = useState("");
  const [vendorEditorOpen, setVendorEditorOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorForm, setVendorForm] = useState(NEW_VENDOR);
  const [vendorFeedback, setVendorFeedback] = useState("");

  const contract = movement ? derived.contractById.get(movement.contractId) : undefined;
  const customer = contract ? derived.customerOf(contract) : undefined;
  const warehouse = movement ? derived.warehouseById.get(movement.warehouseId) : undefined;
  const vendor = state.transportVendors.find((item) => item.id === vendorId);
  const histories = state.assignmentHistory.filter((item) => item.movementId === movement?.id);
  const instructions = state.workInstructions.filter((item) => item.movementId === movement?.id);
  const vendorHistory = vendor?.serviceHistory ?? [];
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
    setTransportCost(formatCurrencyInput(next?.transportCost ?? 0));
    setLadderCost(formatCurrencyInput(next?.ladderTruckCost ?? 0));
    setVendorSourceFeedback("");
    setCostFeedback("");
  }

  function openNewVendor() {
    setEditingVendorId(null);
    setVendorForm(NEW_VENDOR);
    setVendorEditorOpen(true);
  }

  function openVendorEdit(targetId: string) {
    const target = state.transportVendors.find((item) => item.id === targetId);
    if (!target) return;
    setEditingVendorId(targetId);
    setVendorForm({
      name: target.name,
      manager: target.manager,
      phone: target.phone,
      businessNo: target.businessNo,
      serviceAreas: target.serviceAreas.join(", "),
      note: target.note,
    });
    setVendorEditorOpen(true);
  }

  function saveVendor() {
    const payload = {
      name: vendorForm.name.trim(),
      manager: vendorForm.manager.trim(),
      phone: vendorForm.phone.trim(),
      businessNo: vendorForm.businessNo.trim(),
      serviceAreas: vendorForm.serviceAreas.split(",").map((area) => area.trim()).filter(Boolean),
      note: vendorForm.note.trim(),
    };
    if (!payload.name || !payload.manager || !payload.phone || !payload.businessNo || payload.serviceAreas.length === 0) return;
    if (editingVendorId) {
      actions.updateTransportVendor(editingVendorId, payload);
      setVendorId(editingVendorId);
      setVendorFeedback(`${payload.name} 기준정보를 수정해 배정 화면과 기존 건의 업체명에 반영했습니다.`);
    } else {
      const createdId = actions.createTransportVendor(payload);
      setVendorId(createdId);
      setVendorFeedback(`${payload.name}을 신규 운송업체로 등록했습니다.`);
    }
    setVendorEditorOpen(false);
  }

  return (
    <div className="screen">
      <PageHead
        kicker="운영 · 재공고 추가 범위"
        title="운송 배정·작업지시"
        lead="외부 운송업체를 입출고 건에 배정하고, 고객·상담·희망 시각을 운영팀·창고팀·운송업체에 한 번에 전달합니다. 운송업체 화면은 로그인 없는 읽기 전용입니다."
        actions={<button type="button" className="ghost-button" onClick={openNewVendor}><Plus size={16} aria-hidden="true" /> 신규 운송업체 등록</button>}
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
          description="업체명·담당자·전화·사업자번호·활동 지역으로 검색합니다."
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
                  <th scope="col">활동 지역</th>
                  <th scope="col">수행 실적</th>
                  <th scope="col" data-priority="low">운영 메모</th>
                  <th scope="col" aria-label="상세" />
                </tr>
              </thead>
              <tbody>
                {vendors.map((item) => (
                  <tr
                    key={item.id}
                    className="interactive-row"
                    aria-label={`${item.name} 상세 보기`}
                    aria-selected={item.id === vendorId}
                    onClick={() => setVendorId(item.id)}
                  >
                    <td data-label="업체"><strong>{item.name}</strong><span className="cell-sub" data-density="support">{item.businessNo}</span></td>
                    <td data-label="담당자·연락처">{item.manager}<span className="cell-sub" data-density="support">{item.phone}</span></td>
                    <td data-label="활동 지역">{item.serviceAreas.join(" · ")}</td>
                    <td data-label="수행 실적">{item.completedJobs}건<span className="cell-sub">정시 {item.onTimeRate}%</span></td>
                    <td data-label="운영 메모" data-priority="low">{item.note}</td>
                    <td data-label="상세">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${item.name} 상세`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setVendorId(item.id);
                            openVendorEdit(item.id);
                          }}
                        >
                          상세
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          {vendorFeedback ? <p role="status" aria-label="운송업체 기준정보 처리 결과" className="panel-note">{vendorFeedback}</p> : null}
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

      <Panel
        title="업체별 수행 이력"
        description={vendor ? `${vendor.name} · 누적 ${vendor.completedJobs}건 · 정시 완료율 ${vendor.onTimeRate}%` : "운송업체를 선택하면 건별 운송·리프트 내역을 확인할 수 있습니다."}
      >
        <div role="status" aria-label="업체별 수행 이력">
          <TableWrap footer={<><span>{vendorHistory.length}건 표시</span><span>운송비·리프트 비용 건별 원장</span></>}>
            <table className="data-table">
              <thead><tr><th scope="col">작업</th><th scope="col">구분</th><th scope="col">기록 시각</th><th scope="col">운송 구간</th><th scope="col" className="numeric">운송비</th><th scope="col" className="numeric">리프트</th><th scope="col">결과</th></tr></thead>
              <tbody>
                {vendorHistory.map((record) => (
                  <tr key={record.id}>
                    <td data-label="작업"><strong>{record.movementId}</strong></td>
                    <td data-label="구분">{record.kind}</td>
                    <td data-label="기록 시각" className="date-cell">{record.completedAt}</td>
                    <td data-label="운송 구간">{record.route}</td>
                    <td data-label="운송비" className="numeric amount tabular">{formatWon(record.transportCost)}</td>
                    <td data-label="리프트" className="numeric amount tabular">{formatWon(record.liftCost)}</td>
                    <td data-label="결과"><StateText tone={record.result === "정시 완료" ? "ok" : record.result === "비용 기록" ? "info" : "warn"}>{record.result}</StateText></td>
                  </tr>
                ))}
                {vendorHistory.length === 0 ? <tr><td colSpan={7}>아직 완료된 운송 이력이 없습니다.</td></tr> : null}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </Panel>

      <PanelRow columns="5-7">
        <Panel title="비용 기록" description="운송·리프트 비용만 기록하며 정산·매입 세금계산서 기능은 후속 범위입니다.">
          <div className="form-grid" data-columns="2">
            <label className="field"><span className="field-label">운송비</span><input inputMode="numeric" value={transportCost} onChange={(event) => setTransportCost(formatCurrencyInput(event.target.value))} /></label>
            <label className="field"><span className="field-label">리프트 비용</span><input inputMode="numeric" value={ladderCost} onChange={(event) => setLadderCost(formatCurrencyInput(event.target.value))} /></label>
          </div>
          <button
            type="button"
            className="ghost-button"
            disabled={!movement}
            onClick={() => {
              if (!movement) return;
              actions.saveTransportCosts(movement.id, parseCurrencyInput(transportCost), parseCurrencyInput(ladderCost));
              setCostFeedback(`${movement.id} 비용을 작업 원장에 저장했습니다.`);
            }}
          >비용 저장</button>
          <div role="status" aria-label="작업지시 요약" className="transport-cost-summary">
            <span>운송비 {formatWon(parseCurrencyInput(transportCost))}</span>
            <span>리프트 {formatWon(parseCurrencyInput(ladderCost))}</span>
            <strong>합계 {formatWon(parseCurrencyInput(transportCost) + parseCurrencyInput(ladderCost))}</strong>
            {costFeedback ? <span className="support-text">{costFeedback}</span> : null}
          </div>
        </Panel>

        <Panel title="작업지시 만들기" description="실제로 전달할 정보와 담당자를 선택하면 읽기 전용 작업지시 주소가 함께 생성됩니다.">
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
          <div className="instruction-fields" role="group" aria-label="작업지시 수신 담당자">
            {RECIPIENT_LABELS.map((label) => {
              const target =
                label === "운영팀"
                  ? "윤서진 · 운영 담당"
                  : label === "창고팀"
                    ? `${warehouse?.managerName ?? movement?.driver ?? "담당자 확인"} · ${movement?.team ?? "창고팀"}`
                    : `${vendor?.manager ?? movement?.driver ?? "담당자 확인"} · ${vendor?.phone ?? "연락처 확인"}`;
              return (
                <label key={label}>
                  <input
                    type="checkbox"
                    checked={recipients.includes(label)}
                    onChange={(event) => setRecipients((current) => event.target.checked ? [...current, label] : current.filter((item) => item !== label))}
                  />
                  {label} · {target}
                </label>
              );
            })}
          </div>
          <div className="instruction-preview">
            <span className="panel-note">읽기 전용 운송업체 미리보기</span>
            <strong>{movement?.kind ?? "입출고"} 작업지시 · {movement?.containerNo ?? "-"}</strong>
            <p>{customer?.name ?? "고객"} · {movement?.desiredTime ?? "희망 시각 확인"} · {movement?.pickupAddress ?? "주소는 상담 정보에서 불러옵니다."}</p>
            <p>수취인 {movement?.recipient ?? customer?.name ?? "확인 필요"} · {movement?.recipientPhone ?? customer?.contact ?? "연락처 확인 필요"}</p>
            <span className="support-text">운송업체는 이 정보를 열람만 할 수 있으며 수정·입력 기능은 제공하지 않습니다.</span>
          </div>
          <button type="button" className="primary-button" disabled={!movement || fields.length === 0 || recipients.length === 0} onClick={() => movement && actions.sendWorkInstruction(movement.id, fields, recipients)}>
            <Send size={16} aria-hidden="true" /> 선택 담당자에게 작업지시 발송
          </button>
        </Panel>
      </PanelRow>

      <PanelRow columns="2">
        <Panel title="배정 이력" description="업체가 바뀐 이유와 처리자를 건별로 남깁니다.">
          <div role="status" aria-label="배정 이력">
            {histories.length ? <ul className="record-list">{histories.map((item) => <li key={item.id}><div className="record-list-head"><strong>{item.vendorName}</strong><StateText tone="info">{item.assignedAt}</StateText></div><p>{item.reason} · {item.assignedBy}</p></li>)}</ul> : <p className="panel-note">아직 배정 이력이 없습니다.</p>}
          </div>
        </Panel>
        <Panel title="발송 이력" description="선택한 담당자별 전달 상태와 외부 읽기 전용 지시서를 확인합니다.">
          <div role="status" aria-label="발송 이력">
            {instructions.length ? <ul className="record-list">{instructions.map((item) => <li key={item.id}><div className="record-list-head"><strong>{item.id} · {item.vendorName}</strong><span className="record-meta">{item.sentAt}</span></div><p>{item.fields.join(" · ")}</p><div className="recipient-statuses">{item.recipients.map((recipient) => <span key={recipient.label}><Check size={14} aria-hidden="true" /> {recipient.label} · {recipient.target} · {recipient.status}</span>)}</div><a className="quiet-button" href={`?public=work-order&id=${encodeURIComponent(item.id)}`}><ExternalLink size={14} aria-hidden="true" /> {item.id} 읽기 전용 지시서 열기</a></li>)}</ul> : <p className="panel-note">아직 발송한 작업지시가 없습니다.</p>}
          </div>
        </Panel>
      </PanelRow>

      {vendorEditorOpen ? (
        <Modal
          title={editingVendorId ? "운송업체 기준정보 수정" : "신규 운송업체 등록"}
          description="업체명·담당자·연락처·사업자번호·활동 지역·운영 메모를 기준정보로 저장합니다."
          onClose={() => setVendorEditorOpen(false)}
          actions={
            <>
              {editingVendorId ? (
                <button
                  type="button"
                  className="danger-button"
                  disabled={state.movements.some((item) => item.vendorId === editingVendorId)}
                  title="입출고 배정 이력이 없는 운송업체만 삭제할 수 있습니다."
                  onClick={() => {
                    actions.deleteTransportVendor(editingVendorId);
                    setVendorFeedback(`${vendorForm.name} 운송업체를 삭제했습니다.`);
                    setVendorEditorOpen(false);
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" /> 운송업체 삭제
                </button>
              ) : null}
              <button type="button" className="ghost-button" onClick={() => setVendorEditorOpen(false)}>취소</button>
              <button type="button" className="primary-button" onClick={saveVendor}>
                {editingVendorId ? "운송업체 수정 저장" : "운송업체 등록"}
              </button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field"><span className="field-label">업체명</span><input value={vendorForm.name} onChange={(event) => setVendorForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="field"><span className="field-label">담당자</span><input value={vendorForm.manager} onChange={(event) => setVendorForm((current) => ({ ...current, manager: event.target.value }))} /></label>
            <label className="field"><span className="field-label">연락처</span><input value={vendorForm.phone} onChange={(event) => setVendorForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="field"><span className="field-label">사업자번호</span><input value={vendorForm.businessNo} onChange={(event) => setVendorForm((current) => ({ ...current, businessNo: event.target.value }))} /></label>
            <label className="field" data-span="full"><span className="field-label">활동 지역</span><input value={vendorForm.serviceAreas} onChange={(event) => setVendorForm((current) => ({ ...current, serviceAreas: event.target.value }))} /><span className="support-text" data-density="support">쉼표로 지역을 구분합니다.</span></label>
            <label className="field" data-span="full"><span className="field-label">운영 메모</span><textarea value={vendorForm.note} onChange={(event) => setVendorForm((current) => ({ ...current, note: event.target.value }))} /></label>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
