import type { UserRole } from "./users";

export type AuthUser = {
  id: number;
  phone: string;
  login: string;
  email?: string;
  role: UserRole;
  tenantId: number | null;
  organizationIds: number[];
  isActive?: boolean;
};

/** Поля пользователя в ответах API (login, verify, /me) — tenantId может быть как `primaryTenantId`. */
export type AuthApiUser = {
  id: number;
  phone: string;
  login: string;
  role: UserRole;
  email?: string;
  primaryTenantId?: number | null;
  tenantId?: number | null;
  organizationIds?: number[];
  isActive?: boolean;
};

export type LoginRequestDto = {
  identifier: string;
  password: string;
};

export type RegisterRequestDto = {
  phone: string;
  login: string;
  email: string;
  password: string;
  consentToPrivacyPolicy: boolean;
  consentToPersonalData: boolean;
  agreementVersion: string;
  captchaToken: string;
};

export type AuthResponseDto = {
  accessToken: string;
  user: AuthApiUser;
};

export type RegisterResponseDto = {
  success: boolean;
  message: string;
  /** false — SMTP не настроен на сервере, код только в логах бэкенда */
  emailSentViaSmtp?: boolean;
  verificationRequired: boolean;
  verificationTtlSec: number;
  resendAvailableInSec: number;
  accessToken?: string;
  user?: AuthApiUser;
};

export type VerifyEmailRequestDto = {
  email: string;
  code: string;
};

export type ResendEmailCodeRequestDto = {
  email: string;
};

export type ResendEmailCodeResponseDto = {
  success: boolean;
  message: string;
  emailSentViaSmtp?: boolean;
  resendAvailableInSec: number;
};
