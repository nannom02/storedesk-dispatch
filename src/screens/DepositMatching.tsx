import { useMemo, useState } from "react";
import {
  CheckCircle2,
  CircleHelp,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Landmark,
  Upload,
} from "lucide-react";

import {
  DescGrid,
  Modal,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StageRail,
  StateText,
  TableWrap,
} from "../components/ui";
import { currentBatch } from "../data/seed";
import { downloadTextFile } from "../data/download";
import { formatWon } from "../data/utils";
import { useStore } from "../store";

const REVIEW_TONE: Record<string, "warn" | "bad" | "info" | "ok"> = {
  동명이인: "warn",
  "별칭 미등록": "warn",
  "분할 입금": "info",
  "계약 없음": "bad",
  정상: "ok",
};

const REVIEW_LABEL: Record<string, string> = {
  "별칭 미등록": "등록 입금자명 없음",
};

const MATCHING_STEPS = [
  "거래내역 가져오기",
  "파일 검증",
  "자동 대조",
  "예외 검토",
  "완료·결과서",
];

export default function DepositMatching({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  const { state, derived, actions } = useStore();
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [intakeStage, setIntakeStage] = useState<"choose" | "validate">("choose");
  const [guideActive, setGuideActive] = useState(false);
  const [bankInfoOpen, setBankInfoOpen] = useState(false);

  const activeBatchId = selectedBatchId ?? state.batches[0]?.id ?? "";
  const batch = state.batches.find((item) => item.id === activeBatchId) ?? state.batches[0];
  const uploaded = state.batches.some((item) => item.id === currentBatch.id);

  const rows = useMemo(
    () => state.txs.filter((tx) => tx.batchId === activeBatchId),
    [state.txs, activeBatchId],
  );

  // 회차 카드의 숫자는 저장된 요약이 아니라 그 회차의 실제 거래 행에서 센다.
  const statsOf = (batchId: string) => {
    const items = state.txs.filter((tx) => tx.batchId === batchId);
    return {
      count: items.length,
      amount: items.reduce((sum, tx) => sum + tx.amount, 0),
      auto: items.filter((tx) => tx.status === "자동 매칭").length,
      review: items.filter((tx) => tx.status !== "자동 매칭").length,
    };
  };

  const autoCount = rows.filter((tx) => tx.status === "자동 매칭").length;
  const reviewCount = rows.filter((tx) => tx.status === "검토 필요").length;
  const linkedCount = rows.filter((tx) => tx.status === "연결 완료").length;
  const heldCount = rows.filter((tx) => tx.status === "보류").length;
  const total = rows.reduce((sum, tx) => sum + tx.amount, 0);
  const currentRows = state.txs.filter((tx) => tx.batchId === currentBatch.id);
  const currentReviewCount = currentRows.filter((tx) => tx.status === "검토 필요").length;
  const currentAutoCount = currentRows.filter((tx) => tx.status === "자동 매칭").length;
  const matchingStepIndex = uploaded
    ? currentReviewCount > 0
      ? 3
      : 4
    : intakeStage === "validate"
      ? 1
      : 0;
  const guideTarget = uploaded
    ? currentReviewCount > 0
      ? "review"
      : "report"
    : intakeStage === "validate"
      ? "run"
      : "source";

  function runMatching() {
    actions.uploadBatch();
    setSelectedBatchId(currentBatch.id);
  }

  function exportReport() {
    const header = "거래ID,입금일,입금자명,금액,상태,판정 사유,연결 계약,처리자,처리 시각";
    const body = rows
      .map((tx) =>
        [
          tx.id,
          tx.date,
          tx.payerName,
          tx.amount,
          tx.status,
          `"${tx.reason.replaceAll('"', "'")}"`,
          tx.contractId ?? "-",
          tx.handledBy ?? "-",
          tx.handledAt ?? "-",
        ].join(","),
      )
      .join("\n");
    downloadTextFile(`입금대조결과서_${batch?.id ?? "batch"}.csv`, `${header}\n${body}`);
    actions.exportMatchReport(batch?.id ?? "");
  }

  return (
    <div className="screen">
      <PageHead
        kicker="정산 · 입금과 계약 자동 대조"
        title="입금 계약 자동 대조"
        lead="은행 거래내역을 가져와 계약 입금과 자동으로 연결하고, 판단이 필요한 예외만 확인합니다."
        actions={
          <>
            <button
              type="button"
              className="ghost-button"
              aria-pressed={guideActive}
              onClick={() => setGuideActive((active) => !active)}
            >
              <CircleHelp size={16} aria-hidden="true" />
              1분 사용 안내
            </button>
            <span
              className="deposit-guided-action deposit-guided-action-compact"
              data-guide-active={guideTarget === "report" ? "true" : undefined}
            >
              <button type="button" className="ghost-button" onClick={exportReport}>
                <Download size={16} aria-hidden="true" />
                대조 결과서 내려받기
              </button>
              {guideActive && guideTarget === "report" ? (
                <span
                  className="deposit-action-helper"
                  role="status"
                  aria-label="마지막으로 결과서를 내려받아 처리 내역을 보관하세요."
                >
                  마지막으로 결과서를 내려받아 처리 내역을 보관하세요.
                </span>
              ) : null}
            </span>
          </>
        }
      />

      <Panel
        className="deposit-workbench"
        title={
          uploaded
            ? currentReviewCount > 0
              ? "자동 대조 완료 · 예외 건을 확인하세요"
              : "대조가 완료되었습니다"
            : intakeStage === "validate"
              ? "지금 할 일 · 파일 검증 결과를 확인하세요"
              : "지금 할 일 · 거래내역을 가져오세요"
        }
        description={
          uploaded
            ? "자동으로 연결된 거래는 계약 입금 이력에 반영했습니다. 판단이 필요한 건만 다음 단계에서 처리합니다."
            : intakeStage === "validate"
              ? "계좌·기간·건수·금액과 중복 여부를 확인한 뒤 대조를 실행합니다."
              : "엑셀 파일을 가져오거나 은행 연동을 설정하세요. 어느 방식이든 같은 검증 단계로 이어집니다."
        }
      >
        <div className="stack">
          <StageRail steps={MATCHING_STEPS} currentIndex={matchingStepIndex} connected />

          {!uploaded && intakeStage === "choose" ? (
          <div className="deposit-source-grid" role="group" aria-label="거래내역 가져오기 방식">
            <section className="deposit-source-option" aria-labelledby="deposit-file-title">
              <span className="deposit-source-icon" aria-hidden="true">
                <FileSpreadsheet size={22} />
              </span>
              <span className="deposit-source-copy">
                <strong id="deposit-file-title">엑셀 파일로 가져오기</strong>
                <small data-density="support">
                  국민은행 거래내역 샘플을 선택하고 필수 열과 중복 여부를 먼저 검증합니다.
                </small>
              </span>
              <span
                className="deposit-guided-action"
                data-guide-active={guideTarget === "source" ? "true" : undefined}
              >
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIntakeStage("validate")}
                  aria-label="엑셀 파일 가져오기"
                >
                  <Upload size={16} aria-hidden="true" />
                  엑셀 파일 가져오기
                </button>
                {guideActive && guideTarget === "source" ? (
                  <span
                    className="deposit-action-helper"
                    role="status"
                    aria-label="먼저 이 버튼으로 은행 거래내역을 선택하세요."
                  >
                    먼저 이 버튼으로 은행 거래내역을 선택하세요.
                  </span>
                ) : null}
              </span>
            </section>

            <section className="deposit-source-option" aria-labelledby="deposit-bank-title">
              <span className="deposit-source-icon" aria-hidden="true">
                <Landmark size={22} />
              </span>
              <span className="deposit-source-copy">
                <strong id="deposit-bank-title">은행에서 자동으로 가져오기</strong>
                <small data-density="support">
                  계좌조회 API나 기업뱅킹 파일 연계가 가능하면 같은 검증 단계로 자동 수집합니다.
                </small>
              </span>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setBankInfoOpen(true)}
                aria-label="은행 연동 설정"
              >
                <Landmark size={16} aria-hidden="true" />
                은행 연동 설정
              </button>
            </section>
          </div>
          ) : null}

          {!uploaded && intakeStage === "validate" ? (
          <div className="deposit-validation" role="status" aria-label="파일 검증 결과">
            <div className="deposit-validation-head">
              <span className="deposit-source-icon" aria-hidden="true">
                <FileCheck2 size={22} />
              </span>
              <div>
                <strong>{currentBatch.fileName}</strong>
                <p>대조 전에 실제 반영될 범위를 확인하세요.</p>
              </div>
            </div>

            <DescGrid
              columns="3"
              items={[
                { label: "은행·계좌", value: `${currentBatch.bank} · 014-***-928401` },
                { label: "거래 기간", value: "2026-09-01 ~ 2026-09-02" },
                { label: "거래 건수", value: `${currentBatch.totalCount}건` },
                { label: "입금 합계", value: formatWon(currentBatch.totalAmount) },
                { label: "등록 입금자명", value: `${state.aliases.length}건과 비교` },
                { label: "업로드 담당자", value: currentBatch.uploadedBy },
              ]}
            />

            <ul className="deposit-validation-checks" aria-label="파일 검증 항목">
              <li><CheckCircle2 size={17} aria-hidden="true" />필수 열 4개 확인 · 거래일시, 입금자명, 금액, 적요</li>
              <li><CheckCircle2 size={17} aria-hidden="true" />중복 배치 없음 · 파일명과 거래 건수 기준</li>
              <li><CheckCircle2 size={17} aria-hidden="true" />금액 형식 정상 · 합계 {formatWon(currentBatch.totalAmount)}</li>
            </ul>

            <div className="deposit-workbench-actions">
              <button type="button" className="ghost-button" onClick={() => setIntakeStage("choose")}>
                파일 다시 선택
              </button>
              <span
                className="deposit-guided-action"
                data-guide-active={guideTarget === "run" ? "true" : undefined}
              >
                <button
                  type="button"
                  className="primary-button"
                  onClick={runMatching}
                >
                  <Upload size={16} aria-hidden="true" />
                  검증 완료 후 대조 실행
                </button>
                {guideActive && guideTarget === "run" ? (
                  <span
                    className="deposit-action-helper"
                    role="status"
                    aria-label="검증 항목이 모두 정상입니다. 이제 자동 대조를 실행하세요."
                  >
                    검증 항목이 모두 정상입니다. 이제 자동 대조를 실행하세요.
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          ) : null}

          {uploaded ? (
          <div className="deposit-completion" role="status" aria-label="대조 작업 진행 상태">
            <div>
              <span className="deposit-source-meta" data-density="support">이번 배치 {currentBatch.id}</span>
              <strong>
                {currentBatch.totalCount}건 중 {currentAutoCount}건을 자동 연결했습니다
              </strong>
              <p>
                {currentReviewCount > 0
                  ? `판단이 필요한 ${currentReviewCount}건은 계약을 변경하지 않고 검토 목록에 남겼습니다.`
                  : "모든 거래의 계약 반영과 처리 이력 기록이 끝났습니다."}
              </p>
            </div>
          </div>
          ) : null}
        </div>
      </Panel>

      {!uploaded ? (
        <NoticeBar
          variant="info"
          icon={<FileSpreadsheet size={18} />}
          title="최근 완료 배치는 아래에서 확인할 수 있습니다"
        >
          새 대조 작업과 과거 결과를 섞지 않았습니다. 파일을 선택하기 전에는 아래 배치와 계약
          이력이 바뀌지 않습니다.
        </NoticeBar>
      ) : null}

      <PanelRow columns="7-5">
        <Panel
          title={uploaded && batch?.id === currentBatch.id ? "이번 대조 결과" : "최근 완료 배치 결과"}
          description="배치를 선택하면 그 회차의 거래 목록과 요약이 바뀝니다."
        >
          <div
            className="stack"
            data-gap="tight"
            role="status"
            aria-label="대조 배치 요약"
          >
            <div className="inline" data-justify="between">
              <span className="cell-strong">
                {batch?.id} · {batch?.fileName}
              </span>
              <span className="record-meta" data-density="support">
                업로드 {batch?.uploadedAt} · {batch?.uploadedBy}
              </span>
            </div>
            <DescGrid
              columns="3"
              items={[
                { label: "적재 건수", value: `${rows.length}건` },
                { label: "금액 합계", value: formatWon(total) },
                { label: "자동 매칭", value: `${autoCount}건` },
                { label: "수동 연결 완료", value: `${linkedCount}건` },
                { label: "검토 대기", value: `${reviewCount}건` },
                { label: "보류", value: `${heldCount}건` },
              ]}
            />
          </div>

          <TableWrap
            footer={
              <>
                <span>
                  {rows.length}건 · 자동 {autoCount} / 수동 {linkedCount} / 검토 {reviewCount} / 보류{" "}
                  {heldCount}
                </span>
                <span className="tabular">합계 {formatWon(total)}</span>
              </>
            }
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">거래</th>
                  <th scope="col" data-priority="low">입금일</th>
                  <th scope="col">입금자명</th>
                  <th scope="col" className="numeric">금액</th>
                  <th scope="col">상태</th>
                  <th scope="col">연결 계약</th>
                  <th scope="col" data-priority="low">처리자</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => (
                  <tr key={tx.id}>
                    <td data-label="거래">
                      <span className="cell-strong id-cell">{tx.id}</span>
                      <span className="cell-sub" data-density="support">{tx.bank}</span>
                    </td>
                    <td data-label="입금일" data-priority="low" className="date-cell">{tx.date}</td>
                    <td data-label="입금자명">{tx.payerName}</td>
                    <td data-label="금액" className="numeric amount tabular">{formatWon(tx.amount)}</td>
                    <td data-label="상태">
                      <StateText
                        tone={
                          tx.status === "자동 매칭" || tx.status === "연결 완료"
                            ? "ok"
                            : tx.status === "보류"
                              ? "bad"
                              : REVIEW_TONE[tx.reviewKind] ?? "warn"
                        }
                      >
                        {tx.status}
                        {tx.status === "검토 필요"
                          ? ` · ${REVIEW_LABEL[tx.reviewKind] ?? tx.reviewKind}`
                          : ""}
                      </StateText>
                    </td>
                    <td data-label="연결 계약">
                      {tx.contractId ? (
                        <>
                          <span className="cell-strong id-cell">{tx.contractId}</span>
                          <span className="cell-sub" data-density="support">
                            {derived.contractLabel(tx.contractId)}
                          </span>
                        </>
                      ) : (
                        <span className="muted">미연결</span>
                      )}
                    </td>
                    <td data-label="처리자" data-priority="low">
                      {tx.handledBy ?? "-"}
                      <span className="cell-sub" data-density="support">{tx.handledAt ?? ""}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {reviewCount > 0 ? (
            <NoticeBar
              variant="review"
              title={`검토 대기 ${reviewCount}건`}
              action={
                <span
                  className="deposit-guided-action deposit-guided-action-compact"
                  data-guide-active={guideTarget === "review" ? "true" : undefined}
                >
                  <button type="button" className="ghost-button" onClick={() => onNavigate("unmatched")}>
                    미매칭 검토로 이동
                  </button>
                  {guideActive && guideTarget === "review" ? (
                    <span
                      className="deposit-action-helper"
                      role="status"
                      aria-label="자동으로 연결하지 못한 예외만 확인하면 됩니다."
                    >
                      자동으로 연결하지 못한 예외만 확인하면 됩니다.
                    </span>
                  ) : null}
                </span>
              }
            >
              자동 판정을 멈춘 건입니다. 판정 근거를 비교해 연결하거나 보류하면 계약 만료일과 연체
              상태가 함께 갱신됩니다.
            </NoticeBar>
          ) : null}
        </Panel>

        <div className="stack">
          <Panel title="배치 이력" description="회차를 눌러 그때의 대조 결과를 확인합니다.">
            <ul className="record-list">
              {state.batches.map((item) => {
                const stats = statsOf(item.id);
                return (
                <li key={item.id}>
                  <div className="record-list-head">
                    <strong>{item.id}</strong>
                    <span className="record-meta" data-density="support">{item.uploadedAt}</span>
                  </div>
                  <p>
                    {item.fileName} · {stats.count}건 · {formatWon(stats.amount)}
                  </p>
                  <div className="inline">
                    <StateText tone="ok">자동 {stats.auto}건</StateText>
                    <StateText tone="warn">검토 {stats.review}건</StateText>
                    <button
                      type="button"
                      className="quiet-button"
                      aria-label={`${item.id} 배치 열기`}
                      onClick={() => setSelectedBatchId(item.id)}
                    >
                      이 배치 보기
                    </button>
                  </div>
                </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            title="등록 입금자명 관리"
            description="사람이 한 번 연결한 입금자명은 고객의 등록 입금자명에 추가되어 다음 업로드부터 자동으로 매칭됩니다."
          >
            <TableWrap>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">입금자명</th>
                    <th scope="col">연결 고객</th>
                    <th scope="col">저장 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {state.aliases.map((alias) => (
                    <tr key={alias.id}>
                      <td data-label="입금자명">
                        <span className="cell-strong">{alias.payerName}</span>
                        <span className="cell-sub" data-density="support">{alias.learnedFrom}</span>
                      </td>
                      <td data-label="연결 고객">
                        {derived.customerById.get(alias.customerId)?.name ?? alias.customerId}
                      </td>
                      <td data-label="저장 시각" className="date-cell">{alias.learnedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </Panel>

          <Panel title="내보내기 이력" description="결과서를 언제 누가 내려받았는지 남습니다.">
            <div role="status" aria-label="내보내기 이력">
              {state.reportExports.length === 0 ? (
                <p className="panel-note">아직 내려받은 결과서가 없습니다.</p>
              ) : (
                <ul className="record-list">
                  {state.reportExports.map((item) => (
                    <li key={item.id}>
                      <div className="record-list-head">
                        <strong>입금대조결과서_{item.batchId}.csv</strong>
                        <span className="record-meta" data-density="support">{item.at}</span>
                      </div>
                      <p>{item.by}이 내려받았습니다.</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>
        </div>
      </PanelRow>

      <Panel
        title="자동 매칭 규칙"
        description="이 규칙은 요구사항 정의서의 입금 대조 규칙과 같은 내용이며 환경 설정에서 관리합니다."
      >
        <DescGrid
          columns="2"
          items={[
            { label: "1순위 · 계약자명 일치", value: "계약자명과 입금자명이 같고 금액이 월 이용료와 같으면 자동 확정" },
            { label: "2순위 · 등록 입금자명", value: "고객에 등록된 입금자명과 같으면 자동 확정" },
            { label: "동명이인", value: "같은 이름이 둘 이상이면 자동 확정을 멈추고 금액·계약 정보를 비교" },
            { label: "금액 미달", value: "월 이용료보다 적으면 분할 입금 후보로 분류하고 합산 대상을 표시" },
            { label: "초과 입금", value: "월 이용료의 배수이면 그만큼 만료일을 연장" },
            { label: "계약 없음", value: "연결할 계약이 없으면 보류로 이관하고 담당자에게 문자로 통지" },
          ]}
        />
      </Panel>

      {bankInfoOpen ? (
        <Modal
          title="은행 자동 수집 연동 조건"
          description="은행 연동은 가능한 방식과 발주처 준비 정보를 확인한 뒤 활성화합니다."
          onClose={() => setBankInfoOpen(false)}
          actions={
            <button type="button" className="primary-button" onClick={() => setBankInfoOpen(false)}>
              조건 확인
            </button>
          }
        >
          <DescGrid
            columns="2"
            items={[
              { label: "가능 방식", value: "계좌조회 API · 기업뱅킹 파일 자동 수집" },
              { label: "착수 시 확인", value: "거래 은행·계좌 유형·API 제공 범위" },
              { label: "발주처 준비", value: "조회 권한·인증 수단·테스트 계좌" },
              { label: "기본 운영", value: "연동 전까지 엑셀 파일 업로드 사용" },
            ]}
          />
          <NoticeBar variant="info" title="연동 여부와 관계없이 이후 대조 절차는 같습니다">
            거래내역이 들어오면 파일 검증, 자동 대조, 예외 검토, 결과서 확인 순서로 처리합니다.
          </NoticeBar>
        </Modal>
      ) : null}
    </div>
  );
}
