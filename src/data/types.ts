export type CustomerKind = "개인" | "법인";
export type AcquisitionSource = string;
export type CustomerStorageStatus = "상담중" | "보관중" | "보관종료";

export interface Consultation {
  id: string;
  at: string;
  author: string;
  channel: "전화" | "방문" | "챗봇" | "문자";
  note: string;
}

export interface Customer {
  id: string;
  name: string;
  kind: CustomerKind;
  contact: string;
  subContact?: string;
  representative?: string;
  payerNames: string[];
  smsOptOut: boolean;
  manager: string;
  registeredAt: string;
  acquisitionSource?: AcquisitionSource;
  storageStatus?: CustomerStorageStatus;
  migratedFrom?: string;
  attachments: { name: string; uploadedAt: string }[];
  consultations: Consultation[];
}

export type ContractStatus = "정상" | "연체" | "만료" | "중도 해지";

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  payerName: string;
  method: "계좌이체" | "카드" | "현금";
  source: "자동 매칭" | "수동 연결" | "분할 합산" | "이관 데이터";
  note?: string;
}

export interface Contract {
  id: string;
  customerId: string;
  warehouseId: string;
  containerNo: string;
  startDate: string;
  endDate: string;
  monthlyFee: number;
  discount: number;
  deposit: number;
  payMethod: "계좌이체" | "카드(결제선생)" | "현금";
  status: ContractStatus;
  overdueDays: number;
  unpaidPrincipal: number;
  closeReason?: "정상 종료" | "중도 해지" | "연체 종료";
  driver?: string;
  legalCaseNo?: string;
  payments: PaymentRecord[];
}

export interface Warehouse {
  id: string;
  name: string;
  address: string;
  storageType: string;
  totalContainers: number;
  team: "A팀" | "B팀" | "C팀";
  managerName: string;
}

export interface ContainerOccupancyDetail {
  contractId: string;
  customerName: string;
  customerKind: CustomerKind;
  contact: string;
  startDate: string;
  endDate: string;
  monthlyFee: number;
  contractStatus: ContractStatus;
  paymentStatus: "입금 완료" | "입금 예정" | "확인 필요";
  latestMovement: string;
  manager: string;
}

export interface ContainerUnit {
  id: string;
  warehouseId: string;
  no: string;
  size: string;
  occupancyStatus: "occupied" | "available";
  contractId: string | null;
  occupancyDetail: ContainerOccupancyDetail | null;
}

export type TxStatus = "자동 매칭" | "검토 필요" | "연결 완료" | "보류";
export type ReviewKind = "동명이인" | "별칭 미등록" | "분할 입금" | "계약 없음" | "정상";

