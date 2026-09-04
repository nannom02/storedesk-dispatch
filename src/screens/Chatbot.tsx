import { useState } from "react";
import { Bot, ShieldCheck, UserCheck } from "lucide-react";

import {
  DescGrid,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { useStore } from "../store";

export default function Chatbot() {
  const { state, derived, actions } = useStore();
  const [greeting, setGreeting] = useState(state.chatbotScript.greeting);
  const [buttons, setButtons] = useState(state.chatbotScript.buttons.join(", "));

  const pending = state.chatbotRequests.filter((item) => item.status === "접수");
  const outboundRequest = state.chatbotRequests.find((item) => item.kind === "출고 신청");

  return (
    <div className="screen">
      <PageHead
        kicker="고객 소통 · 기존 챗봇 연계"
        title="챗봇 신청 접수"
        lead="출고 희망일·주소·수취인·연락처·엘리베이터 여부를 구조화해 받고, 상담 목록 생성부터 담당자 전달까지 한 흐름으로 검증합니다."
      />

      <div className="notice notice-info">
        <span className="notice-icon" aria-hidden="true">
          <ShieldCheck size={18} />
        </span>
        <div className="notice-body">
          <strong className="notice-title">챗봇과 ERP 서버는 분리되어 있습니다</strong>
          <p>
            챗봇에는 고객 개인정보를 저장하지 않습니다. 신청이 들어오면 챗봇은 신청 식별자와 입력값만
            전달하고, 고객·계약 정보 조회는 ERP 안에서만 이뤄집니다.
          </p>
        </div>
      </div>

      <PanelRow columns="7-5">
        <Panel
          title="신청 접수 목록"
          description={`대기 ${pending.length}건 · 전체 ${state.chatbotRequests.length}건. 담당자에게 전달하면 알림이 함께 발송됩니다.`}
        >
          <TableWrap
            footer={
              <>
                <span role="status" aria-label="챗봇 접수 요약">
                  접수 {pending.length}건 · 담당자 전달{" "}
                  {state.chatbotRequests.filter((item) => item.status === "담당자 전달").length}건 ·
                  처리 완료{" "}
                  {state.chatbotRequests.filter((item) => item.status === "처리 완료").length}건
                </span>
                <span>신청은 안내문 링크와 챗봇 두 경로로 들어옵니다.</span>
              </>
            }
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">신청</th>
                  <th scope="col">고객 · 계약</th>
                  <th scope="col">종류</th>
                  <th scope="col" data-priority="low">접수 시각</th>
                  <th scope="col">상태</th>
                  <th scope="col" aria-label="행 작업" />
                </tr>
              </thead>
              <tbody>
                {state.chatbotRequests.map((request) => (
                  <tr key={request.id}>
                    <td data-label="신청">
                      <span className="cell-strong id-cell">{request.id}</span>
                      <span className="cell-sub" data-density="support">{request.message}</span>
                    </td>
                    <td data-label="고객 · 계약">
                      {request.customerName}
                      <span className="cell-sub" data-density="support">
                        {request.contractId} · {derived.contractLabel(request.contractId)}
                      </span>
                    </td>
                    <td data-label="종류">{request.kind}</td>
                    <td data-label="접수 시각" data-priority="low" className="date-cell">{request.receivedAt}</td>
                    <td data-label="상태">
                      <StateText
                        tone={
                          request.status === "처리 완료"
                            ? "ok"
                            : request.status === "담당자 전달"
                              ? "info"
                              : "warn"
                        }
                      >
                        {request.status}
                      </StateText>
                      {request.assignee ? (
                        <span className="cell-sub" data-density="support">담당 {request.assignee}</span>
                      ) : null}
                    </td>
                    <td data-label="작업">
                      <div className="row-actions">
                        <button
                          type="button"
                          className="quiet-button"
                          aria-label={`${request.id} 담당자 전달`}
                          disabled={request.status !== "접수"}
                          onClick={() => actions.assignChatbotRequest(request.id)}
                        >
                          전달
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          {pending.length > 0 ? (
            <div className="inline">
              <button
                type="button"
                className="primary-button"
                onClick={() => actions.assignChatbotRequest(pending[0].id)}
              >
                <UserCheck size={16} aria-hidden="true" />
                담당자 전달
              </button>
              <span className="panel-note">
                {pending[0].customerName} · {pending[0].kind}을 운영 담당 김도현에게 전달하고 문자로
                알립니다.
              </span>
            </div>
          ) : (
            <p className="panel-note">대기 중인 신청이 없습니다. 새 신청은 접수 즉시 이 목록에 표시됩니다.</p>
          )}

          {outboundRequest ? (
            <div className="chatbot-validation" role="status" aria-label="검증 결과">
              <div className="inline" data-justify="between">
                <strong>출고 신청 필수값 검증</strong>
                <StateText tone={outboundRequest.validationStatus === "검증 완료" ? "ok" : "warn"}>
                  {outboundRequest.validationStatus ?? "확인 필요"}
                </StateText>
              </div>
              <DescGrid
                columns="2"
                items={[
                  { label: "희망일", value: outboundRequest.desiredDate ?? "미입력" },
                  { label: "주소", value: outboundRequest.address ?? "미입력" },
                  { label: "수취인", value: outboundRequest.recipient ?? "미입력" },
                  { label: "연락처", value: outboundRequest.phone ?? "미입력" },
                  { label: "엘리베이터", value: outboundRequest.elevator ?? "미입력" },
                  { label: "상담 목록", value: `${outboundRequest.customerName} 출고 상담 생성` },
                ]}
              />
              <button type="button" className="ghost-button" onClick={() => actions.validateChatbotFlow(outboundRequest.id)}>
                전체 흐름 검증
              </button>
            </div>
          ) : null}
        </Panel>

        <div className="stack">
          <Panel
            title="챗봇 문구·버튼"
            description="여기서 저장하면 고객이 보는 챗봇 첫 화면에 반영됩니다."
            actions={
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  actions.applyChatbotScript({
                    greeting,
                    buttons: buttons
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              >
                <Bot size={16} aria-hidden="true" />
                챗봇 문구 반영
              </button>
            }
          >
            <div className="field-grid" data-single="true">
              <label className="field">
                <span className="field-label">첫 인사말</span>
                <textarea value={greeting} onChange={(event) => setGreeting(event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">버튼 (쉼표로 구분)</span>
                <input value={buttons} onChange={(event) => setButtons(event.target.value)} />
              </label>
            </div>

            <div role="status" aria-label="챗봇 문구 미리보기">
              <div className="phone-card">
                <strong>고객이 보는 챗봇 화면</strong>
                <span data-density="support">{state.chatbotScript.greeting}</span>
                <div className="inline">
                  {state.chatbotScript.buttons.map((label) => (
                    <span key={label} className="badge">
                      {label}
                    </span>
                  ))}
                </div>
                <span data-density="support">
                  {state.chatbotScript.appliedAt
                    ? `반영 ${state.chatbotScript.appliedAt} · ${"윤서진"}`
                    : "아직 ERP에서 수정한 이력이 없습니다."}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="연동 구성" description="공고의 챗봇·ERP 분리 요건을 그대로 반영했습니다.">
            <DescGrid
              columns="1"
              items={[
                { label: "챗봇 서버", value: "기존 운영 챗봇 유지 · 개인정보 미저장" },
                { label: "전달 항목", value: "신청 식별자, 신청 종류, 고객이 입력한 문장" },
                { label: "ERP 처리", value: "계약 매칭·담당자 지정·알림 발송은 ERP에서만 수행" },
                { label: "확인 필요", value: "기존 챗봇의 연동 규격서와 콜백 주소 (착수 시 확인)" },
              ]}
            />
          </Panel>
        </div>
      </PanelRow>
    </div>
  );
}
