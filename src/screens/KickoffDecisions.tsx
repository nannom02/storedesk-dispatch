import { Camera, FileSpreadsheet, ListChecks, Network, ShieldCheck } from "lucide-react";

import { KickoffDecisionScreen } from "../out/safedesk-master/ProposalExplanationScreens";

const decisions = [
  {
    id: "photo",
    index: "01",
    title: "현장 사진 업로드 주체와 공개 범위",
    recommendation: "운영자 업로드 기본안",
    rationale:
      "공고는 운송업체 로그인을 허용하지 않으면서 운송 당일 사진 촬영도 언급합니다. 충돌을 피하려면 운영 담당자가 전달받은 사진을 건별로 올리는 흐름을 기본으로 두는 편이 안전합니다.",
    included:
      "입고 사진은 고객 열람, 출고 사진은 내부 전용으로 구분하고 출고 사진은 완료 후 1개월 보관하는 기본안을 제안합니다.",
    separate:
      "운송업체 일회성 업로드 링크가 필요하면 별도 옵션으로 견적과 보안 기준을 조율합니다.",
    later:
      "촬영 시각·위치 자동 기록과 손상 비교는 운영 데이터를 확인한 뒤 확장합니다.",
    clientCheck:
      "입고·출고 사진의 업로드 담당과 고객 공개 범위를 확정합니다.",
    detailScreenId: "movements",
    detailLinkLabel: "입출고 관리에서 확인",
    icon: <Camera size={20} />,
  },
  {
    id: "receipt",
    index: "02",
    title: "출고 전 안내의 기준일",
    recommendation: "D-10 기본안",
    rationale:
      "공고 본문은 만료 전 안내를 요청하고 첨부 흐름은 출고일 D-10을 제시합니다. 기준 필드를 하나로 확정해야 중복·누락을 막을 수 있습니다.",
    included:
      "출고예정일 D-10과 납부기한 당일 미납 안내를 기본안으로 제안합니다.",
    separate:
      "계약 만료일과 실제 출고예정일 중 어떤 값을 자동 알림 기준으로 삼을지 조율합니다.",
    later:
      "연장 선택 결과에 따른 단계별 예약 발송은 확정된 기준에 이어 확장합니다.",
    clientCheck:
      "D-10 기준 날짜와 납부기한 알림 문구를 확인합니다.",
    detailScreenId: "documents",
    detailLinkLabel: "문서 화면에서 확인",
    icon: <FileSpreadsheet size={20} />,
  },
  {
    id: "approval",
    index: "03",
    title: "운송업체의 입력 권한",
    recommendation: "로그인 없는 읽기 전용",
    rationale:
      "공고는 운송업체가 로그인하지 않고 전달받은 정보만 읽도록 명시했습니다. 사진 업로드 때문에 입력 권한을 임의로 넓히지 않습니다.",
    included:
      "일회성 읽기 링크에서 작업지시만 열람하는 기본안을 제안합니다.",
    separate:
      "사진 직접 업로드가 필요하면 일회성 업로드 링크의 유효시간·파일 제한을 별도 확정합니다.",
    later:
      "업체용 포털이나 정산 입력은 후속 범위의 기존 운송업체 ID에 이어 확장합니다.",
    clientCheck:
      "운송업체가 사진을 직접 올려야 하는지 확인합니다.",
    detailScreenId: "audit",
    detailLinkLabel: "권한·활동 로그에서 확인",
    icon: <ListChecks size={20} />,
  },
  {
    id: "schedule-send",
    index: "04",
    title: "선택 기능의 별도 견적",
    recommendation: "기본·선택 범위 분리",
    rationale:
      "운송업체 입력 링크, 사진 자동 분류 등 선택 항목이 기본 범위와 섞이면 제안 금액과 일정 판단이 어려워집니다.",
    included:
      "운송 배정·작업지시·읽기 전용 전달과 운영자 사진 업로드를 기본안으로 제안합니다.",
    separate:
      "선택 기능은 기능별 예상 비용과 일정 영향을 별도 표로 제시합니다.",
    later:
      "운송업체 정산·매입 세금계산서는 저장된 비용 원장에 이어 후속 개발합니다.",
    clientCheck:
      "선택 항목 중 이번 계약에 포함할 기능을 조율합니다.",
    detailScreenId: "notifications",
    detailLinkLabel: "알림 발송 화면에서 확인",
    icon: <Network size={20} />,
  },
  {
    id: "vpn",
    index: "05",
    title: "사설 VPN 구성 방식",
    recommendation: "접속 환경에 맞춘 구성 권장",
    rationale:
      "사설 VPN을 기본 보안 구성에 포함하고, 접속 인원·기기 수와 기존 네트워크 환경에 맞춰 접속 방식을 설계합니다. 계정·인증서 발급과 폐기 절차까지 함께 정리합니다.",
    included:
      "ERP 외 직접 접근 차단, 사설 VPN, 로그인 실패 제한·자동 로그아웃, 관리자 권한 제어, 일 1회 암호화 백업을 기본안으로 제안합니다.",
    separate:
      "접속 인원·기기 수와 기존 네트워크 환경에 따라 VPN 서비스, 계정·인증서 운영, 기기 설치 지원 범위와 월 운영 비용을 조율합니다.",
    later:
      "접속 인원이나 거점이 늘면 기존 접근 정책을 유지하면서 VPN 계정과 허용 기기를 확장합니다.",
    clientCheck:
      "접속 인원·기기 수, 기존 네트워크 환경과 계정·인증서 담당자를 확인합니다.",
    detailScreenId: "architecture",
    detailLinkLabel: "연동·배포 설계에서 확인",
    icon: <ShieldCheck size={20} />,
  },
];

export default function KickoffDecisions({ onNavigate }: { onNavigate: (screenId: string) => void }) {
  return (
    <div className="screen" data-screen-wide="true">
      <KickoffDecisionScreen
        lead="착수 전 미확정인 사진·알림·운송업체 권한·선택 견적과 사설 VPN 기준을 실제 구현 관점에서 구체화했습니다."
        recommendationTitle="권장안으로 범위를 함께 확정합니다"
        recommendationDetail="각 항목의 권장 구현안과 조율 기준을 정리했습니다. 착수 미팅에서 포함 범위와 단가를 협의하고, 이후 확장 시점까지 함께 정합니다."
        decisions={decisions}
        onNavigate={onNavigate}
      />
    </div>
  );
}
