import type { QueryResultRow } from "pg";

export type BookingStatus =
  | "PENDING_HOLD" | "PENDING_APPROVAL" | "PENDING_PAYMENT" | "CONFIRMED"
  | "CANCELLED" | "REJECTED" | "EXPIRED" | "COMPLETED" | "NO_SHOW";
export type SlotStatus =
  | "TEMPORARY_HOLD" | "PENDING_APPROVAL" | "PENDING_PAYMENT" | "CONFIRMED"
  | "BLOCKED" | "MAINTENANCE" | "INTERNAL_USE" | "CANCELLED";
export type PaymentStatus = "INITIATED" | "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";

export interface Space extends QueryResultRow {
  id: string;
  crmVenueId: string | null;
  name: string;
  category: string;
  setting: string;
  capacityMin: number | null;
  capacityMax: number | null;
  bookableOnline: boolean;
  requiresApproval: boolean;
  availabilityEnabled: boolean;
  active: boolean;
  sortOrder: number;
  description: string | null;
  pricingJson: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SlotState extends QueryResultRow {
  id: string;
  spaceId: string;
  date: string;
  slot: string;
  status: SlotStatus;
  source: string;
  holdExpiresAt: Date | null;
  bookingRef: string | null;
  startMinute: number | null;
  endMinute: number | null;
  groupId: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  name?: string;
}

export interface Booking extends QueryResultRow {
  id: string;
  reference: string;
  spaceId: string;
  spaceName: string;
  childSpaceIds: string | null;
  eventType: string;
  eventDate: string;
  slot: string;
  guests: number;
  status: BookingStatus;
  crmSync: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  source: string;
  createdById: string | null;
  requestKey: string | null;
  requestHash: string | null;
  startAt: Date | null;
  endAt: Date | null;
  customerCountry: string;
  notes: string | null;
  baseAmount: number;
  weekendUplift: number;
  taxAmount: number;
  depositAmount: number;
  totalPayable: number;
  addons: unknown | null;
  holdExpiresAt: Date | null;
  confirmedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment extends QueryResultRow {
  id: string;
  bookingId: string;
  provider: string;
  providerRef: string;
  idempotencyKey: string;
  amount: number;
  status: PaymentStatus;
  method: string | null;
  transactionId: string | null;
  failureReason: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  reference?: string;
  spaceName?: string;
}

export interface Lead extends QueryResultRow {
  id: string;
  type: string;
  stage: string;
  name: string;
  phone: string;
  email: string;
  country: string | null;
  eventType: string | null;
  eventDate: string | null;
  slot: string | null;
  guests: number | null;
  venueInterest: string | null;
  setting: string | null;
  visitDate: string | null;
  visitTime: string | null;
  message: string | null;
  source: string;
  internalNotes: string | null;
  followUpAt: Date | null;
  utmJson: string | null;
  createdAt: Date;
}

export interface Document extends QueryResultRow {
  id: string;
  bookingId: string;
  type: string;
  title: string;
  createdAt: Date;
}

export interface Milestone extends QueryResultRow {
  id: string;
  bookingId: string;
  title: string;
  detail: string | null;
  dueDate: string | null;
  status: string;
  order: number;
  createdAt: Date;
}

export interface AdminUser extends QueryResultRow {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  disabled: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSession extends QueryResultRow {
  id: string;
  adminId: string;
  lastSeenAt: Date;
  expiresAt: Date;
}

export interface LoginAttempt extends QueryResultRow {
  key: string;
  failures: number;
  resetAt: Date;
}

export interface AuditLog extends QueryResultRow {
  id: string;
  action: string;
  entity: string;
  entityRef: string;
  actorId: string | null;
  ip: string | null;
  beforeJson: string | null;
  afterJson: string | null;
  detailJson: string | null;
  createdAt: Date;
}

export interface ContentEntry extends QueryResultRow {
  id: string;
  key: string;
  locale: string;
  draft: unknown;
  published: unknown | null;
  editedBy: string;
  updatedAt: Date;
}

export interface ContentVersion extends QueryResultRow {
  id: string;
  entryId: string;
  payload: unknown;
  actorId: string;
  createdAt: Date;
}

export interface SessionConfig extends QueryResultRow {
  id: string;
  spaceId: string;
  key: string;
  label: string;
  startMinute: number;
  endMinute: number;
  enabled: boolean;
}

export interface CustomerNote extends QueryResultRow {
  id: string;
  email: string;
  note: string;
  actorId: string;
  createdAt: Date;
}

export interface BookingNote extends QueryResultRow {
  id: string;
  bookingRef: string;
  note: string;
  actorId: string;
  createdAt: Date;
}

export interface EmailLog extends QueryResultRow {
  id: string;
  bookingRef: string;
  template: string;
  status: string;
  createdAt: Date;
}

export interface MediaAsset extends QueryResultRow {
  id: string;
  filename: string;
  mime: string;
  size: number;
  alt: string;
  folder: string;
  tags: string;
  storageBucket: string | null;
  version: string | null;
  createdAt: Date;
}

export interface SupportTicket extends QueryResultRow {
  id: string;
  bookingRef: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: string;
  createdAt: Date;
}

export interface AnalyticsEvent extends QueryResultRow {
  id: string;
  name: string;
  path: string | null;
  sessionId: string | null;
  metaJson: string | null;
  createdAt: Date;
}

export interface PaymentSettings extends QueryResultRow {
  id: string;
  mode: string;
  provider: string;
  updatedAt: Date;
}

export interface GatewayCredential extends QueryResultRow {
  provider: string;
  keyId: string;
  encrypted: string;
  updatedAt: Date;
}
