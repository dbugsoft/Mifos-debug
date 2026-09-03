/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with
 * this file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Injectable } from '@angular/core';

export interface CoopAuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  status: 'UNVERIFIED' | 'VERIFIED';
}

export interface CoopJwtPayload {
  iss?: string;
  sub?: string;
  uid?: number;
  exp?: number;
  iat?: number;
  roles?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class CoopTokenService {
  /**
   * Authentication session is stored in localStorage.
   *
   * This means the session survives:
   * - page refresh
   * - browser tab close/reopen
   *
   * NOTE:
   * localStorage is shared between tabs of the same origin.
   * Therefore, using the same `coopAuthSession` key for both
   * Admin and Customer can cause one session to overwrite
   * the other.
   *
   * If Admin and Customer must be logged in simultaneously
   * in different tabs, separate storage keys should be used.
   */
  private readonly storageKey = 'coopAuthSession';

  /**
   * Save complete Coop authentication session
   */
  setSession(session: CoopAuthSession): void {
    localStorage.setItem(this.storageKey, JSON.stringify(session));
  }

  /**
   * Get complete Coop authentication session
   */
  getSession(): CoopAuthSession | null {
    const session = localStorage.getItem(this.storageKey);

    if (!session) {
      return null;
    }

    try {
      return JSON.parse(session) as CoopAuthSession;
    } catch {
      return null;
    }
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return this.getSession()?.accessToken ?? null;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return this.getSession()?.refreshToken ?? null;
  }

  /**
   * Update access and refresh tokens
   */
  updateTokens(tokens: { accessToken: string; refreshToken: string; tokenType: string; expiresIn: number }): void {
    const currentSession = this.getSession();

    if (!currentSession) {
      return;
    }

    this.setSession({
      ...currentSession,

      accessToken: tokens.accessToken,

      refreshToken: tokens.refreshToken,

      tokenType: tokens.tokenType,

      expiresIn: tokens.expiresIn
    });
  }

  /**
   * Check whether user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Clear authentication session
   */
  clearSession(): void {
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Check whether access token is expired
   */
  isAccessTokenExpired(): boolean {
    const payload = this.decodeAccessToken();

    if (!payload?.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);

    return payload.exp <= currentTime;
  }

  // =====================================================
  // ROLE / JWT HANDLING
  // =====================================================

  /**
   * Decode current access token.
   */
  private decodeAccessToken(): CoopJwtPayload | null {
    const token = this.getAccessToken();

    if (!token) {
      return null;
    }

    const segments = token.split('.');

    if (segments.length !== 3) {
      return null;
    }

    try {
      const base64Url = segments[1];

      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

      const decodedBytes = atob(paddedBase64);

      const jsonString = decodeURIComponent(
        Array.from(decodedBytes)
          .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonString) as CoopJwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Get roles from current access token.
   */
  getRoles(): string[] {
    return this.decodeAccessToken()?.roles ?? [];
  }

  /**
   * Check whether current user is Admin.
   */
  isAdmin(): boolean {
    return this.getRoles().includes('ADMIN');
  }
}
