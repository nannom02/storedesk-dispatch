import { CheckCircle2, Container, Printer, ShieldCheck } from "lucide-react";

import type { Contract, Customer, Movement, TransportVendor, Warehouse, WorkInstruction } from "../data/types";
import { formatWon } from "../data/utils";
import { useStore } from "../store";

interface SavedInstruction {
  instruction: WorkInstruction;
  movement: Movement;
  contract?: Contract;
  customer?: Customer;
  warehouse?: Warehouse;
  vendor?: TransportVendor;
}

function PublicHeader({ title, reference }: { title: string; reference: string }) {
  return (
    <header className="public-header">
      <div className="public-brand"><Container size={24} aria-hidden="true" /><strong>StoreDesk</strong></div>
      <div><span data-density="support">읽기 전용 문서</span><h1>{title}</h1><p>{reference}</p></div>
      <button type="button" className="ghost-button" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> 인쇄</button>
    </header>
  );
}

function WorkOrder({ instructionId }: { instructionId: string }) {
  const { state, derived } = useStore();
  const fromState = state.workInstructions.find((item) => item.id === instructionId);
  let saved: SavedInstruction | null = null;
  try {
    const raw = window.localStorage.getItem(`storedesk:work-instruction:${instructionId}`);
    saved = raw ? (JSON.parse(raw) as SavedInstruction) : null;
  } catch {
    saved = null;
  }
  const instruction = saved?.instruction ?? fromState;
  const movement = saved?.movement ?? state.movements.find((item) => item.id === instruction?.movementId);
  const contract = saved?.contract ?? derived.contractById.get(movement?.contractId ?? "");
  const customer = saved?.customer ?? (contract ? derived.customerOf(contract) : undefined);
  const warehouse = saved?.warehouse ?? derived.warehouseById.get(movement?.warehouseId ?? "");
  const vendor = saved?.vendor ?? state.transportVendors.find((item) => item.id === instruction?.vendorId);

  if (!instruction || !movement) {
    return <main className="public-document"><PublicHeader title="작업지시서를 찾을 수 없습니다" reference={instructionId} /><p>발송 이력에서 새 읽기 전용 주소를 열어 주십시오.</p></main>;
  }

  const details: Record<string, string> = {
    "고객명": customer?.name ?? "고객 확인",
    "고객명·연락처": `${customer?.name ?? "고객 확인"} · ${customer?.contact ?? "연락처 확인"}`,
    "상담 메모": customer?.consultations[0]?.note ?? "별도 상담 메모 없음",
    "희망 시각": `${movement.scheduledDate} · ${movement.desiredTime ?? "시간 확인 필요"}`,
    "희망 날짜·시각": `${movement.scheduledDate} · ${movement.desiredTime ?? "시간 확인 필요"}`,
    "출발지·도착지": movement.pickupAddress ?? `${warehouse?.name ?? movement.warehouseId} · ${movement.containerNo}`,
    "수취인 연락처": `${movement.recipient ?? customer?.name ?? "확인 필요"} · ${movement.recipientPhone ?? customer?.contact ?? "연락처 확인"}`,
    "수취인·연락처": `${movement.recipient ?? customer?.name ?? "확인 필요"} · ${movement.recipientPhone ?? customer?.contact ?? "연락처 확인"}`,
    "엘리베이터 여부": movement.elevator ?? "확인 필요",
  };

  return (
    <main className="public-document" data-public-document="work-order">
      <PublicHeader title={`${movement.kind} 작업지시서`} reference={`${instruction.id} · ${movement.id}`} />
      <section className="public-summary">
        <div><span>운송업체</span><strong>{vendor?.name ?? instruction.vendorName}</strong><small data-density="support">{vendor?.manager ?? movement.driver} · {vendor?.phone ?? ""}</small></div>
        <div><span>작업 장소</span><strong>{warehouse?.name ?? movement.warehouseId}</strong><small data-density="support">{warehouse?.address ?? movement.containerNo}</small></div>
        <div><span>예정 일시</span><strong>{movement.scheduledDate}</strong><small data-density="support">{movement.desiredTime ?? "시간 확인 필요"}</small></div>
      </section>
      <section className="public-section">
        <h2>전달 항목</h2>
        <dl className="public-detail-list">
          {instruction.fields.map((field) => <div key={field}><dt>{field}</dt><dd>{details[field] ?? "담당자 확인"}</dd></div>)}
        </dl>
      </section>
      <section className="public-section">
        <h2>발송 대상</h2>
        <ul className="public-check-list">{instruction.recipients.map((recipient) => <li key={recipient.label}><CheckCircle2 size={17} aria-hidden="true" /><span><strong>{recipient.label}</strong>{recipient.target}</span><em>{recipient.status}</em></li>)}</ul>
      </section>
      <footer className="public-footer"><ShieldCheck size={17} aria-hidden="true" /> 이 문서는 {instruction.sentAt}에 {instruction.sentBy} 담당자가 발송한 읽기 전용 작업지시서입니다.</footer>
    </main>
  );
}

