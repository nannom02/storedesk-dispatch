import { useEffect, useRef } from "react";
import {
  BellRing,
  Container,
  FileText,
  GitCompareArrows,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { ServiceIntroductionScreen } from "../out/safedesk-master/ServiceIntroductionScreen";
import type {
  ServiceDemoSteps,
  ServiceFeatureItems,
  ServiceFlowViews,
  ServiceImprovementItems,
  ServiceWorkflowSteps,
} from "../out/safedesk-master/ServiceIntroductionScreen";
import { DescGrid, StateText, TableWrap } from "../components/ui";

const flowViews: ServiceFlowViews = [
  {
    id: "role",
    kind: "role",
    label: "역할별 업무 연결",
    title: "상담에서 시작해 운송·현장·정산으로 이어지는 실제 인계 경로",
    summary:
      "운영 담당자가 보관 조건을 계약과 운송 작업지시로 넘기면 창고 현장 담당자는 전체·부분 입출고와 컨테이너 상태를 갱신합니다. 계약의 입금 내역은 회계·정산 담당자의 대조와 예외 처리로 이어집니다. 노드를 누르면 해당 화면이 열립니다.",
    viewBox: "0 0 1200 276",
    lanes: [
      { id: "lane-admin", label: "운영 담당자", detail: "PC 웹 · 고객·계약·운송·문서", y: 4, height: 84 },
      {
        id: "lane-finance",
        label: "회계·정산 담당자",
        detail: "PC 웹 · 입금·연체·청구",
        y: 96,
        height: 84,
      },
      {
        id: "lane-field",
        label: "창고 현장 담당자",
        detail: "모바일 웹 · 입출고·컨테이너",
        y: 188,
        height: 84,
      },
    ],
    nodes: [
      {
        id: "n1",
        index: "01",
        actor: "운영 담당자",
        label: "고객 상담·계약",
        detail: "보관 조건 · 계약·창고 배정",
        screenId: "customers",
        x: 185,
        y: 7,
        width: 160,
        height: 78,
      },
      {
        id: "n2",
        index: "02",
        actor: "운영 담당자",
        label: "운송 배정·작업지시",
        detail: "자체·외부 배정 · 3자 발송",
        screenId: "transport",
        x: 455,
        y: 7,
        width: 160,
        height: 78,
      },
      {
        id: "n3",
        index: "03",
        actor: "창고 현장",
        label: "입출고 일정·현장 처리",
        detail: "전체·부분 · 재입고·재배치",
        screenId: "movements",
        x: 710,
        y: 191,
        width: 160,
        height: 78,
      },
      {
        id: "n4",
        index: "04",
        actor: "창고 현장",
        label: "창고·컨테이너 갱신",
        detail: "전체 종료 · 부분 보관 유지",
        screenId: "warehouses",
        x: 980,
        y: 191,
        width: 160,
        height: 78,
      },
      {
        id: "n5",
        index: "05",
        actor: "회계·정산",
        label: "입금 계약 자동 대조",
        detail: "입금자명 · 계약 자동 연결",
        screenId: "deposits",
        x: 455,
        y: 99,
        width: 160,
        height: 78,
      },
      {
        id: "n6",
        index: "06",
        actor: "회계·정산",
        label: "예외·연체·발행 처리",
        detail: "판정 · 청구 · 세금계산서",
        screenId: "unmatched",
        x: 710,
        y: 99,
        width: 160,
        height: 78,
      },
    ],
    edges: [
      {
        from: "n1",
        to: "n2",
        label: "입출고 요청",
        labelX: 400,
        labelY: 36,
        labelAnchor: "middle",
      },
      {
        from: "n1",
        to: "n5",
        label: "계약·입금자명",
        labelX: 400,
        labelY: 92,
        labelAnchor: "middle",
      },
      {
        from: "n2",
        to: "n3",
        label: "3자 작업지시",
        labelX: 663,
        labelY: 184,
        labelAnchor: "middle",
      },
      {
        from: "n5",
        to: "n6",
        label: "예외·미납",
        labelX: 663,
        labelY: 128,
        labelAnchor: "middle",
      },
      {
        from: "n3",
        to: "n4",
        label: "처리 완료",
        labelX: 925,
        labelY: 220,
        labelAnchor: "middle",
      },
    ],
  },
  {
    id: "end-to-end",
    kind: "end-to-end",
    label: "전체 업무 흐름",
    title: "상담 한 건이 운송·입출고·보관 원장까지 이어지는 전 과정",
    summary:
      "보관 조건 상담에서 시작해 계약과 창고를 배정하고, 운송 작업지시와 현장 입출고를 거쳐 계약·컨테이너 상태와 운영 이력을 확인하는 여섯 단계입니다. 각 단계는 실제 구현 화면으로 연결됩니다.",
    viewBox: "0 0 1200 152",
    nodes: [
      {
        id: "s1",
        index: "01",
        actor: "운영 담당자",
        label: "보관 조건 상담",
        detail: "물품·물량·기간·입출고",
        screenId: "customers",
        x: 14,
        y: 46,
        width: 176,
        height: 88,
      },
      {
        id: "s2",
        index: "02",
        actor: "운영 담당자",
        label: "계약·창고 배정",
        detail: "등급·컨테이너·계약",
        screenId: "contracts",
        x: 210,
        y: 46,
        width: 176,
        height: 88,
      },
      {
        id: "s3",
        index: "03",
        actor: "운영 담당자",
        label: "운송 배정·작업지시",
        detail: "자체·외부 구분 · 3자 발송",
        screenId: "transport",
        x: 406,
        y: 46,
        width: 176,
        height: 88,
      },
      {
        id: "s4",
        index: "04",
        actor: "창고 현장",
        label: "전체·부분 입출고",
        detail: "재입고·재배치 포함",
        screenId: "movements",
        x: 602,
        y: 46,
        width: 176,
        height: 88,
      },
      {
        id: "s5",
        index: "05",
        actor: "창고 현장",
        label: "보관 상태 갱신",
        detail: "전체 종료 · 부분 유지",
        screenId: "warehouses",
        x: 798,
        y: 46,
        width: 176,
        height: 88,
      },
      {
        id: "s6",
        index: "06",
        actor: "최고관리자",
        label: "결과·이력 확인",
        detail: "처리자·사진·정산 확인",
        screenId: "dashboard",
        x: 994,
        y: 46,
        width: 176,
        height: 88,
      },
    ],
    edges: [
      { from: "s1", to: "s2", label: "상담 원장", labelX: 200, labelY: 36, labelAnchor: "middle" },
      { from: "s2", to: "s3", label: "배정 요청", labelX: 396, labelY: 36, labelAnchor: "middle" },
      { from: "s3", to: "s4", label: "3자 발송", labelX: 592, labelY: 36, labelAnchor: "middle" },
      { from: "s4", to: "s5", label: "종료/유지", labelX: 788, labelY: 36, labelAnchor: "middle" },
      { from: "s5", to: "s6", label: "처리 이력", labelX: 984, labelY: 36, labelAnchor: "middle" },
    ],
  },
];

const roleScreenRows = [
  {
    id: "role-finance",
    label: "회계·정산 담당자",
    detail: "입금 대조와 연체 청구",
    steps: [
      { index: "01", label: "입금 계약 자동 대조", screenId: "deposits" },
      { index: "02", label: "미매칭 검토", screenId: "unmatched" },
      { index: "03", label: "연체·정산", screenId: "overdue" },
      { index: "04", label: "결제·세금계산서", screenId: "billing" },
    ],
  },
  {
    id: "role-admin",
    label: "운영 담당자",
    detail: "고객·계약·운송과 고객 소통",
    steps: [
      { index: "01", label: "고객·상담", screenId: "customers" },
      { index: "02", label: "계약", screenId: "contracts" },
      { index: "03", label: "운송 배정·작업지시", screenId: "transport" },
      { index: "04", label: "계약 안내문·문서 보관", screenId: "documents" },
      { index: "05", label: "알림 발송·이력", screenId: "notifications" },
    ],
  },
  {
    id: "role-field",
    label: "창고 현장 담당자",
    detail: "입출고와 컨테이너",
    steps: [
      { index: "01", label: "입출고 일정 캘린더", screenId: "schedule" },
      { index: "02", label: "입출고 관리", screenId: "movements" },
      { index: "03", label: "창고·컨테이너", screenId: "warehouses" },
    ],
  },
];

const demoSteps: ServiceDemoSteps = [
  {
    index: "01",
    label: "고객·보관 조건 상담",
    detail: "물품·예상 물량·기간·희망 보관 등급과 전체·부분 입출고 계획을 상담 원장에 남깁니다.",
    screenId: "customers",
  },
  {
    index: "02",
    label: "자체·외부 운송 배정",
    detail: "자체 이사팀과 외부 계약업체를 구분하고, 출고 건의 입고 운송사를 불러와 배정 근거를 남깁니다.",
    screenId: "transport",
  },
  {
    index: "03",
    label: "작업지시 3자 발송",
    detail: "고객·희망 시각·주소·수취인을 운영팀·창고팀·운송업체에 동시에 보냅니다.",
    screenId: "transport",
  },
  {
    index: "04",
    label: "전체·부분 출고완료",
    detail: "전체 출고만 계약을 종료하고, 부분 출고와 재입고·재배치는 보관 원장을 유지합니다.",
    screenId: "movements",
  },
  {
    index: "05",
    label: "계약 내용·사진 확인",
    detail: "계약 내용을 복사하고 고객 열람 사진과 내부 사진을 구분해 내려받습니다.",
    screenId: "documents",
  },
  {
    index: "06",
    label: "2026년 장부 검증",
    detail: "계약 662행·출고 1,020행과 완전 중복 25건의 검증 결과를 확인합니다.",
    screenId: "migration",
  },
];

const improvement: ServiceImprovementItems = [
  {
    title: "상담 조건을 창고 운영 기준으로",
    description:
      "물품·물량·기간·희망 등급과 입출고 계획을 기록해 적합한 보관 환경과 출입·하역 조건을 빠르게 확인합니다.",
    icon: <GitCompareArrows size={20} />,
  },
  {
    title: "자체 이사팀과 계약업체를 한 원장으로",
    description:
      "운송 주체를 구분하되 같은 배정·수행 이력으로 관리하고, 작업지시는 운영팀·창고팀·운송업체에 동시에 전달합니다.",
    icon: <Wallet size={20} />,
  },
  {
    title: "부분 출고는 보관 계약을 유지합니다",
    description:
      "전체 출고완료 때만 고객·계약·컨테이너를 종료하고, 부분 출고와 재입고·재배치는 이력만 남긴 채 보관을 유지합니다.",
    icon: <ShieldCheck size={20} />,
  },
];

const workflow: ServiceWorkflowSteps = [
  {
    index: "01",
    actor: "회계·정산 담당자",
    label: "입금 계약 자동 대조",
    detail: "은행 거래내역 가져오기·검증과 자동 대조, 배치별 결과서",
    screenId: "deposits",
  },
  {
    index: "02",
    actor: "회계·정산 담당자",
    label: "미매칭 검토",
    detail: "동명이인 판정, 수동 연결, 입금자명 저장, 분할 합산, 보류",
    screenId: "unmatched",
  },
  {
    index: "03",
    actor: "운영 담당자",
    label: "계약",
    detail: "만료일 자동 재계산, 입금 이력, 종료 구분",
    screenId: "contracts",
  },
  {
    index: "04",
    actor: "회계·정산 담당자",
    label: "연체·정산",
    detail: "연체료 계산, 출고 초과 정산, 청구 조정",
    screenId: "overdue",
  },
  {
    index: "05",
    actor: "운영 담당자",
    label: "계약 안내문·문서 보관",
    detail: "개인/법인/법원 양식 분기, 동시 발송, 자동 보관",
    screenId: "documents",
  },
  {
    index: "06",
    actor: "창고 현장 담당자",
    label: "입출고 일정 캘린더",
    detail: "팀별 일정, 처리 완료 표시, 처리자 기록",
    screenId: "schedule",
  },
];

const features: ServiceFeatureItems = [
  {
    title: "보관 조건을 구조화한 고객 상담",
    description:
      "물품·예상 물량·보관 기간·희망 등급·입출고 계획을 상담 메모와 함께 저장해 계약과 창고 배정의 기준으로 사용합니다.",
    icon: <Wallet size={20} />,
  },
  {
    title: "보관 등급별 창고 운영",
    description:
      "컨테이너·실내 관리형·프리미엄 보관의 환경, 출입, 보안, 하역 조건과 가동 현황을 창고 기준정보로 확인합니다.",
    icon: <GitCompareArrows size={20} />,
  },
  {
    title: "자체·외부 운송 배정과 작업지시",
    description:
      "자체 이사팀과 외부 계약업체를 구분해 배정하고 고객·희망 시각·주소·처리 범위를 실제 담당자에게 전달합니다.",
    icon: <Container size={20} />,
  },
  {
    title: "전체·부분·재배치 입출고",
    description:
      "전체 출고만 계약과 컨테이너를 종료하고 부분 출고·재입고·재배치는 보관 상태를 유지해 현장 처리와 원장을 맞춥니다.",
    icon: <FileText size={20} />,
  },
  {
    title: "계약·입금·안내문 연결",
    description:
      "계약 기간·입금 대조·연체·안내문·세금계산서를 이어 관리하고 발송 실패와 수동 판정 근거를 이력으로 남깁니다.",
    icon: <BellRing size={20} />,
  },
  {
    title: "현장 모바일과 사진 증빙",
    description:
      "창고 담당자가 휴대폰에서 단계를 진행하고 현장 사진과 공개 범위를 기록합니다. 동영상은 같은 증빙 원장으로 확장할 수 있습니다.",
    icon: <Truck size={20} />,
  },
];

function ResultVisual() {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-head-text">
          <h3>2026-09-02 대조 배치 결과</h3>
          <p>업로드 직후 화면에 표시되는 실제 요약입니다.</p>
        </div>
        <StateText tone="ok">자동 4건</StateText>
      </div>
      <DescGrid
        columns="2"
        items={[
          { label: "적재 건수", value: "9건 · ₩2,370,000" },
          { label: "자동 매칭", value: "4건 · ₩1,350,000" },
          { label: "검토 필요", value: "5건 · ₩1,020,000" },
          { label: "처리자", value: "윤서진 · 09:12" },
        ]}
      />
      <TableWrap>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">입금자명</th>
              <th scope="col" className="numeric">금액</th>
              <th scope="col">판정</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="입금자명">한지웅</td>
              <td data-label="금액" className="numeric amount tabular">₩165,000</td>
              <td data-label="판정">
                <StateText tone="ok">자동 매칭</StateText>
              </td>
            </tr>
            <tr>
              <td data-label="입금자명">이수민</td>
              <td data-label="금액" className="numeric amount tabular">₩150,000</td>
              <td data-label="판정">
                <StateText tone="warn">동명이인</StateText>
              </td>
            </tr>
            <tr>
              <td data-label="입금자명">김성호</td>
              <td data-label="금액" className="numeric amount tabular">₩480,000</td>
              <td data-label="판정">
                <StateText tone="warn">등록명 없음</StateText>
              </td>
            </tr>
            <tr>
              <td data-label="입금자명">박도윤</td>
              <td data-label="금액" className="numeric amount tabular">₩150,000</td>
              <td data-label="판정">
                <StateText tone="info">분할 입금</StateText>
              </td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
    </div>
  );
}

