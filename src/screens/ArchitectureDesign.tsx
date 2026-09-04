import {
  IntegrationDeploymentScreen,
  createMsoftechManagedOperatingProfile,
} from "../out/safedesk-master/ProposalExplanationScreens";
import type {
  ArchitectureDecisionSet,
  ArchitectureNodeSet,
  ArchitectureOption,
  ArchitectureRunbook,
  ArchitectureStackSet,
} from "../out/safedesk-master/ProposalExplanationScreens";

const nodes: ArchitectureNodeSet = [
  {
    id: "user",
    title: "담당자 · 현장 · 고객",
    detail: "사무실 PC 웹, 창고 현장 모바일 웹, 고객 안내문 열람 링크",
    transfer: "로그인·조회·처리 요청",
  },
  {
    id: "app",
    title: "StoreDesk 관리자 웹",
    detail: "React 화면과 서버리스 API를 Vercel에서 함께 운영",
    transfer: "계약·입금·발송 처리",
    primary: true,
  },
  {
    id: "data",
    title: "Supabase 인증·데이터베이스",
    detail: "로그인·권한, 고객·계약·입금·이력 PostgreSQL 저장",
    transfer: "연동 요청·발송 결과",
  },
  {
    id: "external",
    title: "외부 연동과 최종 산출물",
    detail: "결제선생·센드빌·알림톡·문자·기존 챗봇, 안내문 PDF와 대조 결과서",
  },
];

const stack: ArchitectureStackSet = [
  {
    title: "Vercel · 화면과 API",
    detail: "React 관리자 웹과 서버리스 API를 함께 배포합니다. 미리보기 주소로 검수한 뒤 운영으로 올립니다.",
  },
  {
    title: "Supabase Auth · 로그인과 권한",
    detail: "관리자/최고관리자 등급, 로그인 실패 제한, 자동 로그아웃, 기능별 권한을 여기서 관리합니다.",
  },
  {
    title: "Supabase PostgreSQL · 업무 데이터",
    detail: "고객 1,500명, 계약, 컨테이너, 입금 거래, 발송·처리 이력을 저장하고 매일 자동 백업합니다.",
  },
  {
    title: "Supabase Storage · 파일 보관",
    detail: "사업자등록증, 계약서, 안내문 PDF, 현장 사진을 계약 건에 묶어 보관하고 접근 권한을 제한합니다.",
  },
];

const kickoffItems: ArchitectureDecisionSet = [
  {
    title: "계정 명의와 소유권",
    detail:
      "GitHub·Vercel·Supabase·도메인을 발주사 명의로 먼저 만들고, 구축팀은 초대받은 협업자로 참여합니다. 공고의 `계정은 발주사 명의로 생성해 주세요` 요건을 그대로 따릅니다.",
  },
  {
    title: "외부 연동 접근 권한",
    detail:
      "결제선생 운영 키, 센드빌 공동인증서, 알림톡 채널과 발신번호, 기존 챗봇 연동 규격서를 언제 받을 수 있는지 정합니다. 지금은 테스트 키 기준으로 구현되어 있습니다.",
  },
  {
    title: "엑셀 장부 원본과 보존",
    detail:
      "이관할 엑셀 원본 파일과 기준 시점을 정하고, 이관 후 원본을 어디에 얼마나 보관할지 정합니다. 개인정보가 포함되므로 접근 가능한 사람을 함께 정합니다.",
  },
  {
    title: "사설 VPN 운영 기준",
    detail:
      "사설 VPN을 기본 접근 통제로 구성하고, 접속 인원·기기 수와 기존 네트워크 환경에 맞춰 VPN 서비스, 계정·인증서 발급·폐기, 기기 설치 지원 범위를 확정합니다.",
  },
];