export interface BankTx {
  id: string;
  batchId: string;
  date: string;
  payerName: string;
  amount: number;
  bank: string;
  status: TxStatus;
  reviewKind: ReviewKind;
  contractId: string | null;
  candidateContractIds: string[];
  reason: string;
  handledBy?: string;
  handledAt?: string;
  groupedWith?: string[];
  pendingContractId?: string;
  manualReason?: string;
  approvalStatus?: "승인 대기" | "승인 완료" | "반려";
  approvalRequestedBy?: string;
  approvalRequestedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface MatchBatch {
  id: string;
  uploadedAt: string;
  fileName: string;
  bank: string;
  totalCount: number;
  totalAmount: number;
  autoCount: number;
  reviewCount: number;
  uploadedBy: string;
}

export interface PayerAlias {
  id: string;
  payerName: string;
  customerId: string;
  learnedFrom: string;
  learnedAt: string;
}

export type MovementKind = "입고" | "출고";

export interface Movement {
  id: string;
  kind: MovementKind;
  contractId: string;
  warehouseId: string;
  containerNo: string;
  stepIndex: number;
  scheduledDate: string;
  team: "A팀" | "B팀" | "C팀";
  driver: string;
  vendorId?: string;
  vendorName?: string;
  desiredTime?: string;
  pickupAddress?: string;
  recipient?: string;
  recipientPhone?: string;
  elevator?: "있음" | "없음" | "확인 필요";
  transportCost?: number;
  ladderTruckCost?: number;
  handledBy?: string;
  handledAt?: string;
  done: boolean;
  photos: {
    name: string;
    at: string;
    visibility?: "고객 열람" | "내부 전용";
    deleteAt?: string;
    uploadedBy?: string;
  }[];
  driverLink?: string;
}

export interface TransportVendor {
  id: string;
  name: string;
  manager: string;
  phone: string;
  businessNo: string;
  serviceAreas: string[];
  note: string;
  completedJobs: number;
  onTimeRate: number;
  serviceHistory: TransportServiceRecord[];
}

export interface TransportServiceRecord {
  id: string;
  movementId: string;
  kind: MovementKind;
  completedAt: string;
  route: string;
  transportCost: number;
  liftCost: number;
  result: "비용 기록" | "정시 완료" | "지연 완료";
}

export interface TransportAssignmentHistory {
  id: string;
  movementId: string;
  vendorId: string;
  vendorName: string;
  reason: string;
  assignedBy: string;
  assignedAt: string;
}

export interface WorkInstruction {
  id: string;
  movementId: string;
  vendorId: string;
  vendorName: string;
  fields: string[];
  recipients: {
    label: "운영팀" | "창고팀" | "운송업체";
    target: string;
    status: "발송 완료";
  }[];
  sentBy: string;
  sentAt: string;
}

export type NotificationChannel = "알림톡" | "문자" | "이메일";
export type NotificationStatus = "발송 완료" | "발송 실패" | "문자 재발송 성공" | "발송 대기";

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  templateId: string;
  templateName: string;
  target: string;
  contractId?: string;
  sentAt: string;
  status: NotificationStatus;
  failReason?: string;
  retriedAt?: string;
  handledBy: string;
}

export type BillingStatus =
  | "미수"
  | "통장 입금 확인"
  | "입금 완료"
  | "카드 승인"
  | "카드 요청"
  | "카드 취소";
export type InvoiceStatus = "발행 대기" | "승인" | "발행 완료" | "발행 실패";

export interface BillingItem {
  id: string;
  contractId: string;
  period: string;
  amount: number;
  billingStatus: BillingStatus;
  invoiceStatus: InvoiceStatus;
  cardResponse?: string;
  invoiceNo?: string;
  failReason?: string;
  retryCount: number;
  recurring: boolean;
  cashReceipt: boolean;
}

export type DocumentTemplate = "개인" | "법인" | "법원";

export interface StoredDocument {
  id: string;
  contractId: string;
  title: string;
  template: DocumentTemplate;
  kind: "계약 안내문" | "세부 내역서" | "계약서" | "청구서";
  createdAt: string;
  sentAt: string | null;
  version: string;
  uploadedBy: string;
}

export interface ChatbotRequest {
  id: string;
  customerName: string;
  contractId: string;
  kind: "연장 신청" | "출고 신청" | "문의";
  receivedAt: string;
  status: "접수" | "담당자 전달" | "처리 완료";
  assignee?: string;
  message: string;
  desiredDate?: string;
  address?: string;
  recipient?: string;
  phone?: string;
  elevator?: "있음" | "없음" | "확인 필요";
  validationStatus?: "확인 필요" | "검증 완료";
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: "최고관리자" | "관리자" | "창고 현장 담당자";
  action: string;
  target: string;
  category: "입금 대조" | "계약" | "발송" | "입출고" | "설정" | "삭제 시도" | "이관";
}

export interface StaffProfile {
  id: string;
  name: string;
  role: AuditEntry["role"];
  profile: string;
  permissions: string[];
  status: "활성" | "회수";
  issuedAt: string;
  issuedBy: string;
  issuanceHistory: string[];
}

export interface MigrationIssue {
  id: string;
  rule: string;
  count: number;
  sample: string;
  resolved: boolean;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  postedAt: string;
  author: string;
}

export interface AppSettings {
  overdueRatePercent: number;
  overdueGraceDays: number;
  judgeTime: string;
  sendTime: string;
  loginFailLimit: number;
  autoLogoutMinutes: number;
  senderNumber: string;
  senderNumberStatus: string;
  completedContractRetentionYears: number;
  outboundPhotoRetentionMonths: number;
  updatedAt: string | null;
}
