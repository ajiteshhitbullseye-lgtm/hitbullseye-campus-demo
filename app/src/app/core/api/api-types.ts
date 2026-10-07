import { Status } from '../models';

/** Every API failure comes back as this, mock or real. `code` is stable; show `message`. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public data?: unknown) {
    super(message);
  }
}

export function asApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  const any = e as { status?: number; error?: { code?: string; message?: string }; message?: string };
  if (any && typeof any === 'object' && 'status' in any) {
    return new ApiError(any.status || 0, any.error?.code || 'HTTP_' + any.status, any.error?.message || any.message || 'Request failed');
  }
  return new ApiError(0, 'UNKNOWN', (e as Error)?.message || 'Something went wrong');
}

/** Anything that can be switched off instead of deleted. */
export type StatusEntity =
  | 'student' | 'roster' | 'client' | 'batch' | 'admin'
  | 'assessment' | 'field' | 'department' | 'spoc' | 'invoice';

export interface StatusChange {
  entity: StatusEntity;
  campusId: string;
  /** registration id / roster key / batch id / adminRef / test id / field id / department name / spoc email / invoice id */
  id: string;
  status: Status;            // for invoices "inactive" means "cancelled"
  reason: string;
}

/** Step 2 of registration: what the server says about access code + ID + email. */
export interface GateCheckRequest {
  campusId: string;
  accessCode: string;
  uid: string;
  email: string;
}
export interface GateCheckResult {
  batchId: string;
  batchName: string;
  name: string;
  department?: string;
  programme?: string;
  course?: string;
  session?: string;
  maskedEmail: string;
  /** a draft already exists for this student - the form will continue from it */
  hasDraft: boolean;
  draftCompletion?: number;
}

export interface OtpRequest { campusId: string; batchId: string; uid: string; email: string; }
export interface OtpSent { sentTo: string; resendSeconds: number; length: number; demoCode?: string; }

export interface SubmitRegistrationRequest {
  campusId: string;
  batchId: string;
  uid: string;
  email: string;
  via: 'otp' | 'credentials';
  values: Record<string, string>;
  data: Record<string, { label: string; value: string }>;
  declarationRows: number;
}

export interface SyncSummary {
  clients: number;
  batches: number;
  added: number;
  updated: number;
  deactivated: number;
}