const runbook: ArchitectureRunbook = [
  {
    title: "검증",
    detail: "코드 검사·타입 검사·테스트·화면 검사를 통과한 변경만 배포 대상이 됩니다.",
  },
  {
    title: "미리보기 검수",
    detail: "운영 주소를 덮지 않는 별도 주소로 먼저 올려 발주사가 확인합니다.",
  },
  {
    title: "운영 반영",
    detail: "확인이 끝난 버전만 운영으로 승격하고 배포 이력에 시각과 변경 내용을 남깁니다.",
  },
  {
    title: "롤백·복구",
    detail:
      "문제가 생기면 이전 배포로 즉시 되돌리고, 데이터는 매일 1회 암호화 백업에서 시점 복구합니다.",
  },
];

const options: readonly [ArchitectureOption, ...ArchitectureOption[]] = [
  {
    id: "recommended",
    label: "권장 · Vercel + Supabase",
    recommendation:
      "고객 약 1,500명, 사내 담당자 소수, 매월 수백 건의 입금 대조 규모에는 관리형 조합이 가장 안전합니다. 장비 구매와 서버 관리 인력이 없어도 백업·복구·모니터링이 기본으로 따라옵니다.",
    facts: [
      { label: "초기 구축 비용", value: "장비 구매 없음 · 계정 생성과 환경 구성만 수행" },
      {
        label: "월 고정 비용(추정)",
        value:
          "Vercel Pro 미화 20달러/사용자, Supabase Pro 미화 25달러/프로젝트 기준. 부가세·환율·초과 사용량 별도이며 공식 요금은 아래 링크에서 확인합니다.",
      },
      {
        label: "종량 항목",
        value: "저장 용량, 전송량, 함수 실행 시간. 현장 사진을 포함하면 저장 용량이 먼저 늘어납니다.",
      },
      { label: "유료 연동", value: "결제선생·센드빌·알림톡 이용료는 각 사업자와 발주사가 직접 계약" },
      { label: "백업", value: "매일 1회 자동 백업 · 시점 복구 제공 · 별도 저장소 암호화 보관" },
      { label: "확장", value: "이용자와 데이터가 늘어도 요금제 상향으로 대응하며 구조 변경 없음" },
    ],
    guidance: [
      {
        title: "운영 인력이 없어도 유지됩니다",
        detail: "서버 패치와 인증서 갱신을 직접 하지 않아도 되고, 장애 시 이전 배포로 즉시 되돌립니다.",
      },
      {
        title: "데이터와 소스는 발주사에 남습니다",
        detail: "계정이 발주사 명의이므로 계약이 끝나도 저장소·데이터베이스·파일을 그대로 보유합니다.",
      },
      {
        title: "3개월 하자보수 후 유지보수 선택",
        detail:
          "오픈 후 3개월 하자보수는 제안 범위에 포함합니다. 이후 월 단위 유지보수는 발주사에 전산 담당자가 없으므로 구축팀 유지보수를 제안 기본값으로 두되, 계약은 별도로 협의합니다.",
      },
    ],
  },
  {
    id: "expansion",
    label: "확장 전환 기준",
    recommendation:
      "지금 다른 구성을 고를 이유는 없습니다. 다만 아래 조건 중 하나가 실제로 생기면 그때 구성을 바꾸는 편이 낫습니다. 미리 서버를 사 두는 것은 비용만 늘립니다.",
    facts: [
      {
        label: "전용 서버가 필요해지는 시점",
        value: "장시간 실행되는 배치나 대용량 파일 변환이 상시 업무가 될 때",
      },
      {
        label: "내부망 격리가 필요해지는 시점",
        value: "내부 규정이나 감사 요구로 외부 인터넷 접근 자체를 막아야 할 때",
      },
      {
        label: "저장 용량 전환 시점",
        value: "현장 사진과 문서가 수백 기가바이트로 늘어 객체 스토리지 요금이 서버 비용을 넘길 때",
      },
      {
        label: "전환 시 추가되는 것",
        value: "서버 임대료 또는 장비 구매비, 서버 관리 인력 또는 위탁 운영비, 백업 장비와 절차",
      },
      {
        label: "전환해도 유지되는 것",
        value: "화면·업무 로직·데이터 구조는 그대로 옮겨집니다. 애플리케이션을 다시 만들지 않습니다.",
      },
      {
        label: "판단 시점",
        value: "오픈 후 3개월 하자보수 기간의 사용량을 함께 보고 결정합니다.",
      },
    ],
    guidance: [
      {
        title: "지금 전환하면 손해입니다",
        detail:
          "현재 규모에서는 서버를 따로 두면 구축·관리 비용이 늘고, 담당자가 없어 장애 대응이 늦어집니다.",
      },
      {
        title: "전환 판단은 숫자로 합니다",
        detail: "저장 용량, 월 전송량, 배치 실행 시간을 운영 3개월 동안 기록해 두고 그 값으로 판단합니다.",
      },
      {
        title: "사설 VPN과 서버 선택은 분리합니다",
        detail:
          "사설 VPN을 구성해도 반드시 전용 서버가 필요한 것은 아닙니다. 권장 클라우드 구성에 접근 통제를 함께 적용할 수 있습니다.",
      },
    ],
  },
];

