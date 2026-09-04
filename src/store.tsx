import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

import * as seed from "./data/seed";
import { OPERATOR, TODAY } from "./data/seed";
import { addMonths, daysBetween, formatWon, nextId, overdueFee } from "./data/utils";
import type {
  AppSettings,
  AuditEntry,
  BankTx,
  BillingItem,
  ChatbotRequest,
  ContainerUnit,
  Contract,
  Customer,
  MatchBatch,
  MigrationIssue,
  Movement,
  Notice,
  NotificationRecord,
  PayerAlias,
  StaffProfile,
  StoredDocument,
  TransportAssignmentHistory,
  TransportVendor,
  WorkInstruction,
} from "./data/types";

const CLOCK_BASE_MINUTES = 9 * 60 + 12;
let customerSequence = seed.TOTAL_CUSTOMERS;

export interface Toast {
  id: string;
  message: string;
}

export interface ChatbotScript {
  greeting: string;
  buttons: string[];
  appliedAt: string | null;
}

interface State {
  clock: number;
  customers: Customer[];
  acquisitionChannels: string[];
  contracts: Contract[];
  containers: ContainerUnit[];
  batches: MatchBatch[];
  txs: BankTx[];
  aliases: PayerAlias[];
  movements: Movement[];
  transportVendors: TransportVendor[];
  staffProfiles: StaffProfile[];
  assignmentHistory: TransportAssignmentHistory[];
  workInstructions: WorkInstruction[];
  notifications: NotificationRecord[];
  billingItems: BillingItem[];
  documents: StoredDocument[];
  chatbotRequests: ChatbotRequest[];
  chatbotScript: ChatbotScript;
  auditEntries: AuditEntry[];
  migrationIssues: MigrationIssue[];
  migrationRunAt: string | null;
  notices: Notice[];
  settings: AppSettings;
  role: "최고관리자" | "관리자";
  escalatedAlerts: string[];
  reportExports: { id: string; batchId: string; at: string; by: string }[];
  toasts: Toast[];
}

function initialState(): State {
  return {
    clock: 0,
    customers: seed.customers,
    acquisitionChannels: seed.acquisitionChannels,
    contracts: seed.contracts,
    containers: seed.containers,
    batches: [seed.previousBatch],
    txs: seed.previousTxs,
    aliases: seed.payerAliases,
    movements: seed.movements,
    transportVendors: seed.transportVendors,
    staffProfiles: seed.staffProfiles,
    assignmentHistory: seed.assignmentHistory,
    workInstructions: seed.workInstructions,
    notifications: seed.notifications,
    billingItems: seed.billingItems,
    documents: seed.documents,
    chatbotRequests: seed.chatbotRequests,
    chatbotScript: {
      greeting: "안녕하세요. 보관 계약 연장·출고 신청을 도와드립니다.",
      buttons: ["계약 연장 신청", "출고 신청", "담당자 연결"],
      appliedAt: null,
    },
    auditEntries: seed.auditEntries,
    migrationIssues: seed.migrationIssues,
    migrationRunAt: seed.migrationSummary.lastRunAt,
    notices: seed.notices,
    settings: seed.settings,
    role: "최고관리자",
    escalatedAlerts: [],
    reportExports: [],
    toasts: [],
  };
}

function stampOf(clock: number): string {
  const total = CLOCK_BASE_MINUTES + clock;
  const hours = String(Math.floor(total / 60)).padStart(2, "0");
  const minutes = String(total % 60).padStart(2, "0");
  return `${TODAY} ${hours}:${minutes}`;
}

export interface StoreValue {
  state: State;
  stamp: string;
  actions: ReturnType<typeof buildActions>;
  derived: ReturnType<typeof buildDerived>;
}

function buildDerived(state: State) {
  const contractById = new Map(state.contracts.map((contract) => [contract.id, contract]));
  const customerById = new Map(state.customers.map((customer) => [customer.id, customer]));
  const warehouseById = new Map(seed.warehouses.map((warehouse) => [warehouse.id, warehouse]));
  const transportVendorById = new Map(state.transportVendors.map((vendor) => [vendor.id, vendor]));

  const overdueContracts = state.contracts.filter((contract) => contract.status === "연체");
  const expiringContracts = state.contracts
    .filter((contract) => contract.status === "정상")
    .filter((contract) => {
      const remaining = daysBetween(TODAY, contract.endDate);
      return remaining >= 0 && remaining <= 7;
    })
    .sort((left, right) => left.endDate.localeCompare(right.endDate));

  const receivable = overdueContracts.reduce(
    (sum, contract) =>
      sum +
      contract.unpaidPrincipal +
      overdueFee(
        contract.unpaidPrincipal,
        contract.overdueDays,
        state.settings.overdueRatePercent,
        state.settings.overdueGraceDays,
      ),
    0,
  );

  const pendingTxs = state.txs.filter(
    (tx) => tx.status === "검토 필요" || tx.status === "보류",
  );
  const latestBatch = state.batches[0];
  const occupancyOf = (warehouseId: string) =>
    (seed.hiddenOccupied[warehouseId] ?? 0) +
    state.containers.filter(
      (unit) => unit.warehouseId === warehouseId && unit.occupancyStatus === "occupied",
    ).length;
  const occupiedTotal = seed.warehouses.reduce((sum, w) => sum + occupancyOf(w.id), 0);
  const containerTotal = seed.warehouses.reduce((sum, w) => sum + w.totalContainers, 0);

  const failedNotifications = state.notifications.filter((item) => item.status === "발송 실패");
  const failedInvoices = state.billingItems.filter((item) => item.invoiceStatus === "발행 실패");
  const newChatbotRequests = state.chatbotRequests.filter((item) => item.status === "접수");

  return {
    contractById,
    customerById,
    warehouseById,
    transportVendorById,
    overdueContracts,
    expiringContracts,
    receivable,
    pendingTxs,
    latestBatch,
    occupiedTotal,
    containerTotal,
    failedNotifications,
    failedInvoices,
    newChatbotRequests,
    occupancyOf,
    customerOf(contract: Contract) {
      return customerById.get(contract.customerId);
    },
    contractLabel(contractId: string | null | undefined) {
      if (!contractId) return "미연결";
      const contract = contractById.get(contractId);
      if (!contract) return contractId;
      const customer = customerById.get(contract.customerId);
      return `${customer?.name ?? "고객"} · ${contract.containerNo}`;
    },
  };
}

