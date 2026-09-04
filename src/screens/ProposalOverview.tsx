import {
  BellRing,
  Boxes,
  CalendarDays,
  ClipboardList,
  Container,
  CreditCard,
  DatabaseZap,
  FileText,
  GitCompareArrows,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { ProposalOverviewScreen } from "../out/safedesk-master/ProposalExplanationScreens";

const workflow = [
  {
    id: "wf-transport",
    screenId: "transport",
    title: "운송 배정·지시",
    detail: "업체 배정·3자 동시 발송",
    icon: <Truck size={18} />,
  },
  {
    id: "wf-upload",
    screenId: "deposits",
    title: "거래내역 업로드",
    detail: "은행 엑셀 9건 적재·자동 대조",
    icon: <Wallet size={18} />,
  },
  {
    id: "wf-review",
    screenId: "unmatched",
    title: "예외만 검토",
    detail: "동명이인·등록명·분할·보류 판정",
    icon: <GitCompareArrows size={18} />,
  },
  {
    id: "wf-contract",
    screenId: "contracts",
    title: "계약 갱신",
    detail: "만료일 재계산·연체 상태 갱신",
    icon: <ClipboardList size={18} />,
  },
  {
    id: "wf-claim",
    screenId: "overdue",
    title: "청구·정산",
    detail: "연체료 계산·청구 금액 조정",
    icon: <Boxes size={18} />,
  },
  {
    id: "wf-send",
    screenId: "notifications",
    title: "안내 발송",
    detail: "알림톡 발송·실패 문자 재발송",
    icon: <BellRing size={18} />,
  },
  {
    id: "wf-dashboard",
    screenId: "dashboard",
    title: "결과 확인",
    detail: "지표·처리 이력으로 마감 확인",
    icon: <LayoutDashboard size={18} />,
  },
];

const roles = [
  {
    id: "admin",
    title: "운영 담당자",
    responsibility: "고객·계약·문서",
    description:
      "고객 등록과 상담, 계약 기간과 컨테이너 배정, 안내문 발송까지 일상 업무 전체를 처리합니다. 관리 대상은 약 1,500명입니다.",
    environments: ["PC 웹"],
    sections: [
      {
        title: "고객과 계약",
        screens: [
          {
            id: "ov-dashboard",
            screenId: "dashboard",
            title: "운영 대시보드",
            detail: "가동률·미수금·연체·만료 지표와 대상 목록 이동",
            icon: <LayoutDashboard size={18} />,
          },
          {
            id: "ov-customers",
            screenId: "customers",
            title: "고객·상담",
            detail: "개인/법인 구분, 상담일지, 복수 입금자명, 수신 제외",
            icon: <Users size={18} />,
          },
          {
            id: "ov-contracts",
            screenId: "contracts",
            title: "계약",
            detail: "기간·이용료·보증금·결제 구분과 입금 이력",
            icon: <ClipboardList size={18} />,
          },
          {
            id: "ov-transport",
            screenId: "transport",
            title: "운송 배정·작업지시",
            detail: "운송업체 원장, 배정·재배정, 비용, 3자 발송 이력",
            icon: <Truck size={18} />,
          },
        ],
      },
      {
        title: "문서와 고객 소통",
        screens: [
          {
            id: "ov-documents",
            screenId: "documents",
            title: "계약 안내문·문서 보관",
            detail: "개인/법인/법원 양식 분기, 동시 발송, 자동 보관",
            icon: <FileText size={18} />,
          },
          {
            id: "ov-notifications",
            screenId: "notifications",
            title: "알림 발송·이력",
            detail: "문구 자동 채움, 선택 발송, 실패 문자 재발송",
            icon: <BellRing size={18} />,
          },
          {
            id: "ov-chatbot",
            screenId: "chatbot",
            title: "챗봇 신청 접수",
            detail: "연장·출고 신청 접수와 담당자 전달, 챗봇 문구 수정",
            icon: <MessageSquareText size={18} />,
          },
        ],
      },
    ],
  },
  {
    id: "field",
    title: "창고 현장 담당자",
    responsibility: "입출고·컨테이너",
    description:
      "창고 3개소에서 반입·반출을 진행하고 컨테이너 배정을 확인합니다. 현장에서는 휴대폰으로 오늘 작업, 고객 조회, 창고번호 조회를 사용합니다.",
    environments: ["PC 웹", "모바일 웹"],
    sections: [
      {
        title: "현장 업무",
        screens: [
          {
            id: "ov-movements",
            screenId: "movements",
            title: "입출고 관리",
            detail: "입고 4단계·출고 3단계 진행, 현장 사진, 모바일 조회",
            icon: <Truck size={18} />,
          },
          {
            id: "ov-schedule",
            screenId: "schedule",
            title: "입출고 일정 캘린더",
            detail: "팀별 색 구분, 일정 등록·변경, 처리 완료 표시",
            icon: <CalendarDays size={18} />,
          },
          {
            id: "ov-warehouses",
            screenId: "warehouses",
            title: "창고·컨테이너",
            detail: "창고 3개소 기준정보, 배치도, 컨테이너 배정",
            icon: <Container size={18} />,
          },
        ],
      },
    ],
  },
  {
    id: "finance",
    title: "회계·정산 담당자",
    responsibility: "입금·연체·세금계산서",
    description:
      "은행 거래내역을 대조하고 예외 건만 판정합니다. 연체료와 청구 금액을 정산하고 결제선생·센드빌 연동으로 결제와 발행을 처리합니다.",
    environments: ["PC 웹"],
    sections: [
      {
        title: "입금과 정산",
        screens: [
          {
            id: "ov-deposits",
            screenId: "deposits",
            title: "입금 계약 자동 대조",
            detail: "거래내역 업로드, 자동 대조, 배치별 결과서",
            icon: <Wallet size={18} />,
          },
          {
            id: "ov-unmatched",
            screenId: "unmatched",
            title: "미매칭 검토",
            detail: "동명이인 판정, 수동 연결, 입금자명 저장, 분할 합산, 보류",
            icon: <GitCompareArrows size={18} />,
          },
          {
            id: "ov-overdue",
            screenId: "overdue",
            title: "연체·정산",
            detail: "연체료 계산, 출고 초과 정산, 청구 조정, 계정 집계",
            icon: <Boxes size={18} />,
          },
          {
            id: "ov-billing",
            screenId: "billing",
            title: "결제·세금계산서",
            detail: "카드 결제 2단계, 반복 청구, 일괄 발행, 실패 재처리",
            icon: <CreditCard size={18} />,
          },
        ],
      },
    ],
  },
  {
    id: "super",
    title: "최고관리자",
    responsibility: "권한·설정·이관",
    description:
      "권한 등급과 기능별 제한을 관리하고 처리 이력을 조회합니다. 연체료 규칙과 발송 시각, 공지사항을 설정하고 기존 엑셀 장부 이관을 승인합니다.",
    environments: ["PC 웹"],
    sections: [
      {
        title: "관리와 이관",
        screens: [
          {
            id: "ov-audit",
            screenId: "audit",
            title: "권한·활동 로그",
            detail: "관리자/최고관리자 권한, 삭제 제한, 처리 이력",
            icon: <ShieldCheck size={18} />,
          },
          {
            id: "ov-settings",
            screenId: "settings",
            title: "환경 설정",
            detail: "연체료 규칙, 판정·발송 시각, 인증 정책, 공지",
            icon: <Settings2 size={18} />,
          },
          {
            id: "ov-migration",
            screenId: "migration",
            title: "데이터 이관·검증",
            detail: "계약 662행·출고 1,020행, 중복 25건과 정규화 검증",
            icon: <DatabaseZap size={18} />,
          },
        ],
      },
    ],
  },
];

export default function ProposalOverview({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  return (
    <div className="screen" data-screen-wide="true">
      <ProposalOverviewScreen
        lead="운영·현장·회계 담당자가 고객·계약·운송·입출고 원장을 나눠 봅니다. 아래 단계와 화면을 누르면 실제 구현 화면이 열립니다."
        workflow={workflow}
        roles={roles}
        sourceOfTruth="계약 원장을 중심으로 고객·컨테이너·입출고·운송 배정을 연결합니다. 작업지시 발송과 출고완료 결과가 상태와 처리 이력에 그대로 이어집니다."
        onNavigate={onNavigate}
      />
    </div>
  );
}
