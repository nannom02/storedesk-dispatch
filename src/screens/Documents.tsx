import { useMemo, useRef, useState } from "react";
import { Copy, Download, ExternalLink, Eye, Images, Send, Upload } from "lucide-react";

import {
  ChipGroup,
  DescGrid,
  Modal,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { downloadElementAsPdf, downloadPhotoArchive } from "../data/download";
import { TODAY } from "../data/seed";
import { formatWon, overdueFee } from "../data/utils";
import { useStore } from "../store";
import type { DocumentTemplate } from "../data/types";

const TEMPLATES: { id: DocumentTemplate; label: string }[] = [
  { id: "개인", label: "개인" },
  { id: "법인", label: "법인" },
  { id: "법원", label: "법원" },
];

const TEMPLATE_TITLE: Record<DocumentTemplate, string> = {
  개인: "보관 계약 만료 안내문",
  법인: "보관 계약 만료 및 세금계산서 발행 안내문",
  법원: "보관물 인도 및 지급명령 신청 사전 안내문",
};

const TEMPLATE_INTRO: Record<DocumentTemplate, string> = {
  개인:
    "안녕하세요. 보관 계약 만료일이 다가와 안내드립니다. 아래 기간까지 이용료를 입금하시면 별도 절차 없이 자동으로 연장됩니다.",
  법인:
    "귀사의 보관 계약 만료일과 이번 달 청구 내역을 안내드립니다. 세금계산서는 입금 확인 후 등록된 담당자 메일로 발행됩니다.",
  법원:
    "귀하의 보관 계약은 이용료 미납으로 종료 절차가 진행 중입니다. 본 안내문은 지급명령 신청 전 최종 통지이며, 아래 기한까지 미납액이 입금되지 않으면 법적 절차가 진행됩니다.",
};

export default function Documents() {
  const { state, derived, actions } = useStore();
  const [contractId, setContractId] = useState("SC-2026-0640");
  const [template, setTemplate] = useState<DocumentTemplate>("법인");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [documentAction, setDocumentAction] = useState("계약 내용과 사진을 선택해 작업할 수 있습니다.");
  const documentRef = useRef<HTMLDivElement>(null);

  const contract = derived.contractById.get(contractId);
  const customer = contract ? derived.customerOf(contract) : undefined;
  const warehouse = contract ? derived.warehouseById.get(contract.warehouseId) : undefined;
  const fee = contract
    ? overdueFee(
        contract.unpaidPrincipal,
        contract.overdueDays,
        state.settings.overdueRatePercent,
        state.settings.overdueGraceDays,
      )
    : 0;
  const chargeable = (contract?.monthlyFee ?? 0) - (contract?.discount ?? 0);
  const title = `${customer?.name ?? "고객"} ${TEMPLATE_TITLE[template]}`;

  const contractDocs = useMemo(
    () => state.documents.filter((doc) => doc.contractId === contractId),
    [state.documents, contractId],
  );
  const contractPhotos = state.movements
    .filter((movement) => movement.contractId === contractId)
    .flatMap((movement) => movement.photos.map((photo) => ({
      ...photo,
      kind: movement.kind,
      movementId: movement.id,
      warehouse: derived.warehouseById.get(movement.warehouseId)?.name ?? movement.warehouseId,
      containerNo: movement.containerNo,
    })));

  function buildDocumentText() {
    return [
      TEMPLATE_TITLE[template],
      "".padEnd(40, "-"),
      `문서 종류: 계약 안내문 (${template} 양식)`,
      `발행일: ${TODAY}`,
      `계약번호: ${contract?.id}`,
      `고객: ${customer?.name} (${customer?.kind})`,
      `보관 창고: ${warehouse?.name} · ${warehouse?.address}`,
      `컨테이너: ${contract?.containerNo}`,
      `보관 기간: ${contract?.startDate} ~ ${contract?.endDate}`,
      "",
      TEMPLATE_INTRO[template],
      "",
      "[세부 내역서]",
      `월 이용료: ${formatWon(contract?.monthlyFee ?? 0)}`,
      `할인: ${formatWon(contract?.discount ?? 0)}`,
      `청구 금액: ${formatWon(chargeable)}`,
      `미납 원금: ${formatWon(contract?.unpaidPrincipal ?? 0)}`,
      `연체료: ${formatWon(fee)}`,
      `보증금: ${formatWon(contract?.deposit ?? 0)}`,
      `입금 계좌: 국민은행 612301-04-882014 (주)보관에스디`,
      "",
      template === "법원"
        ? `법적 절차: 지급명령 신청 예정 · 사건번호 ${contract?.legalCaseNo ?? "미부여"}`
        : `문의: 담당 ${customer?.manager ?? "김도현"} · 02-3149-7700`,
    ].join("\n");
  }

  async function downloadPdf() {
    if (!documentRef.current) return;
    setDocumentAction("PDF 문서를 생성하고 있습니다.");
    await downloadElementAsPdf(documentRef.current, `${title}.pdf`);
    actions.createDocument(contractId, template, `${title} (PDF 내려받기)`);
    setDocumentAction(`${title}.pdf를 내려받고 문서함에 생성 이력을 남겼습니다.`);
  }

  async function copyContractContent() {
    try {
      await navigator.clipboard?.writeText(buildDocumentText());
      setDocumentAction(`${contract?.id} 계약 내용을 클립보드에 복사했습니다.`);
    } catch {
      setDocumentAction(`${contract?.id} 계약 내용을 선택할 수 있도록 준비했습니다. 브라우저의 클립보드 권한을 확인해 주세요.`);
    }
  }

  async function downloadPhotos() {
    if (!contractPhotos.length) return;
    setDocumentAction(`${contractPhotos.length}개 사진을 ZIP 파일로 묶고 있습니다.`);
    await downloadPhotoArchive(contractPhotos, `${contract?.id}_입출고_사진.zip`);
    setDocumentAction(`${contractPhotos.length}개 JPEG 사진과 목록을 ZIP 파일로 내려받았습니다.`);
  }

  const documentBody = (
    <div className="doc-preview" ref={documentRef}>
      <article className="doc-page">
        <header className="doc-page-head">
          <h3>{TEMPLATE_TITLE[template]}</h3>
          <span data-density="support">
            문서번호 DOC-{TODAY.replaceAll("-", "").slice(2)}-{contract?.id.slice(-4)} · {template} 양식 ·{" "}
            {warehouse?.name}
          </span>
        </header>
        <div className="doc-body">
          <p>
            {customer?.name} 귀하 ({customer?.kind} · 고객번호 {customer?.id})
          </p>
          <p>{TEMPLATE_INTRO[template]}</p>
          <h4>1. 계약 정보</h4>
          <DescGrid
            columns="2"
            items={[
              { label: "계약번호", value: contract?.id ?? "-" },
              { label: "보관 창고", value: `${warehouse?.name} · ${warehouse?.storageType}` },
              { label: "컨테이너 번호", value: contract?.containerNo ?? "-" },
              { label: "보관 기간", value: `${contract?.startDate} ~ ${contract?.endDate}` },
              { label: "결제 구분", value: contract?.payMethod ?? "-" },
              { label: "계약 상태", value: contract?.status ?? "-" },
            ]}
          />
          <h4>2. 청구 내역</h4>
          <TableWrap>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">항목</th>
                  <th scope="col">대상 기간</th>
                  <th scope="col" className="numeric">금액</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="항목">월 보관 이용료</td>
                  <td data-label="대상 기간">2026-09</td>
                  <td data-label="금액" className="numeric amount tabular">
                    {formatWon(contract?.monthlyFee ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td data-label="항목">장기 이용 할인</td>
                  <td data-label="대상 기간">2026-09</td>
                  <td data-label="금액" className="numeric amount tabular">
                    -{formatWon(contract?.discount ?? 0)}
                  </td>
                </tr>
                <tr>
                  <td data-label="항목">연체료</td>
                  <td data-label="대상 기간">{contract?.overdueDays ?? 0}일</td>
                  <td data-label="금액" className="numeric amount tabular">{formatWon(fee)}</td>
                </tr>
              </tbody>
            </table>
          </TableWrap>
          <p>
            합계 청구 금액 <strong>{formatWon(chargeable + fee)}</strong> · 입금 계좌 국민은행
            612301-04-882014
          </p>
        </div>
        <footer className="doc-sign">
          <span>{TODAY}</span>
          <span>(주)보관에스디 · {warehouse?.name} 운영 담당 {customer?.manager ?? "김도현"}</span>
        </footer>
        <p className="doc-page-number" data-density="support">1 / 2</p>
      </article>

      <article className="doc-page">
        <header className="doc-page-head">
          <h3>세부 내역서</h3>
          <span data-density="support">계약 {contract?.id} · 입금 이력과 보관 이력</span>
        </header>
        <div className="doc-body">
          <h4>1. 입금 이력</h4>
          <TableWrap>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">입금일</th>
                  <th scope="col">입금자명</th>
                  <th scope="col" className="numeric">금액</th>
                  <th scope="col">처리 방식</th>
                </tr>
              </thead>
              <tbody>
                {(contract?.payments ?? []).map((payment) => (
                  <tr key={payment.id}>
                    <td data-label="입금일" className="date-cell">{payment.date}</td>
                    <td data-label="입금자명">{payment.payerName}</td>
                    <td data-label="금액" className="numeric amount tabular">
                      {formatWon(payment.amount)}
                    </td>
                    <td data-label="처리 방식">{payment.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <h4>2. 입출고 이력</h4>
          <ul className="record-list">
            {state.movements
              .filter((movement) => movement.contractId === contractId)
              .map((movement) => (
                <li key={movement.id}>
                  <div className="record-list-head">
                    <strong>
                      {movement.kind} · {movement.containerNo}
                    </strong>
                    <span className="record-meta" data-density="support">{movement.scheduledDate}</span>
                  </div>
                  <p>
                    {movement.team} {movement.driver} · {movement.done ? "완료" : "진행 중"}
                  </p>
                </li>
              ))}
          </ul>
          <h4>3. 안내 사항</h4>
          <p>
            {template === "법원"
              ? "본 내역서는 지급명령 신청 시 소명자료로 제출됩니다. 기재된 금액과 이력에 이의가 있으면 발행일로부터 7일 이내에 서면으로 알려 주십시오."
              : "입금이 확인되면 계약 만료일이 자동으로 연장되고, 연장 결과는 문자와 알림톡으로 다시 안내됩니다."}
          </p>
        </div>
        <p className="doc-page-number" data-density="support">2 / 2</p>
      </article>
    </div>
  );

  return (
    <div className="screen">
      <PageHead
        kicker="고객 소통 · 문서 자동 생성과 보관"
        title="계약 안내문·문서 보관"
        lead="계약 내용을 복사하고 입출고 사진을 묶어 내려받거나, 안내문·세부 내역서와 함께 고객에게 발송한 뒤 계약 건에 자동 보관합니다."
      />

      <Panel>
        <div className="filter-bar">
          <label className="field" style={{ maxWidth: "320px" }}>
            <span className="field-label">대상 계약</span>
            <select value={contractId} onChange={(event) => setContractId(event.target.value)}>
              {state.contracts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id} · {derived.customerOf(item)?.name} · {item.containerNo}
                </option>
              ))}
            </select>
          </label>
          <ChipGroup
            label="안내문 양식"
            options={TEMPLATES.map((item) => ({ id: item.id, label: item.label }))}
            value={template}
            onChange={(id) => setTemplate(id as DocumentTemplate)}
          />
          <span className="panel-note" role="status" aria-label="안내문 미리보기 요약">
            {template} 양식 · {TEMPLATE_TITLE[template]} · 청구 {formatWon(chargeable + fee)} ·{" "}
            {warehouse?.name}
          </span>
        </div>
        <div className="page-actions">
          <button type="button" className="primary-button" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} aria-hidden="true" />
            안내문 미리보기
          </button>
          <button type="button" className="ghost-button" onClick={() => void downloadPdf()}>
            <Download size={16} aria-hidden="true" />
            PDF 내려받기
          </button>
          <button type="button" className="ghost-button" onClick={() => void copyContractContent()}>
            <Copy size={16} aria-hidden="true" /> 계약 내용 복사
          </button>
          <button type="button" className="ghost-button" disabled={contractPhotos.length === 0} title={contractPhotos.length === 0 ? "이 계약에 연결된 사진이 없습니다." : undefined} onClick={() => void downloadPhotos()}>
            <Images size={16} aria-hidden="true" /> 사진 묶음 다운로드
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() =>
              actions.sendDocument(
                contractId,
                template,
                title,
                `${customer?.name} · ${customer?.subContact ?? customer?.contact}`,
              )
            }
          >
            <Send size={16} aria-hidden="true" />
            안내문·세부 내역서 동시 발송
          </button>
          <label className="ghost-button file-button">
            <Upload size={16} aria-hidden="true" />
            계약서 파일 선택
            <input
              type="file"
              className="visually-hidden"
              aria-label="계약서 파일 선택"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) actions.uploadContractFile(contractId, file.name);
                event.currentTarget.value = "";
              }}
            />
          </label>
          <button
            type="button"
            className="quiet-button"
            onClick={() => actions.uploadContractFile(contractId, `${contractId}_계약서_예시.pdf`)}
          >
            계약서 예시 등록
          </button>
        </div>
        <p className="panel-note" role="status" aria-label="문서 작업 결과">{documentAction}</p>
      </Panel>

      <PanelRow columns="7-5">
        <Panel
          title="문서 미리보기"
          description="발송·다운로드되는 실제 문서와 같은 구성입니다. 양식을 바꾸면 본문과 문구가 함께 바뀝니다."
        >
          {documentBody}
        </Panel>

        <div className="stack">
          <Panel
            title="이 계약의 문서함"
            description="발송한 문서는 발송 일시와 함께 자동으로 보관됩니다."
          >
            <div role="status" aria-label="문서 보관함 요약">
              <DescGrid
                columns="2"
                items={[
                  { label: "보관 문서", value: `${contractDocs.length}건` },
                  {
                    label: "최근 발송",
                    value:
                      contractDocs.find((doc) => doc.sentAt)?.sentAt ?? "발송 이력 없음",
                  },
                  { label: "전체 문서", value: `${state.documents.length}건` },
                  { label: "적용 양식", value: `${template} 양식` },
                ]}
              />
            </div>
            <TableWrap>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">문서</th>
                    <th scope="col">종류</th>
                    <th scope="col">발송</th>
                  </tr>
                </thead>
                <tbody>
                  {contractDocs.map((doc) => (
                    <tr key={doc.id}>
                      <td data-label="문서">
                        <span className="cell-strong">{doc.title}</span>
                        <span className="cell-sub" data-density="support">
                          {doc.id} · {doc.version} · {doc.uploadedBy}
                        </span>
                      </td>
                      <td data-label="종류">{doc.kind}</td>
                      <td data-label="발송">
                        <StateText tone={doc.sentAt ? "ok" : "neutral"}>
                          {doc.sentAt ?? "미발송"}
                        </StateText>
                      </td>
                    </tr>
                  ))}
                  {contractDocs.length === 0 ? (
                    <tr>
                      <td data-label="문서" colSpan={3}>
                        이 계약에 보관된 문서가 없습니다.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel
            title="고객 열람 페이지 미리보기"
            description="고객은 문자로 받은 링크에서 아래 화면만 봅니다. 로그인 없이 열람하며 개인정보는 최소로 표시합니다."
            actions={<a className="ghost-button" href={`?public=notice&contract=${encodeURIComponent(contractId)}`}><ExternalLink size={15} aria-hidden="true" /> 고객 공지 페이지 열기</a>}
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
                    <strong>계약 안내문</strong>
                    <span data-density="support">storedesk.app/notice/{contract?.id.toLowerCase()}</span>
                  </div>
                  <div className="phone-body">
                    <div className="phone-card">
                      <strong>{customer?.name} 님</strong>
                      <span data-density="support">
                        {warehouse?.name} · 창고번호 {contract?.containerNo}
                      </span>
                    </div>
                    <div className="phone-card">
                      <strong>{formatWon(chargeable + fee)}</strong>
                      <span data-density="support">
                        대상 기간 2026-09 · 만료일 {contract?.endDate}
                      </span>
                      <span data-density="support">국민은행 612301-04-882014</span>
                    </div>
                    <div className="phone-card">
                      <strong>연장·출고 신청</strong>
                      <span data-density="support">
                        아래 버튼을 누르면 기존 챗봇으로 연결되어 신청이 접수됩니다.
                      </span>
                    </div>
                    <div className="phone-card">
                      <strong>입고 사진 {contractPhotos.filter((photo) => photo.visibility === "고객 열람").length}장</strong>
                      <span data-density="support">고객 열람으로 분류된 사진만 이 링크에 표시합니다.</span>
                    </div>
                    <a className="phone-action" href={`?public=notice&contract=${encodeURIComponent(contractId)}`}>
                      고객 공지 전체 화면 열기
                    </a>
                  </div>
                  <span className="phone-home-indicator" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </PanelRow>

      {previewOpen ? (
        <Modal
          title="계약 안내문 미리보기"
          description={`${template} 양식 · ${contract?.id} · ${customer?.name}`}
          size="wide"
          onClose={() => setPreviewOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setPreviewOpen(false)}>
                닫기
              </button>
              <button type="button" className="primary-button" onClick={() => void downloadPdf()}>
                <Download size={16} aria-hidden="true" />
                이 문서 PDF 내려받기
              </button>
            </>
          }
        >
          {documentBody}
        </Modal>
      ) : null}
    </div>
  );
}
