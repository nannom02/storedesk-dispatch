import { DevelopmentReviewScreen } from "../out/safedesk-master/ProposalExplanationScreens";

export default function DeliveryMethod({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  return (
    <div className="screen" data-screen-wide="true">
      <DevelopmentReviewScreen
        lead="사내에 개발자도 전산 담당자도 없다고 하셨습니다. 문서로 확인받는 대신 매 단계에서 실제 화면을 보고 확인하실 수 있도록 진행합니다. 지금 보고 계신 이 프로토타입이 그 첫 번째 산출물입니다."
        support={{
          eyebrow: "실무 담당자 1명 · 주 1회 오프라인 미팅",
          title: "요구사항 확인과 시범운영을 담당자 한 분의 시간에 맞춰 지원합니다",
          description:
            "요구사항을 확정하고 검수하시는 분이 한 분이라 확인 시점이 곧 일정입니다. 착수 인터뷰에서 엑셀 장부와 실제 발송 문구를 함께 보고, 중간 확인은 개발 주소에서 언제든 하실 수 있게 열어 둡니다. 주 1회 오프라인 미팅은 확인이 필요한 항목을 모아 한 번에 처리하는 자리로 씁니다.",
          participants: "실무 담당자 · 창고 현장 담당자 · 회계 담당자 공동 확인",
          schedule: "서울 강남 오프라인 주 1회 · 사이 기간은 개발 주소와 협업 채널로 확인",
          overviewActionLabel: "역할별 화면 구성 보기",
        }}
        onNavigateOverview={() => onNavigate("overview")}
      />
    </div>
  );
}