function buildActions(setState: React.Dispatch<React.SetStateAction<State>>) {
  const advance = (state: State, minutes = 3) => ({ ...state, clock: state.clock + minutes });

  const withToast = (state: State, message: string): State => ({
    ...state,
    toasts: [...state.toasts, { id: nextId("TOAST"), message }].slice(-3),
  });

  const withAudit = (
    state: State,
    entry: Omit<AuditEntry, "id" | "at" | "actor" | "role">,
  ): State => ({
    ...state,
    auditEntries: [
      {
        id: nextId("LG"),
        at: stampOf(state.clock),
        actor: OPERATOR.name,
        role: "관리자",
        ...entry,
      },
      ...state.auditEntries,
    ],
  });

  const update = (mutator: (state: State) => State) => setState((state) => mutator(state));

  const synchronizeMovementCompletion = (
    state: State,
    movement: Movement,
    done: boolean,
  ): State => {
    const contract = state.contracts.find((item) => item.id === movement.contractId);
    const vendor = movement.vendorId
      ? state.transportVendors.find((item) => item.id === movement.vendorId)
      : undefined;
    const warehouse = seed.warehouses.find((item) => item.id === movement.warehouseId);
    const route = movement.pickupAddress ?? `${warehouse?.name ?? movement.warehouseId} · ${movement.containerNo}`;
    const performanceId = `VH-${movement.id}`;

    return {
      ...state,
      contracts: state.contracts.map((item) =>
        item.id !== movement.contractId || movement.kind !== "출고"
          ? item
          : done
            ? { ...item, status: "만료", closeReason: "정상 종료" }
            : { ...item, status: "정상", closeReason: undefined },
      ),
      containers: state.containers.map((unit) => {
        if (movement.kind !== "출고") return unit;
        if (done && unit.contractId === movement.contractId) {
          return { ...unit, occupancyStatus: "available", contractId: null, occupancyDetail: null };
        }
        if (!done && unit.warehouseId === movement.warehouseId && unit.no === movement.containerNo) {
          return { ...unit, occupancyStatus: "occupied", contractId: movement.contractId };
        }
        return unit;
      }),
      customers: state.customers.map((customer) =>
        customer.id === contract?.customerId
          ? {
              ...customer,
              storageStatus: done
                ? movement.kind === "출고"
                  ? "보관종료"
                  : "보관중"
                : "보관중",
            }
          : customer,
      ),
      transportVendors: state.transportVendors.map((item) => {
        if (!vendor || item.id !== vendor.id) return item;
        const existing = item.serviceHistory.find((record) => record.movementId === movement.id);
        if (!done) {
          const hasRecordedCost = Boolean(movement.transportCost || movement.ladderTruckCost);
          const retainedRecord = existing && hasRecordedCost
            ? {
                ...existing,
                completedAt: stampOf(state.clock),
                transportCost: movement.transportCost ?? existing.transportCost,
                liftCost: movement.ladderTruckCost ?? existing.liftCost,
                result: "비용 기록" as const,
              }
            : undefined;
          return {
            ...item,
            completedJobs:
              existing && existing.result !== "비용 기록"
                ? Math.max(0, item.completedJobs - 1)
                : item.completedJobs,
            serviceHistory: retainedRecord
              ? [
                  retainedRecord,
                  ...item.serviceHistory.filter((record) => record.movementId !== movement.id),
                ]
              : item.serviceHistory.filter((record) => record.movementId !== movement.id),
          };
        }
        const record = {
          id: existing?.id ?? performanceId,
          movementId: movement.id,
          kind: movement.kind,
          completedAt: movement.handledAt ?? stampOf(state.clock),
          route,
          transportCost: movement.transportCost ?? existing?.transportCost ?? 0,
          liftCost: movement.ladderTruckCost ?? existing?.liftCost ?? 0,
          result: "정시 완료" as const,
        };
        return {
          ...item,
          completedJobs: existing && existing.result !== "비용 기록" ? item.completedJobs : item.completedJobs + 1,
          serviceHistory: [record, ...item.serviceHistory.filter((entry) => entry.movementId !== movement.id)],
        };
      }),
    };
  };

  return {
    dismissToast(id: string) {
      setState((state) => ({ ...state, toasts: state.toasts.filter((t) => t.id !== id) }));
    },

    escalateAlert(alertId: string, target: string) {
      update((prev) => {
        if (prev.escalatedAlerts.includes(alertId)) return prev;
        let next = advance(prev);
        next = {
          ...next,
          escalatedAlerts: [...next.escalatedAlerts, alertId],
          notifications: [
            {
              id: nextId("NT"),
              channel: "문자",
              templateId: "TP-ESCALATE",
              templateName: "담당자 에스컬레이션",
              target,
              sentAt: stampOf(next.clock),
              status: "발송 완료",
              handledBy: OPERATOR.name,
            },
            ...next.notifications,
          ],
        };
        next = withAudit(next, {
          action: "미확인 알림 담당자 문자 에스컬레이션",
          target,
          category: "발송",
        });
        return withToast(next, "담당자에게 문자로 에스컬레이션했습니다.");
      });
    },

    registerCustomer(input: {
      name: string;
      kind: Customer["kind"];
      contact: string;
      subContact?: string;
      representative?: string;
      payerNames: string[];
      smsOptOut: boolean;
      acquisitionSource?: Customer["acquisitionSource"];
    }) {
      customerSequence += 1;
      const customerId = `CU-${String(customerSequence).padStart(4, "0")}`;

      update((prev) => {
        let next = advance(prev, 2);
        const customer: Customer = {
          id: customerId,
          name: input.name,
          kind: input.kind,
          contact: input.contact,
          subContact: input.subContact,
          representative: input.representative,
          payerNames: input.payerNames,
          smsOptOut: input.smsOptOut,
          manager: OPERATOR.name,
          registeredAt: TODAY,
          acquisitionSource: input.acquisitionSource ?? "전화",
          storageStatus: "상담중",
          attachments: [],
          consultations: [],
        };

        next = {
          ...next,
          customers: [customer, ...next.customers],
        };
        next = withAudit(next, {
          action: `신규 고객 등록 · ${input.kind}`,
          target: `${input.name} (${customerId})`,
          category: "계약",
        });
        return withToast(next, `${input.name} 고객을 등록했습니다.`);
      });

      return customerId;
    },

    addAcquisitionChannel(name: string) {
      const channel = name.trim();
      if (!channel) return;
      update((prev) => {
        if (prev.acquisitionChannels.includes(channel)) {
          return withToast(prev, `이미 등록된 유입 경로입니다: ${channel}`);
        }
        let next = advance(prev, 1);
        next = {
          ...next,
          acquisitionChannels: [...next.acquisitionChannels, channel],
        };
        next = withAudit(next, {
          action: `고객 유입 경로 추가 · ${channel}`,
          target: "고객 기준정보",
          category: "설정",
        });
        return withToast(next, `${channel} 유입 경로를 추가했습니다.`);
      });
    },

    addConsultation(customerId: string, channel: Customer["consultations"][number]["channel"], note: string) {
      update((prev) => {
        let next = advance(prev, 2);
        next = {
          ...next,
          customers: next.customers.map((customer) =>
            customer.id === customerId
              ? {
                  ...customer,
                  consultations: [
                    {
                      id: nextId("CS"),
                      at: stampOf(next.clock),
                      author: OPERATOR.name,
                      channel,
                      note,
                    },
                    ...customer.consultations,
                  ],
                }
              : customer,
          ),
        };
        const name = next.customers.find((c) => c.id === customerId)?.name ?? customerId;
        next = withAudit(next, { action: "상담일지 기록", target: `${name} (${customerId})`, category: "계약" });
        return withToast(next, "상담일지를 기록했습니다.");
      });
    },

    addPayerName(customerId: string, payerName: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          customers: next.customers.map((customer) =>
            customer.id === customerId && !customer.payerNames.includes(payerName)
              ? { ...customer, payerNames: [...customer.payerNames, payerName] }
              : customer,
          ),
        };
        next = withAudit(next, {
          action: `등록 입금자명 추가: ${payerName}`,
          target: customerId,
          category: "입금 대조",
        });
        return withToast(next, `등록 입금자명에 '${payerName}'을 추가했습니다.`);
      });
    },

    toggleOptOut(customerId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        let optedOut = false;
        next = {
          ...next,
          customers: next.customers.map((customer) => {
            if (customer.id !== customerId) return customer;
            optedOut = !customer.smsOptOut;
            return { ...customer, smsOptOut: optedOut };
          }),
        };
        next = withAudit(next, {
          action: optedOut ? "광고성 수신 제외 설정" : "광고성 수신 제외 해제",
          target: customerId,
          category: "발송",
        });
        return withToast(next, optedOut ? "수신 제외로 변경했습니다." : "수신 제외를 해제했습니다.");
      });
    },

    uploadCustomerAttachment(customerId: string, fileName: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          customers: next.customers.map((customer) =>
            customer.id === customerId
              ? {
                  ...customer,
                  attachments: [
                    { name: fileName, uploadedAt: `${stampOf(next.clock)} · ${OPERATOR.name}` },
                    ...customer.attachments.filter((file) => file.name !== fileName),
                  ],
                }
              : customer,
          ),
        };
        next = withAudit(next, {
          action: `고객 첨부파일 등록 · ${fileName}`,
          target: customerId,
          category: "계약",
        });
        return withToast(next, `${fileName}을 고객 원장에 등록했습니다.`);
      });
    },

    extendContract(contractId: string, months: number) {
      update((prev) => {
        let next = advance(prev, 2);
        let newEnd = "";
        next = {
          ...next,
          contracts: next.contracts.map((contract) => {
            if (contract.id !== contractId) return contract;
            newEnd = addMonths(contract.endDate, months);
            return {
              ...contract,
              endDate: newEnd,
              status: contract.status === "만료" ? "정상" : contract.status,
            };
          }),
        };
        next = withAudit(next, {
          action: `계약 기간 ${months}개월 변경 · 만료일 ${newEnd}`,
          target: contractId,
          category: "계약",
        });
        return withToast(next, `만료일을 ${newEnd}로 재계산했습니다.`);
      });
    },

    createContract(input: Omit<Contract, "id" | "status" | "overdueDays" | "unpaidPrincipal" | "payments">) {
      const id = nextId("SC-NEW");
      update((prev) => {
        const container = prev.containers.find(
          (unit) => unit.warehouseId === input.warehouseId && unit.no === input.containerNo,
        );
        if (!container || container.occupancyStatus !== "available") {
          return withToast(prev, "선택한 컨테이너는 이미 사용 중입니다.");
        }
        let next = advance(prev, 2);
        const contract: Contract = {
          ...input,
          id,
          status: "정상",
          overdueDays: 0,
          unpaidPrincipal: 0,
          payments: [],
        };
        next = {
          ...next,
          contracts: [contract, ...next.contracts],
          containers: next.containers.map((unit) =>
            unit.id === container.id
              ? { ...unit, occupancyStatus: "occupied", contractId: id, occupancyDetail: null }
              : unit,
          ),
          customers: next.customers.map((customer) =>
            customer.id === input.customerId ? { ...customer, storageStatus: "보관중" } : customer,
          ),
        };
        next = withAudit(next, { action: "신규 계약 등록", target: id, category: "계약" });
        return withToast(next, `${id} 계약을 등록하고 ${input.containerNo}를 배정했습니다.`);
      });
      return id;
    },

    updateContract(
      contractId: string,
      input: Pick<Contract, "customerId" | "warehouseId" | "containerNo" | "startDate" | "endDate" | "monthlyFee" | "discount" | "deposit" | "payMethod">,
    ) {
      update((prev) => {
        const current = prev.contracts.find((contract) => contract.id === contractId);
        if (!current) return prev;
        const nextContainer = prev.containers.find(
          (unit) => unit.warehouseId === input.warehouseId && unit.no === input.containerNo,
        );
        if (!nextContainer || (nextContainer.contractId && nextContainer.contractId !== contractId)) {
          return withToast(prev, "선택한 컨테이너는 다른 계약에서 사용 중입니다.");
        }
        let next = advance(prev, 2);
        next = {
          ...next,
          contracts: next.contracts.map((contract) =>
            contract.id === contractId ? { ...contract, ...input } : contract,
          ),
          containers: next.containers.map((unit) => {
            if (unit.contractId === contractId && unit.id !== nextContainer.id) {
              return { ...unit, occupancyStatus: "available", contractId: null, occupancyDetail: null };
            }
            return unit.id === nextContainer.id
              ? { ...unit, occupancyStatus: "occupied", contractId, occupancyDetail: null }
              : unit;
          }),
        };
        next = withAudit(next, { action: "계약 전체 정보 수정", target: contractId, category: "계약" });
        return withToast(next, `${contractId} 계약 정보를 저장했습니다.`);
      });
    },

    deleteContract(contractId: string) {
      update((prev) => {
        if (prev.role !== "최고관리자") {
          const denied = withAudit(advance(prev, 1), {
            action: "계약 삭제 시도 · 최고관리자 권한 필요",
            target: contractId,
            category: "삭제 시도",
          });
          return withToast(denied, "계약 삭제는 최고관리자만 할 수 있습니다.");
        }
        const referenced =
          prev.movements.some((item) => item.contractId === contractId) ||
          prev.billingItems.some((item) => item.contractId === contractId) ||
          prev.documents.some((item) => item.contractId === contractId);
        if (referenced) return withToast(prev, "입출고·결제·문서 이력이 있는 계약은 삭제할 수 없습니다.");
        let next = advance(prev, 1);
        next = {
          ...next,
          contracts: next.contracts.filter((contract) => contract.id !== contractId),
          containers: next.containers.map((unit) =>
            unit.contractId === contractId
              ? { ...unit, occupancyStatus: "available", contractId: null, occupancyDetail: null }
              : unit,
          ),
        };
        next = withAudit(next, { action: "계약 삭제", target: contractId, category: "계약" });
        return withToast(next, `${contractId} 계약을 삭제하고 컨테이너를 반환했습니다.`);
      });
    },

    assignContainer(warehouseId: string, containerNo: string, contractId: string) {
      update((prev) => {
        let next = advance(prev, 2);
        next = {
          ...next,
          containers: next.containers.map((unit) => {
            if (unit.warehouseId === warehouseId && unit.no === containerNo) {
              return {
                ...unit,
                occupancyStatus: "occupied" as const,
                contractId,
                occupancyDetail: null,
              };
            }
            // 같은 계약이 이전에 쓰던 칸은 비운다. 그래야 가동 수가 두 번 세지지 않는다.
            return unit.contractId === contractId
              ? {
                  ...unit,
                  occupancyStatus: "available" as const,
                  contractId: null,
                  occupancyDetail: null,
                }
              : unit;
          }),
          contracts: next.contracts.map((contract) =>
            contract.id === contractId
              ? { ...contract, warehouseId, containerNo }
              : contract,
          ),
        };
        next = withAudit(next, {
          action: `컨테이너 ${containerNo} 배정`,
          target: contractId,
          category: "계약",
        });
        return withToast(next, `${containerNo}를 ${contractId} 계약에 배정했습니다.`);
      });
    },

    advanceMovement(movementId: string) {
      update((prev) => {
        let next = advance(prev, 2);
        let label = "";
        let completedMovement: Movement | null = null;
        next = {
          ...next,
          movements: next.movements.map((movement) => {
            if (movement.id !== movementId) return movement;
            const steps = movement.kind === "입고" ? seed.INBOUND_STEPS : seed.OUTBOUND_STEPS;
            const stepIndex = Math.min(movement.stepIndex + 1, steps.length - 1);
            label = steps[stepIndex];
            const updated = {
              ...movement,
              stepIndex,
              done: stepIndex === steps.length - 1,
              handledBy: OPERATOR.name,
              handledAt: stampOf(next.clock),
            };
            if (updated.done) completedMovement = updated;
            return updated;
          }),
        };

        if (completedMovement) {
          next = synchronizeMovementCompletion(next, completedMovement as Movement, true);
        }
        next = withAudit(next, {
          action: completedMovement && (completedMovement as Movement).kind === "출고"
            ? `출고완료 · 고객·계약·컨테이너 원장 연동`
            : `입출고 단계 진행 · ${label}`,
          target: movementId,
          category: "입출고",
        });
        return withToast(
          next,
          completedMovement && (completedMovement as Movement).kind === "출고"
            ? `${movementId} 출고를 완료하고 고객·계약·컨테이너 상태를 함께 갱신했습니다.`
            : `${movementId} 단계를 '${label}'로 진행했습니다.`,
        );
      });
    },

    attachMovementPhoto(movementId: string, fileName: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          movements: next.movements.map((movement) =>
            movement.id === movementId
              ? {
                  ...movement,
                  photos: [
                    ...movement.photos,
                    {
                      name: fileName,
                      at: stampOf(next.clock),
                      visibility: movement.kind === "입고" ? "고객 열람" : "내부 전용",
                      deleteAt: movement.kind === "출고" ? "출고 완료 후 1개월" : undefined,
                      uploadedBy: OPERATOR.name,
                    },
                  ],
                }
              : movement,
          ),
        };
        next = withAudit(next, {
          action: `현장 사진 첨부 · 공개 범위 분류`,
          target: movementId,
          category: "입출고",
        });
        return withToast(next, "현장 사진을 첨부하고 공개 범위를 적용했습니다.");
      });
    },

    createTransportVendor(input: Pick<TransportVendor, "name" | "manager" | "phone" | "businessNo" | "serviceAreas" | "note">) {
      const id = nextId("TV-NEW");
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          transportVendors: [
            {
              id,
              ...input,
              completedJobs: 0,
              onTimeRate: 0,
              serviceHistory: [],
            },
            ...next.transportVendors,
          ],
        };
        next = withAudit(next, {
          action: `운송업체 기준정보 등록 · ${input.name}`,
          target: id,
          category: "설정",
        });
        return withToast(next, `${input.name} 운송업체를 등록했습니다.`);
      });
      return id;
    },

    updateTransportVendor(vendorId: string, input: Pick<TransportVendor, "name" | "manager" | "phone" | "businessNo" | "serviceAreas" | "note">) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          transportVendors: next.transportVendors.map((vendor) =>
            vendor.id === vendorId ? { ...vendor, ...input } : vendor,
          ),
          movements: next.movements.map((movement) =>
            movement.vendorId === vendorId ? { ...movement, vendorName: input.name } : movement,
          ),
        };
        next = withAudit(next, {
          action: `운송업체 기준정보 수정 · ${input.name}`,
          target: vendorId,
          category: "설정",
        });
        return withToast(next, `${input.name} 운송업체 정보를 수정했습니다.`);
      });
    },

    deleteTransportVendor(vendorId: string) {
      update((prev) => {
        if (prev.role !== "최고관리자") {
          const denied = withAudit(advance(prev, 1), {
            action: "운송업체 삭제 시도 · 최고관리자 권한 필요",
            target: vendorId,
            category: "삭제 시도",
          });
          return withToast(denied, "운송업체 삭제는 최고관리자만 할 수 있습니다.");
        }
        if (prev.movements.some((movement) => movement.vendorId === vendorId)) {
          return withToast(prev, "입출고 배정 이력이 있는 운송업체는 삭제할 수 없습니다.");
        }
        const vendor = prev.transportVendors.find((item) => item.id === vendorId);
        let next = advance(prev, 1);
        next = {
          ...next,
          transportVendors: next.transportVendors.filter((item) => item.id !== vendorId),
        };
        next = withAudit(next, {
          action: `운송업체 삭제 · ${vendor?.name ?? vendorId}`,
          target: vendorId,
          category: "설정",
        });
        return withToast(next, `${vendor?.name ?? vendorId} 운송업체를 삭제했습니다.`);
      });
    },

    selectInboundTransportVendor(movementId: string) {
      update((prev) => {
        const movement = prev.movements.find((item) => item.id === movementId);
        if (!movement) return prev;
        const inbound = prev.movements.find(
          (item) =>
            item.kind === "입고" &&
            item.contractId === movement.contractId &&
            Boolean(item.vendorId),
        );
        if (!inbound?.vendorId) return withToast(prev, "연결된 입고 운송업체가 없습니다.");
        const vendor = prev.transportVendors.find((item) => item.id === inbound.vendorId);
        return withToast(
          {
            ...advance(prev, 1),
            movements: prev.movements.map((item) =>
              item.id === movementId
                ? { ...item, vendorId: inbound.vendorId, vendorName: vendor?.name ?? inbound.vendorName }
                : item,
            ),
          },
          `${vendor?.name ?? inbound.vendorName}을 입고 당시 운송업체로 불러왔습니다.`,
        );
      });
    },

    assignTransportVendor(movementId: string, vendorId: string, reason: string) {
      update((prev) => {
        let next = advance(prev, 2);
        const vendor = next.transportVendors.find((item) => item.id === vendorId);
        if (!vendor) return prev;
        const movement = next.movements.find((item) => item.id === movementId);
        const isReassignment = Boolean(movement?.vendorId && movement.vendorId !== vendorId);
        next = {
          ...next,
          movements: next.movements.map((item) =>
            item.id === movementId
              ? { ...item, vendorId, vendorName: vendor.name, driver: vendor.manager }
              : item,
          ),
          assignmentHistory: [
            {
              id: nextId("AS"),
              movementId,
              vendorId,
              vendorName: vendor.name,
              reason: reason.trim() || (isReassignment ? "운영 사정으로 재배정" : "가용 일정 확인 후 배정"),
              assignedBy: OPERATOR.name,
              assignedAt: stampOf(next.clock),
            },
            ...next.assignmentHistory,
          ],
        };
        next = withAudit(next, {
          action: `${isReassignment ? "운송업체 재배정" : "운송업체 배정"} · ${vendor.name}`,
          target: movementId,
          category: "입출고",
        });
        return withToast(next, `${movementId}에 ${vendor.name}을 ${isReassignment ? "재배정" : "배정"}했습니다.`);
      });
    },

    saveTransportCosts(movementId: string, transportCost: number, ladderTruckCost: number) {
      update((prev) => {
        let next = advance(prev, 1);
        const movement = next.movements.find((item) => item.id === movementId);
        const warehouse = seed.warehouses.find((item) => item.id === movement?.warehouseId);
        next = {
          ...next,
          movements: next.movements.map((item) =>
            item.id === movementId ? { ...item, transportCost, ladderTruckCost } : item,
          ),
          transportVendors: next.transportVendors.map((vendor) => {
            if (!movement?.vendorId || vendor.id !== movement.vendorId) return vendor;
            const existing = vendor.serviceHistory.find((record) => record.movementId === movementId);
            const record = {
              id: existing?.id ?? `VH-${movementId}`,
              movementId,
              kind: movement.kind,
              completedAt: movement.done ? movement.handledAt ?? stampOf(next.clock) : stampOf(next.clock),
              route: movement.pickupAddress ?? `${warehouse?.name ?? movement.warehouseId} · ${movement.containerNo}`,
              transportCost,
              liftCost: ladderTruckCost,
              result: movement.done ? ("정시 완료" as const) : ("비용 기록" as const),
            };
            return {
              ...vendor,
              serviceHistory: [record, ...vendor.serviceHistory.filter((item) => item.movementId !== movementId)],
            };
          }),
        };
        next = withAudit(next, {
          action: `운송비 ${transportCost.toLocaleString("ko-KR")}원 · 리프트 ${ladderTruckCost.toLocaleString("ko-KR")}원 기록`,
          target: movementId,
          category: "입출고",
        });
        return withToast(next, "운송 비용을 입출고 원장과 업체 수행 이력에 함께 저장했습니다.");
      });
    },

    sendWorkInstruction(
      movementId: string,
      fields: string[],
      selectedRecipients: WorkInstruction["recipients"][number]["label"][],
    ) {
      update((prev) => {
        let next = advance(prev, 2);
        const movement = next.movements.find((item) => item.id === movementId);
        if (!movement?.vendorId || !movement.vendorName) {
          return withToast(prev, "먼저 운송업체를 배정해 주십시오.");
        }
        if (selectedRecipients.length === 0) {
          return withToast(prev, "작업지시를 받을 담당자를 한 명 이상 선택해 주십시오.");
        }
        const warehouse = seed.warehouses.find((item) => item.id === movement.warehouseId);
        const vendor = next.transportVendors.find((item) => item.id === movement.vendorId);
        const recipientTargets: Record<WorkInstruction["recipients"][number]["label"], string> = {
          운영팀: `${OPERATOR.name} · 운영 담당`,
          창고팀: `${warehouse?.managerName ?? movement.driver} · ${movement.team}`,
          운송업체: `${vendor?.manager ?? movement.driver} · ${vendor?.phone ?? "연락처 확인 필요"}`,
        };
        const instruction: WorkInstruction = {
          id: nextId("WO"),
          movementId,
          vendorId: movement.vendorId,
          vendorName: movement.vendorName,
          fields,
          recipients: selectedRecipients.map((label) => ({
            label,
            target: recipientTargets[label],
            status: "발송 완료" as const,
          })),
          sentBy: OPERATOR.name,
          sentAt: stampOf(next.clock),
        };
        const contract = next.contracts.find((item) => item.id === movement.contractId);
        const customer = next.customers.find((item) => item.id === contract?.customerId);
        window.localStorage.setItem(
          `storedesk:work-instruction:${instruction.id}`,
          JSON.stringify({ instruction, movement, contract, customer, warehouse, vendor }),
        );
        next = { ...next, workInstructions: [instruction, ...next.workInstructions] };
        next = withAudit(next, {
          action: `작업지시 담당자 발송 ${selectedRecipients.length}명 · ${movement.vendorName}`,
          target: `${instruction.id} · ${movementId}`,
          category: "발송",
        });
        return withToast(next, `${selectedRecipients.length}명의 실제 담당자에게 작업지시를 발송했습니다.`);
      });
    },

    addSchedule(payload: {
      kind: Movement["kind"];
      contractId: string;
      scheduledDate: string;
      team: Movement["team"];
      driver: string;
    }) {
      update((prev) => {
        let next = advance(prev, 2);
        const contract = next.contracts.find((item) => item.id === payload.contractId);
        const id = nextId("MV-2609");
        next = {
          ...next,
          movements: [
            {
              id,
              kind: payload.kind,
              contractId: payload.contractId,
              warehouseId: contract?.warehouseId ?? "WH-1",
              containerNo: contract?.containerNo ?? "미배정",
              stepIndex: 0,
              scheduledDate: payload.scheduledDate,
              team: payload.team,
              driver: payload.driver,
              done: false,
              photos: [],
            },
            ...next.movements,
          ],
        };
        next = withAudit(next, {
          action: `입출고 일정 등록 · ${payload.scheduledDate} ${payload.kind}`,
          target: `${id} · ${payload.contractId}`,
          category: "입출고",
        });
        return withToast(next, `${payload.scheduledDate} ${payload.kind} 일정을 등록했습니다.`);
      });
    },

    toggleMovementDone(movementId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        let done = false;
        next = {
          ...next,
          movements: next.movements.map((movement) => {
            if (movement.id !== movementId) return movement;
            done = !movement.done;
            const steps = movement.kind === "입고" ? seed.INBOUND_STEPS : seed.OUTBOUND_STEPS;
            return {
              ...movement,
              done,
              stepIndex: done ? steps.length - 1 : Math.max(0, steps.length - 2),
              handledBy: done ? OPERATOR.name : undefined,
              handledAt: done ? stampOf(next.clock) : undefined,
            };
          }),
        };
        const changed = next.movements.find((movement) => movement.id === movementId);
        if (changed) next = synchronizeMovementCompletion(next, changed, done);
        next = withAudit(next, {
          action: done ? "입출고 처리 완료 표시" : "입출고 처리 완료 표시 해제",
          target: movementId,
          category: "입출고",
        });
        return withToast(
          next,
          done
            ? "처리 완료와 고객·계약·컨테이너·운송 수행 이력을 함께 갱신했습니다."
            : "처리 완료 표시와 연결 원장 상태를 함께 되돌렸습니다.",
        );
      });
    },

    uploadBatch() {
      update((prev) => {
        if (prev.batches.some((batch) => batch.id === seed.currentBatch.id)) return prev;
        let next = advance(prev, 0);
        const learned = new Set(prev.aliases.map((alias) => alias.payerName));
        const txs = seed.incomingTxs.map((tx) => {
          if (tx.reviewKind === "별칭 미등록" && learned.has(tx.payerName)) {
            return {
              ...tx,
              status: "자동 매칭" as const,
              reviewKind: "정상" as const,
              contractId: tx.candidateContractIds[0] ?? null,
              reason: "이전에 저장한 등록 입금자명과 일치해 자동 매칭했습니다.",
              handledBy: "자동 대조",
              handledAt: stampOf(next.clock),
            };
          }
          return tx;
        });
        const autoCount = txs.filter((tx) => tx.status === "자동 매칭").length;
        const batch: MatchBatch = {
          ...seed.currentBatch,
          uploadedAt: stampOf(next.clock),
          autoCount,
          reviewCount: txs.length - autoCount,
        };
        next = {
          ...next,
          batches: [batch, ...next.batches],
          txs: [...txs, ...next.txs],
          contracts: next.contracts.map((contract) => {
            const matched = txs.find(
              (tx) => tx.status === "자동 매칭" && tx.contractId === contract.id,
            );
            if (!matched) return contract;
            return {
              ...contract,
              payments: [
                {
                  id: nextId("PM"),
                  date: matched.date,
                  amount: matched.amount,
                  payerName: matched.payerName,
                  method: "계좌이체" as const,
                  source: "자동 매칭" as const,
                },
                ...contract.payments,
              ],
            };
          }),
        };
        next = withAudit(next, {
          action: `은행 거래내역 업로드 ${batch.totalCount}건 · 자동 매칭 ${autoCount}건`,
          target: `${batch.id} · ${batch.fileName}`,
          category: "입금 대조",
        });
        return withToast(
          next,
          `${batch.totalCount}건을 적재하고 ${autoCount}건을 자동 매칭했습니다.`,
        );
      });
    },

    exportMatchReport(batchId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          reportExports: [
            { id: nextId("EX"), batchId, at: stampOf(next.clock), by: OPERATOR.name },
            ...next.reportExports,
          ],
        };
        next = withAudit(next, {
          action: "월 입금 대조 결과서 내보내기",
          target: batchId,
          category: "입금 대조",
        });
        return next;
      });
    },

    requestManualMatchApproval(txId: string, contractId: string, manualReason: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const reason = manualReason.trim();
        if (!reason) return withToast(prev, "수동 매칭 사유를 입력해 주십시오.");
        next = {
          ...next,
          txs: next.txs.map((item) =>
            item.id === txId
              ? {
                  ...item,
                  pendingContractId: contractId,
                  manualReason: reason,
                  approvalStatus: "승인 대기",
                  approvalRequestedBy: OPERATOR.name,
                  approvalRequestedAt: stampOf(next.clock),
                }
              : item,
          ),
        };
        next = withAudit(next, {
          action: `미매칭 입금 수동 연결 승인 요청 · ${reason}`,
          target: `${txId} → ${contractId}`,
          category: "입금 대조",
        });
        return withToast(next, `${txId} 수동 연결 승인을 요청했습니다.`);
      });
    },

    approveManualMatch(txId: string) {
      update((prev) => {
        let next = advance(prev, 2);
        const tx = next.txs.find((item) => item.id === txId);
        const contractId = tx?.pendingContractId;
        if (!tx || !contractId || tx.approvalStatus !== "승인 대기") return prev;
        let newEnd = "";
        next = {
          ...next,
          txs: next.txs.map((item) =>
            item.id === txId
              ? {
                  ...item,
                  status: "연결 완료",
                  contractId,
                  approvalStatus: "승인 완료",
                  approvedBy: OPERATOR.name,
                  approvedAt: stampOf(next.clock),
                  handledBy: OPERATOR.name,
                  handledAt: stampOf(next.clock),
                }
              : item,
          ),
          contracts: next.contracts.map((contract) => {
            if (contract.id !== contractId) return contract;
            const months = Math.max(1, Math.floor(tx.amount / Math.max(1, contract.monthlyFee)));
            newEnd = addMonths(contract.endDate, months);
            return {
              ...contract,
              endDate: newEnd,
              status: contract.status === "만료" ? "정상" : contract.status,
              payments: [
                {
                  id: nextId("PM"),
                  date: tx.date,
                  amount: tx.amount,
                  payerName: tx.payerName,
                  method: "계좌이체" as const,
                  source: "수동 연결" as const,
                  note: `${txId} 수동 연결 · 승인 사유: ${tx.manualReason ?? "사유 확인"}`,
                },
                ...contract.payments,
              ],
            };
          }),
        };
        next = withAudit(next, {
          action: `미매칭 입금 수동 연결 승인 · 만료일 ${newEnd}`,
          target: `${txId} → ${contractId}`,
          category: "입금 대조",
        });
        return withToast(next, `${txId} 수동 연결을 승인하고 만료일을 ${newEnd}로 연장했습니다.`);
      });
    },

    saveAlias(txId: string, customerId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const tx = next.txs.find((item) => item.id === txId);
        if (!tx) return prev;
        if (next.aliases.some((alias) => alias.payerName === tx.payerName)) return prev;
        next = {
          ...next,
          aliases: [
            {
              id: nextId("AL"),
              payerName: tx.payerName,
              customerId,
              learnedFrom: `${txId} 수동 연결`,
              learnedAt: stampOf(next.clock),
            },
            ...next.aliases,
          ],
          customers: next.customers.map((customer) =>
            customer.id === customerId && !customer.payerNames.includes(tx.payerName)
              ? { ...customer, payerNames: [...customer.payerNames, tx.payerName] }
              : customer,
          ),
        };
        next = withAudit(next, {
          action: `등록 입금자명 학습: ${tx.payerName}`,
          target: customerId,
          category: "입금 대조",
        });
        return withToast(
          next,
          `'${tx.payerName}'을 등록 입금자명으로 저장했습니다. 다음 업로드부터 자동 매칭됩니다.`,
        );
      });
    },

    mergeSplitTxs(txIds: string[], contractId: string) {
      update((prev) => {
        let next = advance(prev, 2);
        const merged = next.txs.filter((tx) => txIds.includes(tx.id));
        if (merged.length < 2) return prev;
        const total = merged.reduce((sum, tx) => sum + tx.amount, 0);
        let newEnd = "";
        next = {
          ...next,
          txs: next.txs.map((tx) =>
            txIds.includes(tx.id)
              ? {
                  ...tx,
                  status: "연결 완료",
                  contractId,
                  groupedWith: txIds,
                  handledBy: OPERATOR.name,
                  handledAt: stampOf(next.clock),
                  reason: `분할 입금 ${merged.length}건 합산 ${formatWon(total)}으로 처리했습니다.`,
                }
              : tx,
          ),
          contracts: next.contracts.map((contract) => {
            if (contract.id !== contractId) return contract;
            const months = Math.max(1, Math.round(total / Math.max(1, contract.monthlyFee)));
            newEnd = addMonths(contract.endDate, months);
            return {
              ...contract,
              endDate: newEnd,
              status: "정상",
              payments: [
                {
                  id: nextId("PM"),
                  date: merged[merged.length - 1].date,
                  amount: total,
                  payerName: merged[0].payerName,
                  method: "계좌이체" as const,
                  source: "분할 합산" as const,
                  note: `${txIds.join(" + ")} 합산`,
                },
                ...contract.payments,
              ],
            };
          }),
        };
        next = withAudit(next, {
          action: `분할 입금 ${merged.length}건 합산 ${formatWon(total)} · 만료일 ${newEnd}`,
          target: contractId,
          category: "입금 대조",
        });
        return withToast(next, `합산 ${formatWon(total)}으로 만료일을 ${newEnd}로 연장했습니다.`);
      });
    },

    holdTx(txId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const tx = next.txs.find((item) => item.id === txId);
        next = {
          ...next,
          txs: next.txs.map((item) =>
            item.id === txId
              ? { ...item, status: "보류", handledBy: OPERATOR.name, handledAt: stampOf(next.clock) }
              : item,
          ),
          notifications: [
            {
              id: nextId("NT"),
              channel: "문자",
              templateId: "TP-ESCALATE",
              templateName: "입금 이상 통지",
              target: `회계 담당 ${OPERATOR.name} · 010-3320-7781`,
              sentAt: stampOf(next.clock),
              status: "발송 완료",
              handledBy: OPERATOR.name,
            },
            ...next.notifications,
          ],
        };
        next = withAudit(next, {
          action: `입금 보류 이관 · 담당자 문자 통지 (${tx?.payerName ?? txId})`,
          target: txId,
          category: "입금 대조",
        });
        return withToast(next, "보류로 이관하고 담당자에게 문자로 통지했습니다.");
      });
    },

    adjustCharge(contractId: string, amount: number, reason: string) {
      update((prev) => {
        let next = advance(prev, 2);
        next = {
          ...next,
          contracts: next.contracts.map((contract) =>
            contract.id === contractId ? { ...contract, unpaidPrincipal: amount } : contract,
          ),
        };
        next = withAudit(next, {
          action: `청구 금액 조정 ${formatWon(amount)} · 사유: ${reason}`,
          target: contractId,
          category: "계약",
        });
        return withToast(next, `청구 금액을 ${formatWon(amount)}으로 조정했습니다.`);
      });
    },

    settleExcessDays(contractId: string, days: number) {
      update((prev) => {
        let next = advance(prev, 1);
        let added = 0;
        next = {
          ...next,
          contracts: next.contracts.map((contract) => {
            if (contract.id !== contractId) return contract;
            added = Math.round((contract.monthlyFee / 30) * days);
            return { ...contract, unpaidPrincipal: contract.unpaidPrincipal + added };
          }),
        };
        next = withAudit(next, {
          action: `출고 초과 ${days}일 정산 ${formatWon(added)} 가산`,
          target: contractId,
          category: "계약",
        });
        return withToast(next, `초과 ${days}일 정산 ${formatWon(added)}을 청구액에 가산했습니다.`);
      });
    },

    issueClaim(contractId: string, amount: number) {
      update((prev) => {
        let next = advance(prev, 2);
        const contract = next.contracts.find((item) => item.id === contractId);
        const customer = next.customers.find((item) => item.id === contract?.customerId);
        const id = nextId("DOC-2609");
        next = {
          ...next,
          documents: [
            {
              id,
              contractId,
              title: `${customer?.name ?? "고객"} 연체 안내 청구서`,
              template: customer?.kind === "법인" ? "법인" : "개인",
              kind: "청구서",
              createdAt: stampOf(next.clock),
              sentAt: null,
              version: "v1",
              uploadedBy: OPERATOR.name,
            },
            ...next.documents,
          ],
          billingItems: [
            {
              id: nextId("BL-2609"),
              contractId,
              period: "2026-09",
              amount,
              billingStatus: "미수",
              invoiceStatus: "발행 대기",
              retryCount: 0,
              recurring: false,
              cashReceipt: false,
            },
            ...next.billingItems,
          ],
        };
        next = withAudit(next, {
          action: `연체 안내 청구서 발행 ${formatWon(amount)}`,
          target: `${id} · ${contractId}`,
          category: "계약",
        });
        return withToast(next, `연체 안내 청구서 ${id}를 발행했습니다.`);
      });
    },

    requestCardPayment(billingId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          billingItems: next.billingItems.map((item) =>
            item.id === billingId
              ? {
                  ...item,
                  billingStatus: "카드 승인",
                  cardResponse: `결제선생 승인 · 승인번호 3908${item.id.slice(-3)} · ${stampOf(next.clock)}`,
                }
              : item,
          ),
        };
        next = withAudit(next, {
          action: "결제선생 카드 결제 요청·승인 수신",
          target: billingId,
          category: "계약",
        });
        return withToast(next, "결제선생으로 카드 결제를 요청하고 승인을 받았습니다.");
      });
    },

    cancelCardPayment(billingId: string) {
      update((prev) => {
        const item = prev.billingItems.find((billing) => billing.id === billingId);
        if (item?.billingStatus !== "카드 승인") {
          return withToast(prev, "승인 완료된 카드 결제만 취소할 수 있습니다.");
        }
        let next = advance(prev, 1);
        next = {
          ...next,
          billingItems: next.billingItems.map((billing) =>
            billing.id === billingId
              ? {
                  ...billing,
                  billingStatus: "카드 취소",
                  cardResponse: `결제선생 취소 · 원승인 취소 완료 · ${stampOf(next.clock)}`,
                }
              : billing,
          ),
        };
        next = withAudit(next, { action: "결제선생 카드 승인 취소", target: billingId, category: "계약" });
        return withToast(next, "카드 승인을 취소하고 응답 이력을 기록했습니다.");
      });
    },

    confirmBankDeposit(billingId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          billingItems: next.billingItems.map((item) => {
            if (item.id !== billingId) return item;
            const nextStatus = item.billingStatus === "미수" ? "통장 입금 확인" : "입금 완료";
            return {
              ...item,
              billingStatus: nextStatus,
              cashReceipt: nextStatus === "입금 완료" ? true : item.cashReceipt,
            };
          }),
        };
        next = withAudit(next, {
          action: "통장 입금 확인 단계 진행",
          target: billingId,
          category: "계약",
        });
        return withToast(next, "입금 확인 단계를 진행했습니다.");
      });
    },

    approveInvoices(billingIds: string[]) {
      update((prev) => {
        const targets = prev.billingItems.filter(
          (item) => billingIds.includes(item.id) && item.invoiceStatus === "발행 대기",
        );
        if (targets.length === 0) return withToast(prev, "승인할 발행 대기 건을 선택해 주십시오.");
        let next = advance(prev, 1);
        next = {
          ...next,
          billingItems: next.billingItems.map((item) =>
            targets.some((target) => target.id === item.id) ? { ...item, invoiceStatus: "승인" } : item,
          ),
        };
        next = withAudit(next, {
          action: `세금계산서 발행 승인 ${targets.length}건`,
          target: targets.map((item) => item.id).join(", "),
          category: "계약",
        });
        return withToast(next, `${targets.length}건을 발행 승인했습니다.`);
      });
    },

    issueInvoices(billingIds: string[]) {
      update((prev) => {
        const targets = prev.billingItems.filter(
          (item) => billingIds.includes(item.id) && item.invoiceStatus === "승인",
        );
        if (targets.length === 0) return withToast(prev, "발행 승인된 건을 선택해 주십시오.");
        let next = advance(prev, 2);
        next = {
          ...next,
          billingItems: next.billingItems.map((item) =>
            targets.some((target) => target.id === item.id)
              ? {
                  ...item,
                  invoiceStatus: "발행 완료",
                  invoiceNo: `2026-09-${item.id.slice(-4)}`,
                  failReason: undefined,
                }
              : item,
          ),
        };
        next = withAudit(next, {
          action: `센드빌 세금계산서 일괄 발행 ${targets.length}건`,
          target: targets.map((item) => item.id).join(", "),
          category: "계약",
        });
        return withToast(next, `${targets.length}건을 센드빌로 일괄 발행했습니다.`);
      });
    },

    toggleRecurringBilling(billingId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        let recurring = false;
        next = {
          ...next,
          billingItems: next.billingItems.map((item) => {
            if (item.id !== billingId) return item;
            recurring = !item.recurring;
            return { ...item, recurring };
          }),
        };
        next = withAudit(next, {
          action: recurring ? "정기 청구 사용" : "정기 청구 중지",
          target: billingId,
          category: "설정",
        });
        return withToast(next, recurring ? "정기 청구를 사용하도록 설정했습니다." : "다음 달 정기 청구 대상에서 제외했습니다.");
      });
    },

    retryInvoice(billingId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          billingItems: next.billingItems.map((item) =>
            item.id === billingId
              ? {
                  ...item,
                  invoiceStatus: "발행 완료",
                  invoiceNo: `2026-09-${item.id.slice(-4)}`,
                  failReason: undefined,
                  retryCount: item.retryCount + 1,
                }
              : item,
          ),
        };
        next = withAudit(next, {
          action: "세금계산서 발행 실패 재처리",
          target: billingId,
          category: "계약",
        });
        return withToast(next, "인증서 갱신 후 재발행했습니다.");
      });
    },

    createDocument(contractId: string, template: StoredDocument["template"], title: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const id = nextId("DOC-2609");
        next = {
          ...next,
          documents: [
            {
              id,
              contractId,
              title,
              template,
              kind: "계약 안내문",
              createdAt: stampOf(next.clock),
              sentAt: null,
              version: "v1",
              uploadedBy: OPERATOR.name,
            },
            ...next.documents,
          ],
        };
        next = withAudit(next, { action: "계약 안내문 생성", target: `${id} · ${contractId}`, category: "발송" });
        return next;
      });
    },

    sendDocument(contractId: string, template: StoredDocument["template"], title: string, target: string) {
      update((prev) => {
        let next = advance(prev, 2);
        const id = nextId("DOC-2609");
        const at = stampOf(next.clock);
        next = {
          ...next,
          documents: [
            {
              id,
              contractId,
              title,
              template,
              kind: "계약 안내문",
              createdAt: at,
              sentAt: at,
              version: "v1",
              uploadedBy: OPERATOR.name,
            },
            {
              id: nextId("DOC-2609"),
              contractId,
              title: `${title} 세부 내역서`,
              template,
              kind: "세부 내역서",
              createdAt: at,
              sentAt: at,
              version: "v1",
              uploadedBy: OPERATOR.name,
            },
            ...next.documents,
          ],
          notifications: [
            {
              id: nextId("NT"),
              channel: "알림톡",
              templateId: "TP-DOC",
              templateName: "계약 안내문 발송",
              target,
              contractId,
              sentAt: at,
              status: "발송 완료",
              handledBy: OPERATOR.name,
            },
            ...next.notifications,
          ],
        };
        next = withAudit(next, {
          action: "안내문·세부 내역서 동시 발송",
          target: `${id} · ${contractId}`,
          category: "발송",
        });
        return withToast(next, `안내문과 세부 내역서를 ${at}에 발송하고 계약 건에 보관했습니다.`);
      });
    },

    uploadContractFile(contractId: string, fileName: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const id = nextId("DOC-2609");
        next = {
          ...next,
          documents: [
            {
              id,
              contractId,
              title: fileName,
              template: "법인",
              kind: "계약서",
              createdAt: stampOf(next.clock),
              sentAt: null,
              version: "v1",
              uploadedBy: OPERATOR.name,
            },
            ...next.documents,
          ],
        };
        next = withAudit(next, { action: "계약서 파일 업로드", target: `${id} · ${contractId}`, category: "계약" });
        return withToast(next, `${fileName}을 문서함에 보관했습니다.`);
      });
    },

    sendNotifications(targets: { contractId: string; target: string }[], templateId: string, templateName: string) {
      update((prev) => {
        const uniqueTargets = targets.filter(
          (target) =>
            !prev.notifications.some(
              (record) =>
                record.contractId === target.contractId &&
                record.templateId === templateId &&
                record.sentAt.startsWith(TODAY),
            ),
        );
        if (uniqueTargets.length === 0) {
          return withToast(prev, "선택한 계약은 오늘 이미 같은 알림을 받아 중복 발송을 차단했습니다.");
        }
        let next = advance(prev, 2);
        const at = stampOf(next.clock);
        next = {
          ...next,
          notifications: [
            ...uniqueTargets.map((item) => ({
              id: nextId("NT"),
              channel: "알림톡" as const,
              templateId,
              templateName,
              target: item.target,
              contractId: item.contractId,
              sentAt: at,
              status: "발송 완료" as const,
              handledBy: OPERATOR.name,
            })),
            ...next.notifications,
          ],
        };
        next = withAudit(next, {
          action: `${templateName} 선택 발송 ${uniqueTargets.length}건`,
          target: uniqueTargets.map((item) => item.contractId).join(", "),
          category: "발송",
        });
        const blocked = targets.length - uniqueTargets.length;
        return withToast(next, `${uniqueTargets.length}건을 발송했습니다.${blocked ? ` 중복 ${blocked}건은 차단했습니다.` : ""}`);
      });
    },

    sendExpiryDayUnpaidReminders() {
      update((prev) => {
        const candidates = prev.contracts.filter(
          (contract) =>
            contract.endDate === TODAY &&
            prev.billingItems.some(
              (billing) =>
                billing.contractId === contract.id &&
                (billing.billingStatus === "미수" || billing.billingStatus === "통장 입금 확인"),
            ),
        );
        const unsent = candidates.filter(
          (contract) =>
            !prev.notifications.some(
              (record) =>
                record.contractId === contract.id &&
                record.templateId === "TP-EXPIRE-UNPAID" &&
                record.sentAt.startsWith(TODAY),
            ),
        );
        if (unsent.length === 0) {
          return withToast(prev, "만료 당일 미납 재안내 대상이 없거나 오늘 발송을 마쳤습니다.");
        }
        let next = advance(prev, 1);
        const at = stampOf(next.clock);
        next = {
          ...next,
          notifications: [
            ...unsent.map((contract) => {
              const customer = next.customers.find((item) => item.id === contract.customerId);
              return {
                id: nextId("NT"),
                channel: "알림톡" as const,
                templateId: "TP-EXPIRE-UNPAID",
                templateName: "만료 당일 미납 재안내",
                target: `${customer?.name ?? contract.customerId} · ${customer?.contact ?? "연락처 확인"}`,
                contractId: contract.id,
                sentAt: at,
                status: "발송 완료" as const,
                handledBy: OPERATOR.name,
              };
            }),
            ...next.notifications,
          ],
        };
        next = withAudit(next, {
          action: `만료 당일 미납 재안내 ${unsent.length}건`,
          target: unsent.map((contract) => contract.id).join(", "),
          category: "발송",
        });
        return withToast(next, `${unsent.length}건에 만료 당일 미납 재안내를 발송했습니다.`);
      });
    },

    retryNotification(notificationId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          notifications: next.notifications.map((item) =>
            item.id === notificationId
              ? {
                  ...item,
                  status: "문자 재발송 성공",
                  channel: "문자",
                  retriedAt: stampOf(next.clock),
                  handledBy: OPERATOR.name,
                }
              : item,
          ),
        };
        next = withAudit(next, {
          action: "알림톡 실패 건 문자 재발송",
          target: notificationId,
          category: "발송",
        });
        return withToast(next, "문자로 재발송해 복구했습니다.");
      });
    },

    assignChatbotRequest(requestId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const request = next.chatbotRequests.find((item) => item.id === requestId);
        next = {
          ...next,
          chatbotRequests: next.chatbotRequests.map((item) =>
            item.id === requestId ? { ...item, status: "담당자 전달", assignee: "김도현" } : item,
          ),
          notifications: [
            {
              id: nextId("NT"),
              channel: "문자",
              templateId: "TP-BOT",
              templateName: "챗봇 신청 담당자 전달",
              target: "운영 담당 김도현 · 010-2201-4433",
              contractId: request?.contractId,
              sentAt: stampOf(next.clock),
              status: "발송 완료",
              handledBy: OPERATOR.name,
            },
            ...next.notifications,
          ],
        };
        next = withAudit(next, {
          action: "챗봇 신청 담당자 전달",
          target: requestId,
          category: "발송",
        });
        return withToast(next, "담당자에게 전달하고 알림을 보냈습니다.");
      });
    },

    validateChatbotFlow(requestId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const request = next.chatbotRequests.find((item) => item.id === requestId);
        if (!request || request.kind !== "출고 신청") return prev;
        const complete = Boolean(
          request.desiredDate && request.address && request.recipient && request.phone && request.elevator,
        );
        next = {
          ...next,
          chatbotRequests: next.chatbotRequests.map((item) =>
            item.id === requestId
              ? { ...item, validationStatus: complete ? "검증 완료" : "확인 필요" }
              : item,
          ),
        };
        next = withAudit(next, {
          action: `챗봇 출고 신청 전체 흐름 검증 · ${complete ? "통과" : "필수값 확인"}`,
          target: requestId,
          category: "설정",
        });
        return withToast(next, complete ? "출고 필수값과 상담 생성 흐름을 모두 검증했습니다." : "누락된 출고 필수값이 있습니다.");
      });
    },

    applyChatbotScript(script: { greeting: string; buttons: string[] }) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          chatbotScript: { ...script, appliedAt: stampOf(next.clock) },
        };
        next = withAudit(next, {
          action: "챗봇 문구·버튼 반영",
          target: "고객 응대 챗봇",
          category: "설정",
        });
        return withToast(next, "챗봇 문구를 반영했습니다.");
      });
    },

    runMigrationValidation() {
      update((prev) => {
        let next = advance(prev, 2);
        next = { ...next, migrationRunAt: stampOf(next.clock) };
        next = withAudit(next, {
          action: `이관 검증 실행 · 오류 ${next.migrationIssues.filter((i) => !i.resolved).reduce((s, i) => s + i.count, 0)}건`,
          target: seed.migrationSummary.fileName,
          category: "이관",
        });
        return withToast(next, "이관 검증을 실행했습니다.");
      });
    },

    recordMigrationReportExport() {
      update((prev) => {
        let next = advance(prev, 1);
        next = withAudit(next, {
          action: "이관 검증 결과서 PDF 내보내기",
          target: seed.migrationSummary.fileName,
          category: "이관",
        });
        return withToast(next, "이관 검증 결과서 PDF를 생성했습니다.");
      });
    },

    resolveMigrationIssue(issueId: string) {
      update((prev) => {
        let next = advance(prev, 1);
        const issue = next.migrationIssues.find((item) => item.id === issueId);
        next = {
          ...next,
          migrationIssues: next.migrationIssues.map((item) =>
            item.id === issueId ? { ...item, resolved: true } : item,
          ),
        };
        next = withAudit(next, {
          action: `이관 오류 수정 반영 · ${issue?.rule ?? issueId}`,
          target: issueId,
          category: "이관",
        });
        return withToast(next, `${issue?.rule ?? issueId} 오류를 해소했습니다.`);
      });
    },

    registerStaffProfile(input: Pick<StaffProfile, "name" | "role" | "profile" | "permissions">) {
      const id = nextId("ST");
      update((prev) => {
        let next = advance(prev, 1);
        const issuedAt = stampOf(next.clock);
        next = {
          ...next,
          staffProfiles: [
            {
              id,
              ...input,
              status: "활성",
              issuedAt,
              issuedBy: OPERATOR.name,
              issuanceHistory: [`${issuedAt} · ${input.profile} 프로필 발급`],
            },
            ...next.staffProfiles,
          ],
        };
        next = withAudit(next, {
          action: `직원 등록·역할 지정·프로필 발급 · ${input.name}`,
          target: `${id} · ${input.role} · ${input.profile}`,
          category: "설정",
        });
        return withToast(next, `${input.name} 직원을 등록하고 ${input.profile} 프로필을 발급했습니다.`);
      });
      return id;
    },

    revokeStaffProfile(staffId: string) {
      update((prev) => {
        const staff = prev.staffProfiles.find((item) => item.id === staffId);
        if (!staff || staff.status === "회수") return prev;
        if (staff.role === "최고관리자") return withToast(prev, "최고관리자 프로필은 회수할 수 없습니다.");
        let next = advance(prev, 1);
        const at = stampOf(next.clock);
        next = {
          ...next,
          staffProfiles: next.staffProfiles.map((item) =>
            item.id === staffId
              ? {
                  ...item,
                  status: "회수",
                  issuanceHistory: [`${at} · ${OPERATOR.name} 접근 프로필 회수`, ...item.issuanceHistory],
                }
              : item,
          ),
        };
        next = withAudit(next, {
          action: `접근 프로필 회수 · ${staff.name}`,
          target: staffId,
          category: "설정",
        });
        return withToast(next, `${staff.name}의 접근 프로필을 회수했습니다.`);
      });
    },

    setRole(role: State["role"]) {
      update((prev) => {
        let next = advance(prev, 1);
        next = { ...next, role };
        next = withAudit(next, { action: `권한 등급 전환 · ${role}`, target: OPERATOR.name, category: "설정" });
        return withToast(next, `${role} 권한으로 전환했습니다.`);
      });
    },

    saveOverdueRule(rule: { ratePercent: number; graceDays: number; judgeTime: string; sendTime: string }) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          settings: {
            ...next.settings,
            overdueRatePercent: rule.ratePercent,
            overdueGraceDays: rule.graceDays,
            judgeTime: rule.judgeTime,
            sendTime: rule.sendTime,
            updatedAt: stampOf(next.clock),
          },
        };
        next = withAudit(next, {
          action: `연체료 규칙 변경 · 연 ${rule.ratePercent}% / 유예 ${rule.graceDays}일`,
          target: "환경 설정",
          category: "설정",
        });
        return withToast(next, "연체 규칙을 저장했습니다. 연체·정산에 바로 반영됩니다.");
      });
    },

    saveRetentionPolicy(completedContractRetentionYears: number, outboundPhotoRetentionMonths: number) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          settings: {
            ...next.settings,
            completedContractRetentionYears,
            outboundPhotoRetentionMonths,
            updatedAt: stampOf(next.clock),
          },
        };
        next = withAudit(next, {
          action: `보존 정책 변경 · 완료 계약 ${completedContractRetentionYears}년 / 출고 사진 ${outboundPhotoRetentionMonths}개월`,
          target: "환경 설정",
          category: "설정",
        });
        return withToast(next, "계약·사진 보존 정책을 저장했습니다.");
      });
    },

    addNotice(title: string, body: string) {
      update((prev) => {
        let next = advance(prev, 1);
        next = {
          ...next,
          notices: [
            {
              id: nextId("NO"),
              title,
              body,
              postedAt: stampOf(next.clock),
              author: OPERATOR.name,
            },
            ...next.notices,
          ],
        };
        next = withAudit(next, { action: "공지사항 등록", target: title, category: "설정" });
        return withToast(next, "공지사항을 등록했습니다.");
      });
    },
  };
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const actions = useMemo(() => buildActions(setState), []);
  const derived = useMemo(() => buildDerived(state), [state]);
  const value = useMemo<StoreValue>(
    () => ({ state, stamp: stampOf(state.clock), actions, derived }),
    [state, actions, derived],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreProvider 안에서만 사용할 수 있습니다.");
  return value;
}

export function useToastDismiss() {
  const { actions } = useStore();
  return useCallback((id: string) => actions.dismissToast(id), [actions]);
}
