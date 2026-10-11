/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CoopRegisterRequest {
  email: string;
  password: string;
  phone: string;
}

export interface CoopRegisterResponse {
  userId: string;
  message?: string;
  [key: string]: any;
}

export interface CoopVerifyEmailRequest {
  userId: string;
  otp: string;
}

export interface CoopVerifyEmailResponse {
  success: boolean;
  message?: string;
  status?: 'UNVERIFIED' | 'VERIFIED';
  [key: string]: any;
}

export interface CoopLoginRequest {
  email: string;
  password: string;
}

export interface CoopLoginResponse {
  tokenType: string;
  status: 'UNVERIFIED' | 'VERIFIED' | 'ACTIVE';
  isEmailVerified: boolean;
  expiresIn: number;
  refreshToken: string;
  accessToken: string;
}

/** Body of a 429 from POST /public/login while the account is locked after repeated failures. */
export interface CoopLoginLockedResponse {
  error: string;
  retryAfterMinutes: number;
}

export interface CoopRefreshTokenRequest {
  refreshToken: string;
}

export interface CoopRefreshTokenResponse {
  expiresIn: number;
  tokenType: string;
  accessToken: string;
  refreshToken: string;
}

export interface CoopResendOtpRequest {
  email: string;
}

export interface CoopResendOtpResponse {
  userId: string;
  message?: string;
  [key: string]: any;
}

export interface CoopLogoutRequest {
  refreshToken: string;
}

export interface CoopLogoutResponse {
  message: string;
}

export interface CoopChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CoopChangePasswordResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoopAuthService {
  private http = inject(HttpClient);

  private readonly baseUrl = `${environment.coopApiUrl}/nepal/coop-registration/public`;

  register(data: CoopRegisterRequest): Observable<CoopRegisterResponse> {
    return this.http.post<CoopRegisterResponse>(`${this.baseUrl}/register`, data);
  }

  verifyEmail(data: CoopVerifyEmailRequest): Observable<CoopVerifyEmailResponse> {
    return this.http.post<CoopVerifyEmailResponse>(`${this.baseUrl}/verify-email`, data);
  }

  login(data: CoopLoginRequest): Observable<CoopLoginResponse> {
    return this.http.post<CoopLoginResponse>(`${this.baseUrl}/login`, data);
  }

  resendOtp(data: CoopResendOtpRequest): Observable<CoopResendOtpResponse> {
    return this.http.post<CoopResendOtpResponse>(`${this.baseUrl}/resend-otp`, data);
  }

  logout(data: CoopLogoutRequest): Observable<CoopLogoutResponse> {
    return this.http.post<CoopLogoutResponse>(`${this.baseUrl}/logout`, data);
  }

  refresh(data: CoopRefreshTokenRequest): Observable<CoopRefreshTokenResponse> {
    return this.http.post<CoopRefreshTokenResponse>(`${this.baseUrl}/refresh`, data);
  }

  /**
   * POST /public/change-password
   *
   * On success the server revokes every session for the account,
   * so the caller must clear the local session and send the user
   * back to login.
   */
  changePassword(data: CoopChangePasswordRequest): Observable<CoopChangePasswordResponse> {
    return this.http.post<CoopChangePasswordResponse>(`${this.baseUrl}/change-password`, data);
  }
}
