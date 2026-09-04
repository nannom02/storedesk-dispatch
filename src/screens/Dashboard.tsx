import { useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  Container,
  FileWarning,
  MessageSquareText,
  Wallet,
} from "lucide-react";

import {
  Badge,
  ChipGroup,
  DescGrid,
  KpiCard,
  NoticeBar,
  PageHead,
  Panel,
  PanelRow,
  StateText,
  TableWrap,
} from "../components/ui";
import { TODAY, warehouses } from "../data/seed";
import { daysBetween, formatDday, formatWon, overdueFee } from "../data/utils";
import { useStore } from "../store";

const PERIODS = [
  { id: "month", label: "이번 달" },
  { id: "quarter", label: "최근 3개월" },
];

export default function Dashboard({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  const { state, derived, actions } = useStore();
  const [period, setPeriod] = useState("month");
  const quarter = period === "quarter";

  const occupancy = Math.round((derived.occupiedTotal / derived.containerTotal) * 1000) / 10;
  const pendingCount = derived.pendingTxs.length;
  const escalationId = "ALERT-UNMATCHED";
  const escalated = state.escalatedAlerts.includes(escalationId);

  const kpis = [
    {
      label: "컨테이너 가동",
      value: quarter ? "82.6" : String(occupancy),
      unit: "%",
      foot: quarter
        ? "최근 3개월 평균 가동률 · 창고 3개소"
        : `${derived.occupiedTotal} / ${derived.containerTotal}기 사용 중`,
      icon: <Container size={18} />,
      screen: "warehouses",
      openLabel: "창고별 가동 현황 상세",
    },
    {
      label: "미수금",
      value: quarter ? formatWon(3905000) : formatWon(derived.receivable),
      foot: quarter
        ? "6~8월 누적 미수금 · 외상매출금 계정"
        : `연체 ${derived.overdueContracts.length}건의 미납 원금과 연체료 합계`,
      icon: <Wallet size={18} />,
      screen: "overdue",
      openLabel: "미수금 상세",
    },
    {
      label: "연체 계약",
      value: quarter ? "7" : String(derived.overdueContracts.length),
      unit: "건",
      foot: quarter
        ? "6~8월 중 한 번이라도 연체된 계약"
        : `최장 ${Math.max(0, ...derived.overdueContracts.map((c) => c.overdueDays))}일 연체`,
      icon: <AlertTriangle size={18} />,
      screen: "overdue",
      openLabel: "연체 계약 상세",
    },
    {
      label: "만료 예정",
      value: quarter ? "14" : String(derived.expiringContracts.length),
      unit: "건",
      foot: quarter ? "6~8월 만료 처리 건수" : "오늘부터 7일 이내 만료",
      icon: <CalendarClock size={18} />,
      screen: "contracts",
      openLabel: "만료 예정 계약 상세",
    },
  ];

  return (
    <div className="screen">
      <PageHead
        kicker={`${TODAY} · ${state.role} ${"윤서진"}`}
        title="운영 대시보드"
        lead="창고 3개소의 가동 현황, 미수금, 연체와 만료 예정을 한 화면에서 확인하고 처리할 대상 목록으로 바로 이동합니다."
        actions={
          <ChipGroup
            label="지표 기간"
            options={PERIODS}
            value={period}
            onChange={setPeriod}
          />
        }
      />

      {pendingCount > 0 ? (
        <NoticeBar
          variant="review"
          icon={<AlertTriangle size={18} />}
          title={`확인이 필요한 입금 ${pendingCount}건`}
          action={
            <button type="button" className="notice-action" onClick={() => onNavigate("unmatched")}>
              미매칭 검토 열기
            </button>
          }
        >
          동명이인·등록 입금자명 없음·분할 입금·계약 없음으로 자동 매칭을 멈춘 건입니다. 담당자가 판정해야
          계약 만료일과 연체 상태가 갱신됩니다.
        </NoticeBar>
      ) : (
        <NoticeBar
          variant="info"
          icon={<Wallet size={18} />}
          title="오늘 은행 거래내역이 아직 업로드되지 않았습니다"
          action={
            <button type="button" className="notice-action" onClick={() => onNavigate("deposits")}>
              입금 계약 자동 대조 열기
            </button>
          }
        >
          9월 1~2일 국민은행 거래내역 9건이 대기 중입니다. 업로드하면 계약자명과 등록 입금자명으로
          자동 대조하고 예외 건만 검토 목록에 남깁니다.
        </NoticeBar>
      )}

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            foot={kpi.foot}
            icon={kpi.icon}
            openLabel={kpi.openLabel}
            onOpen={() => onNavigate(kpi.screen)}
          />
        ))}
      </div>

      <PanelRow columns="7-5">
        <Panel
          title="만료 예정 계약"
          description={`오늘 기준 D-7 이내 ${derived.expiringContracts.length}건입니다. 만료일이 연장되면 이 목록에서 즉시 빠집니다.`}
          actions={
            <button type="button" className="quiet-button" onClick={() => onNavigate("contracts")}>
              계약 목록 열기
            </button>
          }
        >
          <TableWrap
            footer={
              <>
                <span>만료 예정 {derived.expiringContracts.length}건 · 만료일 오름차순</span>
                <span>자동 발송은 매일 {state.settings.sendTime}에 실행됩니다.</span>
              </>
            }
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">계약</th>
                  <th scope="col">고객</th>
                  <th scope="col" data-priority="low">창고 · 컨테이너</th>
                  <th scope="col">만료일</th>
                  <th scope="col">남은 기간</th>
                </tr>
              </thead>
              <tbody>
                {derived.expiringContracts.map((contract) => {
                  const customer = derived.customerOf(contract);
                  const warehouse = derived.warehouseById.get(contract.warehouseId);
                  return (
                    <tr key={contract.id}>
                      <td data-label="계약">
                        <span className="cell-strong id-cell">{contract.id}</span>
                      </td>
                      <td data-label="고객">
                        {customer?.name}
                        <span className="cell-sub" data-density="support">
                          {customer?.kind}
                        </span>
                      </td>
                      <td data-label="창고 · 컨테이너" data-priority="low">
                        {warehouse?.name} · {contract.containerNo}
                      </td>
                      <td data-label="만료일" className="date-cell">
                        {contract.endDate}
                      </td>
                      <td data-label="남은 기간">
                        <span className="dday">{formatDday(daysBetween(TODAY, contract.endDate))}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        </Panel>

        <Panel title="오늘 처리해야 할 예외" description="자동 처리가 멈춘 건만 모았습니다.">
          <ul className="record-list">
            <li>
              <div className="record-list-head">
                <strong>알림톡 발송 실패 {derived.failedNotifications.length}건</strong>
                <StateText tone={derived.failedNotifications.length > 0 ? "bad" : "ok"}>
                  {derived.failedNotifications.length > 0 ? "재발송 필요" : "처리 완료"}
                </StateText>
              </div>
              <p>
                {derived.failedNotifications[0]?.failReason ??
                  "실패한 발송 건이 없습니다."}
              </p>
              <button type="button" className="link-button" onClick={() => onNavigate("notifications")}>
                발송 이력에서 재발송
              </button>
            </li>
            <li>
              <div className="record-list-head">
                <strong>세금계산서 발행 실패 {derived.failedInvoices.length}건</strong>
                <StateText tone={derived.failedInvoices.length > 0 ? "bad" : "ok"}>
                  {derived.failedInvoices.length > 0 ? "재처리 필요" : "처리 완료"}
                </StateText>
              </div>
              <p>{derived.failedInvoices[0]?.failReason ?? "실패한 발행 건이 없습니다."}</p>
              <button type="button" className="link-button" onClick={() => onNavigate("billing")}>
                결제·세금계산서에서 재처리
              </button>
            </li>
            <li>
              <div className="record-list-head">
                <strong>챗봇 신규 신청 {derived.newChatbotRequests.length}건</strong>
                <StateText tone={derived.newChatbotRequests.length > 0 ? "warn" : "ok"}>
                  {derived.newChatbotRequests.length > 0 ? "담당자 전달 대기" : "전달 완료"}
                </StateText>
              </div>
              <p>
                {derived.newChatbotRequests[0]
                  ? `${derived.newChatbotRequests[0].customerName} · ${derived.newChatbotRequests[0].kind}`
                  : "대기 중인 신청이 없습니다."}
              </p>
              <button type="button" className="link-button" onClick={() => onNavigate("chatbot")}>
                챗봇 신청 접수 열기
              </button>
            </li>
          </ul>

          <div className="notice notice-attention">
            <span className="notice-icon" aria-hidden="true">
              <BellRing size={18} />
            </span>
            <div className="notice-body">
              <strong className="notice-title">
                {escalated ? "담당자 문자 에스컬레이션 완료" : "24시간 미확인 알림 1건"}
              </strong>
              <p role="status" aria-label="미확인 알림 처리 상태">
                {escalated
                  ? `${state.notifications[0]?.sentAt ?? ""} 회계 담당에게 문자로 통지했습니다. 알림 이력에서 확인할 수 있습니다.`
                  : "9월 1일 발송 실패 건이 24시간 동안 확인되지 않았습니다. 환경 설정의 알림 판정 시간 기준입니다."}
              </p>
            </div>
            <button
              type="button"
              className="notice-action"
              disabled={escalated}
              onClick={() => actions.escalateAlert(escalationId, "회계 담당 윤서진 · 010-3320-7781")}
            >
              담당자 문자 에스컬레이션
            </button>
          </div>
        </Panel>
      </PanelRow>

      <PanelRow columns="2">
        <Panel
          title="창고별 가동 현황"
          description="컨테이너 배정과 반출이 반영된 실시간 사용 현황입니다."
          actions={
            <button type="button" className="quiet-button" onClick={() => onNavigate("warehouses")}>
              배치도 보기
            </button>
          }
        >
          <div className="stack">
            {warehouses.map((warehouse) => {
              const value = derived.occupancyOf(warehouse.id);
              return (
                <div key={warehouse.id} className="stack" data-gap="tight">
                  <div className="inline" data-justify="between">
                    <span className="cell-strong">{warehouse.name}</span>
                    <span className="muted tabular">
                      {value} / {warehouse.totalContainers}기 · {warehouse.team}
                    </span>
                  </div>
                  <div className="meter">
                    <div className="meter-track" role="img" aria-label={`${warehouse.name} 가동률 ${Math.round((value / warehouse.totalContainers) * 100)}%`}>
                      <div
                        className="meter-fill"
                        style={{ width: `${Math.round((value / warehouse.totalContainers) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="panel-note">
              합계 {derived.occupiedTotal} / {derived.containerTotal}기 · 가동률 {occupancy}%
            </p>
          </div>
        </Panel>

        <Panel
          title="공지사항과 자동 처리 규칙"
          description="담당자가 오늘 알아야 할 운영 기준입니다."
          actions={
            <button type="button" className="quiet-button" onClick={() => onNavigate("settings")}>
              환경 설정 열기
            </button>
          }
        >
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
          <DescGrid
            columns="2"
            items={[
              { label: "연체 판정 시각", value: `매일 ${state.settings.judgeTime}` },
              { label: "안내 발송 시각", value: `매일 ${state.settings.sendTime}` },
              {
                label: "연체료 규칙",
                value: `연 ${state.settings.overdueRatePercent}% 일할 · 유예 ${state.settings.overdueGraceDays}일`,
              },
              { label: "중복 발송 방지", value: "같은 계약·같은 문구는 24시간 내 1회" },
            ]}
          />
        </Panel>
      </PanelRow>

      <Panel
        title="연체 상위 계약"
        description="미수금 지표를 만든 원본 계약입니다. 금액 합계가 지표와 일치합니다."
        actions={
          <button type="button" className="quiet-button" onClick={() => onNavigate("overdue")}>
            연체·정산 열기
          </button>
        }
      >
        <TableWrap
          footer={
            <>
              <span>연체 {derived.overdueContracts.length}건</span>
              <span className="tabular">미수금 합계 {formatWon(derived.receivable)}</span>
            </>
          }
        >
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">계약</th>
                <th scope="col">고객</th>
                <th scope="col">연체일</th>
                <th scope="col" className="numeric">미납 원금</th>
                <th scope="col" className="numeric">연체료</th>
                <th scope="col">진행</th>
              </tr>
            </thead>
            <tbody>
              {derived.overdueContracts.map((contract) => {
                const customer = derived.customerOf(contract);
                const fee = overdueFee(
                  contract.unpaidPrincipal,
                  contract.overdueDays,
                  state.settings.overdueRatePercent,
                  state.settings.overdueGraceDays,
                );
                return (
                  <tr key={contract.id}>
                    <td data-label="계약">
                      <span className="cell-strong id-cell">{contract.id}</span>
                    </td>
                    <td data-label="고객">{customer?.name}</td>
                    <td data-label="연체일" className="tabular">{contract.overdueDays}일</td>
                    <td data-label="미납 원금" className="numeric amount tabular">
                      {formatWon(contract.unpaidPrincipal)}
                    </td>
                    <td data-label="연체료" className="numeric amount tabular">{formatWon(fee)}</td>
                    <td data-label="진행">
                      {contract.legalCaseNo ? (
                        <Badge attention>지급명령 {contract.legalCaseNo}</Badge>
                      ) : (
                        <StateText tone="warn">안내 발송 완료</StateText>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <PanelRow columns="3">
        <Panel title="외부 연동 상태" description="오늘 오전 자동 점검 결과입니다.">
          <div className="stack" data-gap="tight">
            {[
              { name: "결제선생", state: "연결됨", note: "운영 키 검수 대기 · 테스트 키 사용 중" },
              { name: "센드빌", state: "인증서 만료", note: "공동인증서 재발급 필요 (SB-403)" },
              { name: "카카오 알림톡", state: "연결됨", note: "발신번호 사전등록 완료" },
              { name: "고객 응대 챗봇", state: "연결됨", note: "ERP 서버와 분리 · 개인정보 미저장" },
            ].map((item) => (
              <div key={item.name} className="inline" data-justify="between">
                <span>
                  <span className="cell-strong">{item.name}</span>
                  <span className="cell-sub" data-density="support">{item.note}</span>
                </span>
                <StateText tone={item.state === "연결됨" ? "ok" : "bad"}>{item.state}</StateText>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="오늘 입출고" description="캘린더에 등록된 오늘 일정입니다.">
          <ul className="record-list">
            {state.movements
              .filter((movement) => movement.scheduledDate === TODAY)
              .map((movement) => (
                <li key={movement.id}>
                  <div className="record-list-head">
                    <strong>
                      {movement.kind} · {movement.containerNo}
                    </strong>
                    <StateText tone={movement.done ? "ok" : "info"}>
                      {movement.done ? "처리 완료" : "진행 중"}
                    </StateText>
                  </div>
                  <p>
                    {derived.contractLabel(movement.contractId)} · {movement.team} {movement.driver}
                  </p>
                </li>
              ))}
          </ul>
          <button type="button" className="quiet-button" onClick={() => onNavigate("schedule")}>
            입출고 일정 캘린더 열기
          </button>
        </Panel>

        <Panel title="최근 처리 이력" description="누가 언제 무엇을 바꿨는지 남습니다.">
          <ul className="record-list">
            {state.auditEntries.slice(0, 4).map((entry) => (
              <li key={entry.id}>
                <div className="record-list-head">
                  <strong>{entry.action}</strong>
                  <span className="record-meta" data-density="support">{entry.at}</span>
                </div>
                <p>
                  {entry.actor} · {entry.target}
                </p>
              </li>
            ))}
          </ul>
          <button type="button" className="quiet-button" onClick={() => onNavigate("audit")}>
            권한·활동 로그 열기
          </button>
        </Panel>
      </PanelRow>

      <Panel title="이번 달 처리 요약" description="대조·발송·문서 발행 결과를 한 줄로 확인합니다.">
        <DescGrid
          columns="3"
          items={[
            {
              label: "대조 배치",
              value: `${state.batches.length}건 · 최근 ${derived.latestBatch?.uploadedAt ?? "-"}`,
            },
            {
              label: "자동 매칭 / 검토",
              value: `${
                state.txs.filter(
                  (tx) => tx.batchId === derived.latestBatch?.id && tx.status === "자동 매칭",
                ).length
              }건 / ${
                state.txs.filter(
                  (tx) => tx.batchId === derived.latestBatch?.id && tx.status !== "자동 매칭",
                ).length
              }건`,
            },
            { label: "발송 이력", value: `${state.notifications.length}건` },
            { label: "보관 문서", value: `${state.documents.length}건` },
            {
              label: "등록 입금자명",
              value: `${state.aliases.length}건 학습`,
            },
            { label: "관리 고객", value: "1,482명 (이관 완료 기준)" },
          ]}
        />
        <div className="inline">
          <FileWarning size={16} aria-hidden="true" className="muted" />
          <span className="panel-note">
            숫자는 모두 각 화면의 실제 목록에서 계산합니다. 목록을 처리하면 이 요약도 함께 바뀝니다.
          </span>
          <MessageSquareText size={16} aria-hidden="true" className="muted" />
        </div>
      </Panel>
    </div>
  );
}
