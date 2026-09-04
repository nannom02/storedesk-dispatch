import { CheckCircle2, PlayCircle, Wrench } from "lucide-react";

import {
  DescGrid,
  Meter,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { migrationSummary } from "../data/seed";
import { useStore } from "../store";

export default function Migration() {
  const { state, actions } = useStore();

  const openIssues = state.migrationIssues.filter((issue) => !issue.resolved);
  const errorRows = openIssues.reduce((sum, issue) => sum + issue.count, 0);
  const passedRows = migrationSummary.totalRows - errorRows;

  return (
    <div className="screen">
      <PageHead
        kicker="관리 · 기존 엑셀 장부 이관"
        title="데이터 이관·검증"
        lead="2026년 계약 장부 662행과 출고 장부 1,020행을 원문 보존 상태로 검증합니다. 완전 중복 25건, 연락처·날짜·창고번호 규칙과 금액 합계를 함께 확인합니다."
        actions={
          <button type="button" className="primary-button" onClick={actions.runMigrationValidation}>
            <PlayCircle size={16} aria-hidden="true" />
            검증 실행
          </button>
        }
      />

      {errorRows > 0 ? (
        <NoticeBar
          variant="review"
          title={`검증 오류 ${errorRows}행`}
          action={
            <button
              type="button"
              className="notice-action"
              onClick={() => actions.resolveMigrationIssue(openIssues[0].id)}
            >
              오류 행 수정 반영
            </button>
          }
        >
          오류가 남아 있으면 해당 행은 이관되지 않습니다. 규칙별로 수정 내용을 확인한 뒤 반영하면
          통과 건수가 즉시 올라갑니다.
        </NoticeBar>
      ) : (
        <NoticeBar variant="info" title="검증 오류 없음">
          {migrationSummary.totalRows.toLocaleString("ko-KR")}행 모두 통과했습니다. 이관 대상이
          확정되었고 착수 후 실제 이관 스크립트로 반영합니다.
        </NoticeBar>
      )}

      <PanelRow columns="7-5">
        <Panel
          title="검증 결과"
          description={`대상 파일 ${migrationSummary.fileName} · 마지막 검증 ${state.migrationRunAt ?? "없음"}`}
        >
          <div role="status" aria-label="이관 검증 결과">
            <DescGrid
              columns="3"
              items={[
                { label: "전체 행", value: `${migrationSummary.totalRows.toLocaleString("ko-KR")}행` },
                { label: "계약 장부", value: "662행" },
                { label: "출고 장부", value: "1,020행" },
                { label: "통과", value: `${passedRows.toLocaleString("ko-KR")}행` },
                { label: "오류", value: `${errorRows}행` },
                { label: "마지막 검증", value: state.migrationRunAt ?? "-" },
                { label: "이관 방식", value: "규칙 검증 → 오류 수정 → 스테이징 적재 → 운영 반영" },
                { label: "이관 담당", value: "구축팀 · 발주사 실무 담당 공동 확인" },
                { label: "금액 검증", value: "원본 합계 ↔ 정규화 후 합계 일치 확인" },
              ]}
            />
          </div>

          <Meter
            label="검증 통과율"
            value={passedRows}
            max={migrationSummary.totalRows}
            valueLabel={`${Math.round((passedRows / migrationSummary.totalRows) * 1000) / 10}%`}
          />

          <TableWrap
            footer={
              <>
                <span>규칙 {state.migrationIssues.length}건 · 미해소 {openIssues.length}건</span>
                <span>오류 {errorRows}행</span>
              </>
            }
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">검증 규칙</th>
                  <th scope="col" className="numeric">오류 행</th>
                  <th scope="col" data-priority="low">예시</th>
                  <th scope="col">상태</th>
                  <th scope="col" aria-label="행 작업" />
                </tr>
              </thead>
              <tbody>
                {state.migrationIssues.map((issue) => (
                  <tr key={issue.id}>
                    <td data-label="검증 규칙">
                      <span className="cell-strong">{issue.rule}</span>
                      <span className="cell-sub id-cell" data-density="support">{issue.id}</span>
                    </td>
                    <td data-label="오류 행" className="numeric tabular">
                      {issue.resolved ? 0 : issue.count}
                    </td>
                    <td data-label="예시" data-priority="low">{issue.sample}</td>
                    <td data-label="상태">
                      <StateText tone={issue.resolved ? "ok" : "warn"}>
                        {issue.resolved ? "수정 반영 완료" : "수정 필요"}
                      </StateText>
                    </td>
                    <td data-label="작업">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${issue.rule} 수정 반영`}
                          disabled={issue.resolved}
                          onClick={() => actions.resolveMigrationIssue(issue.id)}
                        >
                          <Wrench size={14} aria-hidden="true" />
                          수정 반영
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {openIssues.length > 0 ? (
            <button
              type="button"
              className="ghost-button"
              onClick={() => actions.resolveMigrationIssue(openIssues[0].id)}
            >
              <CheckCircle2 size={16} aria-hidden="true" />
              오류 행 수정 반영
            </button>
          ) : null}
        </Panel>

        <div className="stack">
          <Panel title="이관 절차" description="착수 후 실제 이관은 아래 순서로 진행합니다.">
            <ul className="record-list">
              {[
                ["01 원본 확보", "2026년 계약 662행·출고 1,020행 원본과 시트별 합계를 보존합니다."],
                ["02 규칙 검증", "완전 중복 25건과 연락처·날짜·창고번호 형식을 담당자와 함께 정리합니다."],
                ["03 스테이징 적재", "운영과 분리된 검증 환경에 먼저 적재해 화면에서 확인합니다."],
                ["04 운영 반영", "발주사 확인 후 운영 데이터베이스에 반영하고 원본을 보관합니다."],
              ].map(([title, detail]) => (
                <li key={title}>
                  <div className="record-list-head">
                    <strong>{title}</strong>
                  </div>
                  <p>{detail}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="이관 후 확인 항목" description="이관이 끝나면 아래를 함께 확인합니다.">
            <DescGrid
              columns="1"
              items={[
                { label: "행 수", value: "계약 662 · 출고 1,020 · 완전 중복 25 별도 보고" },
                { label: "날짜", value: "단일 영문자 입고일 값은 공동 확정 규칙 적용" },
                { label: "연락처", value: "주·보조 연락처 분리 및 정규화 전후 값 대조" },
                { label: "창고번호", value: "102 / AA-00 / A123 원문 보존 및 검색키 생성" },
                { label: "금액", value: "계약·출고 원본 합계와 이관 후 합계 일치" },
              ]}
            />
          </Panel>
        </div>
      </PanelRow>
    </div>
  );
}
