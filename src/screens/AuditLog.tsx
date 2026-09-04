import { useMemo, useState } from "react";
import { Lock, Plus, ShieldCheck } from "lucide-react";

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
import { useStore } from "../store";
import type { StaffProfile } from "../data/types";

const FILTERS = [
  { id: "all", label: "전체" },
  { id: "입금 대조", label: "입금 대조" },
  { id: "계약", label: "계약" },
  { id: "발송", label: "발송" },
  { id: "입출고", label: "입출고" },
  { id: "삭제 시도", label: "삭제 시도" },
];

const PERMISSIONS = [
  { name: "계약 등록·수정", admin: true, superOnly: false },
  { name: "입금 대조·수동 연결", admin: true, superOnly: false },
  { name: "안내 발송·문서 발행", admin: true, superOnly: false },
  { name: "환경 설정 변경", admin: false, superOnly: true },
  { name: "계약·고객 삭제", admin: false, superOnly: true },
  { name: "권한 등급 변경", admin: false, superOnly: true },
];

const FEATURE_PERMISSIONS = ["고객", "계약", "입출고", "운송", "정산", "알림", "문서", "설정"];

export default function AuditLog() {
  const { state, actions } = useStore();
  const [filter, setFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [staffOpen, setStaffOpen] = useState(false);
  const [staffResult, setStaffResult] = useState("");
  const [staffForm, setStaffForm] = useState({ name: "박서연", role: "관리자" as StaffProfile["role"], profile: "고객·계약·알림", permissions: ["고객", "계약", "알림", "문서"] });

  const rows = useMemo(
    () =>
      state.auditEntries.filter(
        (entry) =>
          (state.role === "최고관리자" || entry.actor === "윤서진") &&
          (filter === "all" || entry.category === filter) &&
          (actorFilter === "all" || entry.actor === actorFilter),
      ),
    [state.auditEntries, state.role, filter, actorFilter],
  );

  const isSuper = state.role === "최고관리자";

  return (
    <div className="screen">
      <PageHead
        kicker="관리 · 권한 등급과 처리 이력"
        title="권한·활동 로그"
        lead="직원을 등록해 역할별 접근 프로필을 발급하고, 누가 언제 어떤 계약을 바꿨는지 모두 남깁니다. 최고관리자는 관리자별 처리 이력을 확인합니다."
        actions={<button type="button" className="primary-button" onClick={() => setStaffOpen(true)}><Plus size={16} aria-hidden="true" /> 직원·프로필 등록</button>}
      />

      <Panel title="직원·접근 프로필" description="직원 등록, 역할 지정, 접근 프로필 발급 이력을 한 원장으로 관리합니다.">
        {staffResult ? <p role="status" aria-label="직원 프로필 처리 결과" className="panel-note">{staffResult}</p> : null}
        <TableWrap footer={<><span>직원 {state.staffProfiles.length}명 · 활성 {state.staffProfiles.filter((staff) => staff.status === "활성").length}명</span><span>최근 프로필 발급 {state.staffProfiles[0]?.issuedAt ?? "-"}</span></>}>
          <table className="data-table">
            <thead><tr><th scope="col">직원</th><th scope="col">역할</th><th scope="col">접근 프로필</th><th scope="col">기능 권한</th><th scope="col">발급 이력</th><th scope="col">상태</th><th scope="col" aria-label="행 작업" /></tr></thead>
            <tbody>
              {state.staffProfiles.map((staff) => (
                <tr key={staff.id}><td data-label="직원"><strong>{staff.name}</strong><span className="cell-sub" data-density="support">{staff.id}</span></td><td data-label="역할">{staff.role}</td><td data-label="접근 프로필">{staff.profile}</td><td data-label="기능 권한">{staff.permissions.length ? staff.permissions.join(" · ") : "접근 없음"}</td><td data-label="발급 이력">{staff.issuanceHistory.join(" · ")}<span className="cell-sub" data-density="support">발급자 {staff.issuedBy}</span></td><td data-label="상태"><StateText tone={staff.status === "활성" ? "ok" : "neutral"}>{staff.status}</StateText></td><td data-label="작업"><button type="button" className="quiet-button" aria-label={`${staff.name} 접근 프로필 회수`} disabled={staff.status === "회수" || staff.role === "최고관리자"} title={staff.role === "최고관리자" ? "최고관리자 프로필은 회수할 수 없습니다." : staff.status === "회수" ? "이미 회수된 프로필입니다." : undefined} onClick={() => { actions.revokeStaffProfile(staff.id); setStaffResult(`${staff.name} 접근 프로필을 회수했습니다.`); }}>{staff.status === "회수" ? "회수 완료" : "접근 프로필 회수"}</button></td></tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <PanelRow columns="5-7">
        <Panel
          title="권한 등급"
          description="등급을 바꾸면 아래 기능표와 실제 화면의 제한이 함께 바뀝니다."
        >
          <ChipGroup
            label="현재 권한 등급"
            options={[
              { id: "최고관리자", label: "최고관리자" },
              { id: "관리자", label: "관리자" },
            ]}
            value={state.role}
            onChange={(id) => actions.setRole(id as "최고관리자" | "관리자")}
          />

          <div role="status" aria-label="권한별 기능 제어">
            <TableWrap
              footer={
                <>
                  <span>현재 등급 {state.role}</span>
                  <span>
                    사용 가능 {PERMISSIONS.filter((item) => isSuper || item.admin).length} / 전체{" "}
                    {PERMISSIONS.length}
                  </span>
                </>
              }
            >
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">기능</th>
                    <th scope="col">현재 등급</th>
                    <th scope="col">제한 사유</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS.map((permission) => {
                    const allowed = isSuper || permission.admin;
                    return (
                      <tr key={permission.name}>
                        <td data-label="기능">
                          <span className="cell-strong">{permission.name}</span>
                        </td>
                        <td data-label="현재 등급">
                          <StateText tone={allowed ? "ok" : "warn"}>
                            {allowed ? "사용 가능" : "사용 불가"}
                          </StateText>
                        </td>
                        <td data-label="제한 사유">
                          {allowed ? (
                            "-"
                          ) : (
                            <span className="disabled-reason" data-density="support">
                              <Lock size={13} aria-hidden="true" /> 최고관리자 전용 기능입니다.
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>

          <div className="notice notice-info">
            <span className="notice-icon" aria-hidden="true">
              <ShieldCheck size={18} />
            </span>
            <div className="notice-body">
              <strong className="notice-title">삭제는 최고관리자만 실행합니다</strong>
              <p>
                관리자 등급에서 삭제를 시도하면 실행되지 않고 `삭제 시도`로 기록됩니다. 실제 삭제도
                이력에 남아 되돌릴 근거가 됩니다.
              </p>
            </div>
            <button type="button" className="notice-action" disabled>
              {isSuper ? "현재 등급에서 삭제 가능" : "권한 부족으로 삭제 불가"}
            </button>
          </div>
        </Panel>

        <Panel title="처리 이력" description="대상·행위·처리자·시각이 함께 남습니다.">
          <div className="filter-bar">
            <ChipGroup label="활동 유형" options={FILTERS} value={filter} onChange={setFilter} />
            <ChipGroup
              label="처리자"
              options={(isSuper ? ["all", ...Array.from(new Set(state.auditEntries.map((entry) => entry.actor)))] : ["윤서진"]).map((actor) => ({ id: actor, label: actor === "all" ? "전체 처리자" : actor }))}
              value={isSuper ? actorFilter : "윤서진"}
              onChange={setActorFilter}
            />
            <span className="panel-note" role="status" aria-label="처리 이력 요약">
              전체 {state.auditEntries.length}건 중 {rows.length}건 표시
            </span>
          </div>

          <TableWrap>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">시각</th>
                  <th scope="col">처리자</th>
                  <th scope="col">행위</th>
                  <th scope="col">대상</th>
                  <th scope="col" data-priority="low">분류</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => (
                  <tr key={entry.id}>
                    <td data-label="시각" className="date-cell">{entry.at}</td>
                    <td data-label="처리자">
                      {entry.actor}
                      <span className="cell-sub" data-density="support">{entry.role}</span>
                    </td>
                    <td data-label="행위">{entry.action}</td>
                    <td data-label="대상">{entry.target}</td>
                    <td data-label="분류" data-priority="low">
                      <StateText tone={entry.category === "삭제 시도" ? "bad" : "neutral"}>
                        {entry.category}
                      </StateText>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <DescGrid
            columns="2"
            items={[
              { label: "보관 기간", value: "3년 · 이후 분기별 아카이브" },
              { label: "조회 권한", value: "최고관리자 전체 · 관리자는 본인 처리 건" },
              { label: "기록 항목", value: "처리자, 등급, 행위, 대상, 시각, 변경 전후 값" },
              { label: "자동 점검", value: "매일 08:00 미매칭·발송 실패·연동 실패·만료 예정 예외 목록" },
            ]}
          />
        </Panel>
      </PanelRow>

      {staffOpen ? (
        <Modal
          title="직원 등록·접근 프로필 발급"
          description="직원 등록과 역할 지정, 접근 프로필 발급을 한 번에 처리하고 발급 이력을 남깁니다."
          onClose={() => setStaffOpen(false)}
          actions={
            <>
              <button type="button" className="ghost-button" onClick={() => setStaffOpen(false)}>취소</button>
              <button
                type="button"
                className="primary-button"
                disabled={!staffForm.name.trim() || !staffForm.profile.trim()}
                onClick={() => {
                  const staffId = actions.registerStaffProfile({ name: staffForm.name.trim(), role: staffForm.role, profile: staffForm.profile.trim(), permissions: staffForm.permissions });
                  setStaffResult(`${staffId} · ${staffForm.name.trim()} 직원을 등록하고 ${staffForm.profile.trim()} 프로필을 발급했습니다.`);
                  setStaffOpen(false);
                }}
              >직원 등록·프로필 발급</button>
            </>
          }
        >
          <div className="field-grid">
            <label className="field"><span className="field-label">직원명</span><input value={staffForm.name} onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="field"><span className="field-label">역할</span><select value={staffForm.role} onChange={(event) => setStaffForm((current) => ({ ...current, role: event.target.value as StaffProfile["role"] }))}><option value="최고관리자">최고관리자</option><option value="관리자">관리자</option><option value="창고 현장 담당자">창고 현장 담당자</option></select></label>
            <label className="field" data-span="full"><span className="field-label">접근 프로필</span><select value={staffForm.profile} onChange={(event) => setStaffForm((current) => ({ ...current, profile: event.target.value }))}><option value="운영·정산 전체">운영·정산 전체</option><option value="고객·계약·알림">고객·계약·알림</option><option value="입출고·창고 조회">입출고·창고 조회</option></select></label>
          </div>
          <div className="instruction-fields" role="group" aria-label="기능별 접근 권한">
            {FEATURE_PERMISSIONS.map((permission) => (
              <label key={permission}>
                <input type="checkbox" checked={staffForm.permissions.includes(permission)} onChange={(event) => setStaffForm((current) => ({ ...current, permissions: event.target.checked ? [...current.permissions, permission] : current.permissions.filter((item) => item !== permission) }))} />
                {permission}
              </label>
            ))}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
