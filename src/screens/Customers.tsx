import { useMemo, useState } from "react";
import { BellOff, MessageSquarePlus, Paperclip, Plus, Search, Settings2, UserPlus } from "lucide-react";

import {
  ChipGroup,
  DescGrid,
  Modal,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TablePagination,
  TableWrap,
} from "../components/ui";
import { customers as seedCustomers, TOTAL_CUSTOMERS } from "../data/seed";
import type { AcquisitionSource, CustomerKind } from "../data/types";
import { useStore } from "../store";

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "개인", label: "개인" },
  { id: "법인", label: "법인" },
];

const INITIAL_CUSTOMER = {
  kind: "법인" as CustomerKind,
  name: "(주)새길물류",
  representative: "최유진",
  contact: "02-6204-1187",
  subContact: "010-8651-2047",
  payerNames: "새길물류, 주식회사새길물류",
  smsOptOut: false,
  acquisitionSource: "카카오" as AcquisitionSource,
};

const PAGE_SIZE = 10;

export default function Customers() {
  const { state, actions } = useStore();
  const [filter, setFilter] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState("CU-0872");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState(INITIAL_CUSTOMER);
  const [customerError, setCustomerError] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);
  const [payerOpen, setPayerOpen] = useState(false);
  const [consultNote, setConsultNote] = useState(
    "만료 예정 안내 통화. 대표 개인 명의 입금 건은 등록 입금자명에 추가하기로 확인.",
  );
  const [consultChannel, setConsultChannel] = useState<"전화" | "방문" | "챗봇" | "문자">("전화");
  const [payerName, setPayerName] = useState("김성호");
  const [channelOpen, setChannelOpen] = useState(false);
  const [channelName, setChannelName] = useState("지역 제휴 문의");
  const [channelResult, setChannelResult] = useState("");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const term = keyword.trim();
    return state.customers.filter((customer) => {
      if (filter !== "all" && customer.kind !== filter) return false;
      if (!term) return true;
      return (
        customer.name.includes(term) ||
        customer.id.includes(term) ||
        customer.payerNames.some((name) => name.includes(term)) ||
        customer.contact.includes(term)
      );
    });
  }, [state.customers, filter, keyword]);

  const selected = state.customers.find((customer) => customer.id === selectedId);
  const contracts = state.contracts.filter((contract) => contract.customerId === selectedId);
  const totalCustomers =
    TOTAL_CUSTOMERS + Math.max(0, state.customers.length - seedCustomers.length);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (nextPage: number) => {
    const safePage = Math.min(Math.max(nextPage, 1), totalPages);
    setPage(safePage);
    const firstRow = rows[(safePage - 1) * PAGE_SIZE];
    if (firstRow) setSelectedId(firstRow.id);
  };

  const openCustomerForm = () => {
    setNewCustomer(INITIAL_CUSTOMER);
    setCustomerError("");
    setCustomerOpen(true);
  };

  const registerCustomer = () => {
    const name = newCustomer.name.trim();
    const contact = newCustomer.contact.trim();
    const payerNames = Array.from(
      new Set(
        newCustomer.payerNames
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );

    if (!name || !contact) {
      setCustomerError("고객명과 연락처를 입력해 주세요.");
      return;
    }

    const duplicate = state.customers.some(
      (customer) => customer.name === name && customer.contact === contact,
    );
    if (duplicate) {
      setCustomerError("같은 고객명과 연락처로 등록된 고객이 있습니다.");
      return;
    }

    const customerId = actions.registerCustomer({
      name,
      kind: newCustomer.kind,
      contact,
      subContact: newCustomer.subContact.trim() || undefined,
      representative: newCustomer.representative.trim() || undefined,
      payerNames: payerNames.length ? payerNames : [name],
      smsOptOut: newCustomer.smsOptOut,
      acquisitionSource: newCustomer.acquisitionSource,
    });

    setCreatedId(customerId);
    setSelectedId(customerId);
    setFilter("all");
    setKeyword("");
    setPage(1);
    setCustomerOpen(false);
  };

  return (
    <div className="screen">
      <PageHead
        kicker={`운영 · 관리 고객 ${totalCustomers.toLocaleString("ko-KR")}명`}
        title="고객·상담"
        lead="이름과 연락처만으로 빠르게 고객을 등록하고, 유입 경로·상담일지·복수 입금자명·수신 제외를 한 화면에서 관리합니다."
        actions={
          <>
            <button type="button" className="ghost-button" onClick={() => setChannelOpen(true)}>
              <Settings2 size={16} aria-hidden="true" />
              유입 채널 관리
            </button>
            <button type="button" className="primary-button" onClick={openCustomerForm}>
              <UserPlus size={16} aria-hidden="true" />
              신규 고객 등록
            </button>
          </>
        }
      />

      <Panel>
        <div className="filter-bar">
          <ChipGroup label="고객 구분" options={FILTERS} value={filter} onChange={(value) => { setFilter(value); setPage(1); }} />
          <label className="search-field">
            <Search size={16} aria-hidden="true" />
            <span className="visually-hidden">고객 검색</span>
            <input
              type="search"
              value={keyword}
              placeholder="고객명 · 고객번호 · 입금자명 · 연락처"
              onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
            />
          </label>
          <span className="panel-note" role="status" aria-label="고객 목록 요약">
            표시 {rows.length}명 · 개인 {rows.filter((c) => c.kind === "개인").length}명 / 법인{" "}
            {rows.filter((c) => c.kind === "법인").length}명 · 수신 제외{" "}
            {rows.filter((c) => c.smsOptOut).length}명
          </span>
          <span className="panel-note">
            전체 {totalCustomers.toLocaleString("ko-KR")}명 중 진행 중 계약이 있는 고객과 신규 등록 고객을 표시합니다.
          </span>
        </div>

        {createdId ? (
          <p className="customer-registration-result" role="status" aria-label="신규 고객 등록 결과">
            <strong>신규 등록 완료</strong>
            <span>{createdId} 고객이 목록에 추가되었으며 상세 정보를 바로 확인할 수 있습니다.</span>
          </p>
        ) : null}

        <TableWrap
          footer={
            <>
              <span>{rows.length ? `${pageStart + 1}-${Math.min(pageStart + PAGE_SIZE, rows.length)} / ${rows.length}명` : "0명 표시"} · 등록 입금자명 {rows.reduce((sum, c) => sum + c.payerNames.length, 0)}건</span>
              <TablePagination page={currentPage} totalItems={rows.length} pageSize={PAGE_SIZE} label="고객 목록" onChange={goToPage} />
            </>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">고객</th>
                <th scope="col" data-priority="low">구분</th>
                <th scope="col">연락처</th>
                <th scope="col">유입·상태</th>
                <th scope="col">등록 입금자명</th>
                <th scope="col">수신</th>
                <th scope="col" aria-label="행 작업" />
              </tr>
            </thead>
            <tbody>
              {pageRows.map((customer) => (
                <tr key={customer.id} aria-selected={customer.id === selectedId}>
                  <td data-label="고객">
                    <span className="cell-strong">{customer.name}</span>
                    <span className="cell-sub id-cell" data-density="support">{customer.id}</span>
                  </td>
                  <td data-label="구분" data-priority="low">{customer.kind}</td>
                  <td data-label="연락처">
                    {customer.contact}
                    {customer.subContact ? (
                      <span className="cell-sub" data-density="support">{customer.subContact}</span>
                    ) : null}
                  </td>
                  <td data-label="유입·상태">{customer.acquisitionSource ?? "기존 장부"}<span className="cell-sub">{customer.storageStatus ?? "보관중"}</span></td>
                  <td data-label="등록 입금자명">{customer.payerNames.join(", ")}</td>
                  <td data-label="수신">
                    <StateText tone={customer.smsOptOut ? "warn" : "ok"}>
                      {customer.smsOptOut ? "수신 제외" : "수신 동의"}
                    </StateText>
                  </td>
                  <td data-label="작업">
                    <div className="row-actions">
                      <button
                        type="button"
                        className="quiet-button"
                        aria-label={`${customer.name} 고객 상세`}
                        onClick={() => setSelectedId(customer.id)}
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
      </Panel>

      <PanelRow columns="7-5">
        <Panel
          title={selected ? `${selected.name} 상세` : "고객 상세"}
          description={selected ? `${selected.kind} · 담당 ${selected.manager}` : "고객을 선택하세요."}
          actions={
            selected ? (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setConsultOpen(true)}
                >
                  <MessageSquarePlus size={16} aria-hidden="true" />
                  상담일지 기록
                </button>
                <button type="button" className="ghost-button" onClick={() => setPayerOpen(true)}>
                  입금자명 추가
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => selected && actions.toggleOptOut(selected.id)}
                >
                  <BellOff size={16} aria-hidden="true" />
                  {selected.smsOptOut ? "수신 제외 해제" : "수신 제외 설정"}
                </button>
              </>
            ) : null
          }
        >
          <div role="status" aria-label="고객 상세">
            {selected ? (
              <DescGrid
                columns="3"
                items={[
                  { label: "고객번호", value: selected.id },
                  { label: "구분", value: selected.kind },
                  { label: "대표자·담당", value: selected.representative ?? "해당 없음" },
                  { label: "연락처", value: selected.contact },
                  { label: "보조 연락처", value: selected.subContact ?? "없음" },
                  { label: "등록일", value: selected.registeredAt },
                  { label: "유입 경로", value: selected.acquisitionSource ?? "기존 장부" },
                  { label: "운영 상태", value: selected.storageStatus ?? "보관중" },
                  { label: "등록 입금자명", value: selected.payerNames.join(", ") },
                  {
                    label: "수신 설정",
                    value: selected.smsOptOut ? "광고성 수신 제외 (발송 대상 제외)" : "수신 동의",
                  },
                  { label: "이관 출처", value: selected.migratedFrom ?? "신규 등록" },
                ]}
              />
            ) : (
              <p className="panel-note">목록에서 고객을 선택하면 상담 이력과 계약이 표시됩니다.</p>
            )}
          </div>

          {selected ? (
            <div className="stack" data-gap="tight" role="status" aria-label="상담 이력">
              <strong className="card-title">상담 이력 {selected.consultations.length}건</strong>
              <ul className="record-list">
                {selected.consultations.map((consultation) => (
                  <li key={consultation.id}>
                    <div className="record-list-head">
                      <strong>{consultation.channel} 상담</strong>
                      <span className="record-meta" data-density="support">
                        {consultation.at} · {consultation.author}
                      </span>
                    </div>
                    <p>{consultation.note}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>

        <div className="stack">
          <Panel title="이 고객의 계약" description="계약 상태와 컨테이너 배정을 함께 확인합니다.">
            <ul className="record-list">
              {contracts.map((contract) => (
                <li key={contract.id}>
                  <div className="record-list-head">
                    <strong>{contract.id}</strong>
                    <StateText tone={contract.status === "정상" ? "ok" : contract.status === "연체" ? "bad" : "warn"}>
                      {contract.status}
                    </StateText>
                  </div>
                  <p>
                    {contract.containerNo} · {contract.startDate} ~ {contract.endDate}
                  </p>
                </li>
              ))}
              {contracts.length === 0 ? (
                <li>
                  <p>진행 중인 계약이 없습니다.</p>
                </li>
              ) : null}
            </ul>
          </Panel>

          <Panel title="첨부파일" description="사업자등록증·신분증 사본 등 계약 근거 자료입니다.">
            {selected ? (
              <div className="page-actions">
                <label className="ghost-button file-button">
                  <Paperclip size={15} aria-hidden="true" />
                  고객 첨부파일 선택
                  <input
                    type="file"
                    className="visually-hidden"
                    aria-label="고객 첨부파일 선택"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) actions.uploadCustomerAttachment(selected.id, file.name);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => actions.uploadCustomerAttachment(selected.id, "사업자등록증_예시.pdf")}
                >
                  사업자등록증 예시 등록
                </button>
              </div>
            ) : null}
            <ul className="record-list" role="status" aria-label="고객 첨부파일 원장">
              {(selected?.attachments ?? []).map((file) => (
                <li key={file.name}>
                  <div className="record-list-head">
                    <strong>
                      <Paperclip size={15} aria-hidden="true" /> {file.name}
                    </strong>
                    <span className="record-meta" data-density="support">{file.uploadedAt}</span>
                  </div>
                </li>
              ))}
              {(selected?.attachments ?? []).length === 0 ? (
                <li>
                  <p>등록된 첨부파일이 없습니다.</p>
                </li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </PanelRow>

      {customerOpen ? (
        <Modal
          title="신규 고객 등록"
          description="공고 기준 최소값은 고객명과 연락처입니다. 나머지는 상담 중 확인되는 대로 보완합니다."
          onClose={() => setCustomerOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setCustomerOpen(false)}>
                취소
              </button>
              <button type="button" className="primary-button" onClick={registerCustomer}>
                고객 등록
              </button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field">
              <span className="field-label">고객 구분</span>
              <select
                value={newCustomer.kind}
                onChange={(event) =>
                  setNewCustomer((current) => ({
                    ...current,
                    kind: event.target.value as CustomerKind,
                  }))
                }
              >
                <option value="개인">개인</option>
                <option value="법인">법인</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">고객명</span>
              <input
                value={newCustomer.name}
                onChange={(event) =>
                  setNewCustomer((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">
                {newCustomer.kind === "법인" ? "대표자·담당" : "담당자"}
              </span>
              <input
                value={newCustomer.representative}
                onChange={(event) =>
                  setNewCustomer((current) => ({
                    ...current,
                    representative: event.target.value,
                  }))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">연락처</span>
              <input
                value={newCustomer.contact}
                onChange={(event) =>
                  setNewCustomer((current) => ({ ...current, contact: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">보조 연락처</span>
              <input
                value={newCustomer.subContact}
                onChange={(event) =>
                  setNewCustomer((current) => ({ ...current, subContact: event.target.value }))
                }
              />
            </label>
            <label className="field">
              <span className="field-label">유입 경로</span>
              <select
                value={newCustomer.acquisitionSource}
                onChange={(event) => setNewCustomer((current) => ({ ...current, acquisitionSource: event.target.value as AcquisitionSource }))}
              >
                {state.acquisitionChannels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
              </select>
            </label>
            <label className="field">
              <span className="field-label">수신 설정</span>
              <select
                value={newCustomer.smsOptOut ? "제외" : "동의"}
                onChange={(event) =>
                  setNewCustomer((current) => ({
                    ...current,
                    smsOptOut: event.target.value === "제외",
                  }))
                }
              >
                <option value="동의">수신 동의</option>
                <option value="제외">광고성 수신 제외</option>
              </select>
            </label>
            <label className="field" data-span="full">
              <span className="field-label">등록 입금자명</span>
              <input
                value={newCustomer.payerNames}
                onChange={(event) =>
                  setNewCustomer((current) => ({ ...current, payerNames: event.target.value }))
                }
                aria-describedby="payer-names-help"
              />
              <span id="payer-names-help" className="support-text" data-density="support">
                선택 입력입니다. 비워두면 고객명을 기본 입금자명으로 저장하고 나중에 추가할 수 있습니다.
              </span>
            </label>
          </div>
          {customerError ? (
            <p className="form-error" role="alert">
              {customerError}
            </p>
          ) : null}
        </Modal>
      ) : null}

      {channelOpen ? (
        <Modal
          title="유입 채널 관리"
          description="고객을 처음 알게 된 경로를 기준정보로 추가하면 신규 고객 등록에서 바로 선택할 수 있습니다."
          onClose={() => setChannelOpen(false)}
          actions={
            <button type="button" className="ghost-button" onClick={() => setChannelOpen(false)}>
              닫기
            </button>
          }
        >
          <div className="field-grid" data-single="true">
            <label className="field">
              <span className="field-label">새 유입 경로</span>
              <input value={channelName} onChange={(event) => setChannelName(event.target.value)} />
            </label>
            <button
              type="button"
              className="primary-button"
              disabled={!channelName.trim() || state.acquisitionChannels.includes(channelName.trim())}
              onClick={() => {
                const nextChannel = channelName.trim();
                actions.addAcquisitionChannel(nextChannel);
                setChannelResult(`${nextChannel} 유입 경로가 등록되어 고객 등록 선택지에 반영되었습니다.`);
                setNewCustomer((current) => ({ ...current, acquisitionSource: nextChannel }));
                setChannelName("");
              }}
            >
              <Plus size={16} aria-hidden="true" /> 유입 채널 추가
            </button>
          </div>
          <div className="recipient-statuses" aria-label="등록된 유입 경로">
            {state.acquisitionChannels.map((channel) => <span key={channel}>{channel}</span>)}
          </div>
          {channelResult ? <p role="status" aria-label="유입 채널 등록 결과" className="panel-note">{channelResult}</p> : null}
        </Modal>
      ) : null}

      {consultOpen && selected ? (
        <Modal
          title="상담일지 기록"
          description={`${selected.name} · 작성자 윤서진`}
          onClose={() => setConsultOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setConsultOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  actions.addConsultation(selected.id, consultChannel, consultNote);
                  setConsultOpen(false);
                }}
              >
                상담일지 저장
              </button>
            </>
          }
        >
          <div className="field-grid" data-single="true">
            <label className="field">
              <span className="field-label">상담 경로</span>
              <select
                value={consultChannel}
                onChange={(event) =>
                  setConsultChannel(event.target.value as "전화" | "방문" | "챗봇" | "문자")
                }
              >
                <option value="전화">전화</option>
                <option value="방문">방문</option>
                <option value="문자">문자</option>
                <option value="챗봇">챗봇</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">상담 내용</span>
              <textarea value={consultNote} onChange={(event) => setConsultNote(event.target.value)} />
            </label>
          </div>
        </Modal>
      ) : null}

      {payerOpen && selected ? (
        <Modal
          title="입금자명 추가"
          description="여기에 등록한 이름은 다음 거래내역 업로드부터 자동 대조 기준이 됩니다."
          onClose={() => setPayerOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setPayerOpen(false)}>
                취소
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  actions.addPayerName(selected.id, payerName.trim());
                  setPayerOpen(false);
                }}
              >
                입금자명 저장
              </button>
            </>
          }
        >
          <div className="field-grid" data-single="true">
            <label className="field">
              <span className="field-label">추가할 입금자명</span>
              <input value={payerName} onChange={(event) => setPayerName(event.target.value)} />
            </label>
            <p className="panel-note">
              현재 등록: {selected.payerNames.join(", ")}
            </p>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
