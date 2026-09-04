import { useState } from "react";
import { Megaphone, Save } from "lucide-react";

import {
  DescGrid,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { useStore } from "../store";

export default function SettingsScreen({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  const { state, actions } = useStore();
  const [rate, setRate] = useState(state.settings.overdueRatePercent);
  const [grace, setGrace] = useState(state.settings.overdueGraceDays);
  const [judgeTime, setJudgeTime] = useState(state.settings.judgeTime);
  const [sendTime, setSendTime] = useState(state.settings.sendTime);
  const [contractRetention, setContractRetention] = useState(state.settings.completedContractRetentionYears);
  const [photoRetention, setPhotoRetention] = useState(state.settings.outboundPhotoRetentionMonths);
  const [noticeTitle, setNoticeTitle] = useState("9월 세금계산서 발행 일정 안내");
  const [noticeBody, setNoticeBody] = useState(
    "9월 세금계산서는 5일 승인, 6일 일괄 발행합니다. 발행 대기 목록을 4일까지 확인해 주세요.",
  );

  return (
    <div className="screen">
      <PageHead
        kicker="관리 · 운영 규칙과 공지"
        title="환경 설정"
        lead="연체·발송 규칙과 계약·사진 보존기간, 로그인 인증 정책, 발신번호 등록 상태를 관리합니다. 저장한 규칙은 관련 업무 화면에 바로 반영됩니다."
      />

      <PanelRow columns="7-5">
        <div className="stack">
          <Panel
            title="입금 대조·연체·정산 규칙"
            description={`요구사항 정의서의 규칙과 같은 값이며, 여기서 바꾸면 화면 계산이 함께 바뀝니다. 마지막 저장 ${state.settings.updatedAt ?? "없음"}.`}
            actions={
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  actions.saveOverdueRule({
                    ratePercent: rate,
                    graceDays: grace,
                    judgeTime,
                    sendTime,
                  })
                }
              >
                <Save size={16} aria-hidden="true" />
                연체 규칙 저장
              </button>
            }
          >
            <div className="field-grid">
              <label className="field">
                <span className="field-label">연체료율 (연 %)</span>
                <select value={rate} onChange={(event) => setRate(Number(event.target.value))}>
                  <option value={6}>6%</option>
                  <option value={12}>12%</option>
                  <option value={18}>18%</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">유예 일수</span>
                <select value={grace} onChange={(event) => setGrace(Number(event.target.value))}>
                  <option value={0}>없음</option>
                  <option value={3}>3일</option>
                  <option value={7}>7일</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">연체 판정 시각</span>
                <select value={judgeTime} onChange={(event) => setJudgeTime(event.target.value)}>
                  <option value="06:00">06:00</option>
                  <option value="08:00">08:00</option>
                  <option value="10:00">10:00</option>
                </select>
              </label>
              <label className="field">
                <span className="field-label">안내 발송 시각</span>
                <select value={sendTime} onChange={(event) => setSendTime(event.target.value)}>
                  <option value="09:00">09:00</option>
                  <option value="10:00">10:00</option>
                  <option value="14:00">14:00</option>
                </select>
              </label>
            </div>

            <div role="status" aria-label="적용 중인 규칙">
              <DescGrid
                columns="2"
                items={[
                  {
                    label: "적용 중인 연체료",
                    value: `연 ${state.settings.overdueRatePercent}% 일할 · 유예 ${state.settings.overdueGraceDays}일`,
                  },
                  { label: "연체 판정 시각", value: `매일 ${state.settings.judgeTime}` },
                  { label: "안내 발송 시각", value: `매일 ${state.settings.sendTime}` },
                  { label: "중복 발송 방지", value: "같은 계약·같은 문구 24시간 1회" },
                  {
                    label: "마지막 저장",
                    value: state.settings.updatedAt ?? "이관 시 설정한 초기값 그대로입니다",
                  },
                  { label: "저장 담당", value: `${state.role} 윤서진` },
                ]}
              />
            </div>
            <button type="button" className="link-button" onClick={() => onNavigate("overdue")}>
              연체·정산에서 다시 계산된 금액 확인
            </button>
          </Panel>

          <Panel title="로그인 인증" description="사내 업무 시스템의 접근 통제 기준입니다.">
            <DescGrid
              columns="2"
              items={[
                { label: "로그인 실패 제한", value: `${state.settings.loginFailLimit}회 후 10분 잠금` },
                { label: "자동 로그아웃", value: `${state.settings.autoLogoutMinutes}분 미조작 시` },
                { label: "접근 범위", value: "ERP 화면 외 직접 접근 차단 · 관리자 IP 허용 목록" },
                { label: "비밀번호", value: "90일 주기 변경 · 최근 3회 재사용 금지" },
              ]}
            />
          </Panel>

          <Panel
            title="계약·사진 보존 정책"
            description="출고 완료 계약은 3년, 출고 현장 사진은 완료 후 1개월 보관을 기본값으로 둡니다."
            actions={
              <button type="button" className="ghost-button" onClick={() => actions.saveRetentionPolicy(contractRetention, photoRetention)}>
                <Save size={16} aria-hidden="true" /> 보존 정책 저장
              </button>
            }
          >
            <div className="field-grid">
              <label className="field"><span className="field-label">완료 계약 보존</span><select value={contractRetention} onChange={(event) => setContractRetention(Number(event.target.value))}><option value={3}>3년</option><option value={5}>5년</option></select></label>
              <label className="field"><span className="field-label">출고 사진 보존</span><select value={photoRetention} onChange={(event) => setPhotoRetention(Number(event.target.value))}><option value={1}>출고 후 1개월</option><option value={3}>출고 후 3개월</option></select></label>
            </div>
            <div role="status" aria-label="보존 정책 저장 결과">
              <DescGrid columns="2" items={[
                { label: "완료 계약", value: `${state.settings.completedContractRetentionYears}년` },
                { label: "출고 사진", value: `출고 완료 후 ${state.settings.outboundPhotoRetentionMonths}개월` },
                { label: "마지막 저장", value: state.settings.updatedAt ?? "저장 이력 없음" },
              ]} />
            </div>
          </Panel>
        </div>

        <div className="stack">
          <Panel title="발신번호와 연동 키" description="발송·결제 연동에 필요한 사전 등록 상태입니다.">
            <TableWrap>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">항목</th>
                    <th scope="col">값</th>
                    <th scope="col">상태</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td data-label="항목">문자 발신번호</td>
                    <td data-label="값">{state.settings.senderNumber}</td>
                    <td data-label="상태">
                      <StateText tone="ok">{state.settings.senderNumberStatus}</StateText>
                    </td>
                  </tr>
                  <tr>
                    <td data-label="항목">알림톡 채널</td>
                    <td data-label="값">@보관에스디</td>
                    <td data-label="상태">
                      <StateText tone="ok">템플릿 3종 승인</StateText>
                    </td>
                  </tr>
                  <tr>
                    <td data-label="항목">결제선생 운영 키</td>
                    <td data-label="값">테스트 키 사용 중</td>
                    <td data-label="상태">
                      <StateText tone="warn">발주사 계정 검수 대기</StateText>
                    </td>
                  </tr>
                  <tr>
                    <td data-label="항목">센드빌 공동인증서</td>
                    <td data-label="값">사업자 범용 인증서</td>
                    <td data-label="상태">
                      <StateText tone="bad">만료 · 재발급 필요</StateText>
                    </td>
                  </tr>
                </tbody>
              </table>
            </TableWrap>
            <p className="panel-note">
              운영 키·인증서·발신번호는 발주사 명의로 발급해야 합니다. 착수 전 결정사항에서 준비
              주체를 확인합니다.
            </p>
          </Panel>

          <Panel
            title="공지사항"
            description="등록한 공지는 운영 대시보드 상단에 표시됩니다."
            actions={
              <button
                type="button"
                className="ghost-button"
                onClick={() => actions.addNotice(noticeTitle, noticeBody)}
              >
                <Megaphone size={16} aria-hidden="true" />
                공지 등록
              </button>
            }
          >
            <div className="field-grid" data-single="true">
              <label className="field">
                <span className="field-label">공지 제목</span>
                <input value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} />
              </label>
              <label className="field">
                <span className="field-label">공지 내용</span>
                <textarea value={noticeBody} onChange={(event) => setNoticeBody(event.target.value)} />
              </label>
            </div>

            <div role="status" aria-label="등록된 공지">
              <ul className="record-list">
                {state.notices.map((notice) => (
                  <li key={notice.id}>
                    <div className="record-list-head">
                      <strong>{notice.title}</strong>
                      <span className="record-meta" data-density="support">
                        {notice.postedAt} · {notice.author}
                      </span>
                    </div>
                    <p>{notice.body}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Panel>
        </div>
      </PanelRow>
    </div>
  );
}
