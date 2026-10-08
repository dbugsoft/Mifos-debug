/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { BeneficialOwner, KymHistoryRow, KymView } from './kym.models';

export interface CodeOption {
  id: number;
  name: string;
}

/**
 * A member's KYM (fineract-dbug ADR 0039, docs/member-kym.md). READ_KYM, UPDATE_KYM and VERIFY_KYM are ordinary
 * Fineract permissions; the screens check them before calling, because the global error handler alerts on every
 * refused call.
 */
@Injectable({ providedIn: 'root' })
export class KymService {
  private http = inject(HttpClient);
  private authenticationService = inject(AuthenticationService);
  private professions$?: Observable<CodeOption[]>;

  private holds(...anyOf: string[]): boolean {
    const held: string[] = this.authenticationService.getCredentials()?.permissions ?? [];
    return [
      'ALL_FUNCTIONS',
      ...anyOf
    ].some((p) => held.includes(p));
  }

  canRead(): boolean {
    return this.holds('ALL_FUNCTIONS_READ', 'READ_KYM');
  }

  canUpdate(): boolean {
    return this.holds('UPDATE_KYM');
  }

  canVerify(): boolean {
    return this.holds('VERIFY_KYM');
  }

  get(clientId: number): Observable<KymView> {
    return this.http.get<KymView>(`/nepal/kym/${clientId}`);
  }

  update(clientId: number, changes: Record<string, unknown>): Observable<KymView> {
    return this.http.put<KymView>(`/nepal/kym/${clientId}`, changes);
  }

  verify(clientId: number): Observable<KymView> {
    return this.http.post<KymView>(`/nepal/kym/${clientId}/verify`, {});
  }

  level(clientId: number, level: 'FULL' | 'SIMPLIFIED', reason?: string): Observable<KymView> {
    return this.http.put<KymView>(`/nepal/kym/${clientId}/level`, { level, reason });
  }

  history(clientId: number): Observable<KymHistoryRow[]> {
    return this.http.get<KymHistoryRow[]>(`/nepal/kym/${clientId}/history`);
  }

  owners(clientId: number): Observable<BeneficialOwner[]> {
    return this.http.get<BeneficialOwner[]>(`/nepal/kym/${clientId}/beneficial-owners`);
  }

  addOwner(clientId: number, owner: Record<string, unknown>): Observable<KymView> {
    return this.http.post<KymView>(`/nepal/kym/${clientId}/beneficial-owners`, { inPerson: true, ...owner });
  }

  endOwner(clientId: number, ownerId: number, reason: string): Observable<KymView> {
    return this.http.post<KymView>(`/nepal/kym/${clientId}/beneficial-owners/${ownerId}/end`, { reason });
  }

  /** Fineract's PROFESSION code values (the occupations the cooperative keeps), asked once. */
  professions(): Observable<CodeOption[]> {
    if (!this.professions$) {
      this.professions$ = this.http.get<CodeOption[]>('/codes').pipe(
        map((codes) => codes.find((c) => c.name === 'PROFESSION')?.id ?? null),
        switchMap((id) => (id == null ? of([]) : this.http.get<CodeOption[]>(`/codes/${id}/codevalues`))),
        shareReplay(1)
      );
    }
    return this.professions$;
  }

  /** Clients whose name or account number matches, for picking recommenders and family members. */
  searchClients(text: string): Observable<{ id: number; displayName: string; accountNo: string }[]> {
    return this.http
      .get<{ pageItems: { id: number; displayName: string; accountNo: string }[] }>('/clients', {
        params: { displayName: text, limit: 10, orphansOnly: false }
      })
      .pipe(map((r) => r.pageItems ?? []));
  }
}