export default function ArchitectureDesign() {
  return (
    <div className="screen" data-screen-wide="true">
      <IntegrationDeploymentScreen
        lead="개발자가 없는 조직에서도 운영할 수 있는 구성으로 제안합니다. 무엇이 어디에서 돌아가고, 계정과 데이터는 누구 것이며, 매달 얼마가 들고, 문제가 생기면 어떻게 되돌리는지를 그림과 표로 정리했습니다."
        nodes={nodes}
        stack={stack}
        operatingProfile={createMsoftechManagedOperatingProfile({
          scale:
            "고객 약 1,500명, 진행 계약 수백 건, 월 은행 거래내역 수백 행, 컨테이너 222기, 사내 사용자 5명 내외를 기준으로 산정했습니다.",
          maintenanceScope:
            "오픈 후 3개월은 하자보수로 대응합니다. 발주사에 전산 담당자가 없으므로 이후에는 구축팀 월 단위 유지보수를 제안 기본값으로 두며, 범위와 금액은 계약 시 별도로 협의합니다.",
        })}
        ownership="계정·도메인·소스코드·운영 데이터·업무 파일은 모두 발주사 소유입니다. 구축팀은 초대받은 협업자로 접근하며 계약 종료 시 권한을 반납합니다. 애플리케이션 취약점 대응과 배포 절차는 구축팀이, 계정 관리·비밀번호·외부 연동 계약·물리 보안은 발주사가 책임집니다. 클라우드 인프라 보안은 각 사업자의 공식 기준을 따릅니다."
        decisions={kickoffItems}
        runbook={runbook}
        options={options}
        legacyData={{
          title: "기존 엑셀 장부 이관",
          subtitle: "고객 약 1,482행 · 2025년·2026년 장부 2개 파일",
          steps: [
            "원본 파일과 기준 시점을 받아 사본으로만 작업합니다.",
            "연락처 형식·기간 역전·컨테이너 중복 배정·입금자명 공백을 규칙으로 검증합니다.",
            "운영과 분리된 검증 환경에 먼저 올려 화면에서 직접 확인합니다.",
            "발주사 확인 후 운영에 반영하고 원본은 접근 제한 저장소에 보관합니다.",
          ],
          note: "검증 결과와 오류 행은 데이터 이관·검증 화면에서 그대로 확인하실 수 있습니다.",
        }}
        recommendationTitle="권장 기본안 · Vercel + Supabase"
        recommendationDetail="별도 장비 구매 없이 시작하고, 계정과 데이터는 발주사 명의로 남깁니다. 매일 1회 자동 백업과 즉시 롤백이 기본으로 포함됩니다."
        deploymentTitle="Vercel + Supabase 배포 구성"
        deploymentSubtitle="관리자 웹·API·데이터베이스·파일을 한 조합으로 운영하고, 배포 이력과 복구 경로를 남깁니다."
        costLinks={[
          { label: "Vercel 공식 요금", href: "https://vercel.com/pricing" },
          { label: "Supabase 공식 요금", href: "https://supabase.com/pricing" },
        ]}
        securityLinks={[
          { label: "Vercel 보안 문서", href: "https://vercel.com/docs/security" },
          { label: "Supabase 보안·규정 준수", href: "https://supabase.com/security" },
        ]}
      />
    </div>
  );
}