export default function ServiceIntroduction({
  onNavigate,
}: {
  onNavigate: (screenId: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  // 잠긴 마스터가 그리는 흐름도 안의 노드 색인·행위자·연결선 라벨은 설계 문서가 12px 로
  // 고정한 다이어그램 메타데이터다. 마스터는 그 표시를 props 로 받지 않으므로 이 화면에서
  // SVG 캔버스에 직접 붙인다. 탭을 바꾸면 SVG 가 다시 그려지므로 매 렌더마다 확인한다.
  useEffect(() => {
    rootRef.current
      ?.querySelectorAll("[data-service-flow-svg]")
      .forEach((svg) => svg.setAttribute("data-density", "meta"));
  });

  return (
    <div ref={rootRef}>
    <ServiceIntroductionScreen
      hero={{
        kicker: "컨테이너 보관 창고 운영 ERP · 재공고 개정판",
        title: "상담부터 보관·운송·부분 출고까지 한 원장으로 연결합니다",
        lead: "고객의 물품·물량·기간·희망 보관 등급을 상담에 남기고 자체 이사팀과 외부 계약업체를 배정합니다. 전체 출고만 계약을 종료하며 부분 출고와 재입고·재배치는 보관 상태를 유지합니다.",
        proofKind: "rfp-image",
        image: {
          src: "/hero-landing.jpg",
          alt: "컨테이너 보관 창고 운영 담당자가 운송 배정과 입출고 진행을 확인하는 업무 장면",
          position: "center",
        },
        primaryAction: { label: "5분 시연 시작 · 운송 배정", screenId: "transport" },
        secondaryAction: { label: "전체 화면 구성 보기", screenId: "overview" },
        proofPoints: [
          "컨테이너·실내 관리형·프리미엄 보관 기준정보",
          "자체 이사팀·외부 계약업체 배정과 3자 작업지시",
          "전체 출고 종료 · 부분 출고·재배치 보관 유지",
        ],
      }}
      flowEyebrow="업무 연결"
      flowTitle="누가 시작해서 어디로 넘어가는지 먼저 확인하세요"
      flowLead="역할별 인계 경로와 전체 업무 흐름을 각각 다른 그림으로 보여 드립니다. 그림 안의 어떤 상자든 누르면 실제 구현 화면이 열립니다."
      flowViews={flowViews}
      roleScreenRows={roleScreenRows}
      result={{
        eyebrow: "결과물",
        kicker: "담당자가 눈으로 확인하는 최종 결과",
        title: "남는 것은 상담 조건부터 보관 완료까지 연결된 작업 이력입니다",
        description:
          "보관 물품·기간·등급, 자체·외부 운송 배정 근거, 전달한 작업지시, 전체·부분 입출고 처리자와 시각이 계약 건에 묶여 남습니다. 기존 입금 대조·정산·문서 흐름도 그대로 이어집니다.",
        actions: [
          { label: "운송 배정·작업지시 열기", screenId: "transport" },
          { label: "계약 원장 확인", screenId: "contracts" },
        ],
        visual: <ResultVisual />,
      }}
      demoTitle="5분이면 핵심 업무를 끝까지 확인하실 수 있습니다"
      demoLead="아래 순서대로 누르시면 업로드에서 지표 확인까지 실제 데이터가 이어지는 것을 보실 수 있습니다."
      demoSteps={demoSteps}
      improvement={{
        eyebrow: "업무 개선",
        title: "수작업이 줄어드는 지점은 세 곳입니다",
        lead: "공고에서 말씀하신 `담당자는 예외 건만 확인`을 실제 화면에서 어떻게 만드는지입니다.",
        items: improvement,
      }}
      support={{
        eyebrow: "수행 신뢰",
        title: "개발자가 없어도 진행 상황을 화면으로 확인하실 수 있습니다",
        description:
          "문서 대신 작동하는 화면으로 확인합니다. 지금 보고 계신 프로토타입이 1단계이고, 계약 후 실제 서식과 규칙을 반영한 2차 프로토타입을 최종 확인받은 뒤에 본 개발을 시작합니다.",
        action: { label: "개발·검수 방식 보기", screenId: "delivery" },
        icon: <Users size={20} />,
      }}
      workflow={{
        eyebrow: "단계별 화면",
        title: "단계마다 어떤 화면에서 무엇을 하는지",
        lead: "각 카드를 누르면 그 단계의 실제 화면이 열립니다.",
        steps: workflow,
      }}
      features={{
        eyebrow: "주요 기능",
        title: "공고의 기능 요구를 실제 동작으로 옮긴 부분",
        lead: "기능 이름이 아니라 그 기능이 바꾸는 업무를 적었습니다.",
        items: features,
      }}
      scope={{
        eyebrow: "범위",
        title: "이번 범위와 별도로 확인이 필요한 항목",
        lead: "공고에서 확정되지 않았다고 하신 항목은 착수 전 결정사항에서 권장안과 함께 정리했습니다.",
        included: {
          title: "이번 범위",
        subtitle: "제안 금액 5,500만원과 120일 일정의 기본 범위입니다",
          items: [
            "요구사항 정의서·화면 설계서, 입금 대조·연체·정산 규칙 정의서, 외부 연동 규격서",
            "보관 등급·환경·출입·보안 기준과 자체·외부 운송 원장·배정·재배정·작업지시 발송 이력",
            "고객용 안내문 열람 페이지와 기존 챗봇 연계 신청 접수",
            "결제선생·센드빌·알림톡·문자 연동과 실패 재처리 흐름",
            "기존 엑셀 장부 이관과 검증, 클라우드 배포, 매일 1회 암호화 백업, 보안 점검 결과서",
            "오픈 후 3개월 하자보수",
          ],
          footnote: "전체 소스코드와 DB 스키마, 배포·운영 매뉴얼을 발주사 저장소에 남깁니다.",
        },
        separate: {
          title: "확인·별도 협의",
          subtitle: "범위·비용·일정이 달라지는 항목입니다",
          items: [
            "결제선생 운영 키, 센드빌 공동인증서, 알림톡 발신번호 발급 시점과 주체",
            "기존 챗봇의 연동 규격서와 콜백 주소 제공",
            "사설 VPN 구성 방식과 접속 인원·기기 수, 계정·인증서 운영 기준",
            "현장 사진 업로드 주체와 운송업체 일회성 입력 링크·동영상 증빙 포함 여부",
            "출고 전 알림의 기준일과 문구, 사진 고객 공개 범위",
            "견적 계산·예약금 수납은 제외, 운송 정산·매입 세금계산서는 후속 확장",
          ],
          footnote: "네이티브 Android·iOS 앱은 공고 본문대로 이번 범위에서 제외합니다.",
        },
        guide: {
          title: "아직 정하지 않은 범위에 대한 의견",
          description: "재공고의 사진·알림·운송업체 권한과 사설 VPN 기준에 대한 권장안·착수 미팅 조율 기준을 정리했습니다.",
          action: { label: "착수 전 결정사항 보기", screenId: "decisions" },
        },
      }}
      finalCta={{
        title: "보관 조건을 확인하고 부분 출고까지 직접 진행해 보세요",
        description:
          "고객 상담의 보관 조건과 창고 등급을 확인하고 운송 주체를 배정한 뒤, 입출고 관리에서 전체 출고와 부분 출고의 원장 반영 차이를 확인할 수 있습니다.",
        action: { label: "운송 배정에서 시작", screenId: "transport" },
      }}
      onNavigate={onNavigate}
    />
    </div>
  );
}