function CustomerNotice({ contractId }: { contractId: string }) {
  const { state, derived } = useStore();
  const contract = derived.contractById.get(contractId) ?? state.contracts[0];
  const customer = contract ? derived.customerOf(contract) : undefined;
  const warehouse = contract ? derived.warehouseById.get(contract.warehouseId) : undefined;
  const photos = state.movements
    .filter((movement) => movement.contractId === contract?.id)
    .flatMap((movement) => movement.photos.map((photo) => ({ ...photo, movement })))
    .filter((photo) => photo.visibility === "고객 열람");

  if (!contract) return <main className="public-document"><PublicHeader title="고객 공지를 찾을 수 없습니다" reference={contractId} /></main>;

  return (
    <main className="public-document" data-public-document="customer-notice">
      <PublicHeader title="보관 계약 안내" reference={`${contract.id} · ${customer?.name ?? "고객"}`} />
      <section className="public-summary">
        <div><span>보관 위치</span><strong>{warehouse?.name ?? contract.warehouseId}</strong><small data-density="support">{contract.containerNo}</small></div>
        <div><span>계약 기간</span><strong>{contract.startDate} ~ {contract.endDate}</strong><small data-density="support">월 {formatWon(contract.monthlyFee - contract.discount)}</small></div>
        <div><span>계약 상태</span><strong>{contract.status}</strong><small data-density="support">{customer?.storageStatus ?? "보관 상태 확인"}</small></div>
      </section>
      <section className="public-section">
        <h2>공지사항</h2>
        {state.notices.map((notice) => <article className="public-notice" key={notice.id}><h3>{notice.title}</h3><p>{notice.body}</p><small data-density="support">{notice.postedAt} · {notice.author}</small></article>)}
      </section>
      <section className="public-section">
        <h2>고객 공개 사진</h2>
        {photos.length ? <div className="public-photo-grid">{photos.map((photo) => <figure key={`${photo.movement.id}-${photo.name}`}><div className="public-photo-placeholder"><Container size={30} aria-hidden="true" /><span>{photo.movement.kind} 현장 사진</span></div><figcaption><strong>{photo.name}</strong><span data-density="support">{photo.at} · {photo.movement.containerNo}</span></figcaption></figure>)}</div> : <p>고객에게 공개된 현장 사진이 없습니다.</p>}
      </section>
      <footer className="public-footer"><ShieldCheck size={17} aria-hidden="true" /> 고객 공지 페이지는 계약과 고객 공개 사진만 표시하며 수정 기능을 제공하지 않습니다.</footer>
    </main>
  );
}

export default function PublicAccess({ mode, id }: { mode: string; id: string }) {
  return mode === "work-order" ? <WorkOrder instructionId={id} /> : <CustomerNotice contractId={id} />;
}
