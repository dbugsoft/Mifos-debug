/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, switchMap, tap } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { BeneficialOwner, KymHistoryRow, KymListRow, KymListStatus, KymView } from './kym.models';

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
  /** The KYM last read or changed, so the member header's chip follows changes made on the KYM tab. */
  readonly latest = signal<KymView | null>(null);

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

  /** Fineract's own permission for adding a client document (thumbprints, an organisation's papers). */
  canUploadDocuments(): boolean {
    return this.holds('CREATE_DOCUMENT');
  }

  get(clientId: number): Observable<KymView> {
    return this.http.get<KymView>(`/nepal/kym/${clientId}`).pipe(tap((k) => this.latest.set(k)));
  }

  update(clientId: number, changes: Record<string, unknown>): Observable<KymView> {
    return this.http.put<KymView>(`/nepal/kym/${clientId}`, changes).pipe(tap((k) => this.latest.set(k)));
  }

  verify(clientId: number): Observable<KymView> {
    return this.http.post<KymView>(`/nepal/kym/${clientId}/verify`, {}).pipe(tap((k) => this.latest.set(k)));
  }

  level(clientId: number, level: 'FULL' | 'SIMPLIFIED', reason?: string): Observable<KymView> {
    return this.http
      .put<KymView>(`/nepal/kym/${clientId}/level`, { level, reason })
      .pipe(tap((k) => this.latest.set(k)));
  }

  history(clientId: number): Observable<KymHistoryRow[]> {
    return this.http.get<KymHistoryRow[]>(`/nepal/kym/${clientId}/history`);
  }

  owners(clientId: number): Observable<BeneficialOwner[]> {
    return this.http.get<BeneficialOwner[]>(`/nepal/kym/${clientId}/beneficial-owners`);
  }

  addOwner(clientId: number, owner: Record<string, unknown>): Observable<KymView> {
    return this.http
      .post<KymView>(`/nepal/kym/${clientId}/beneficial-owners`, { inPerson: true, ...owner })
      .pipe(tap((k) => this.latest.set(k)));
  }

  endOwner(clientId: number, ownerId: number, reason: string): Observable<KymView> {
    return this.http
      .post<KymView>(`/nepal/kym/${clientId}/beneficial-owners/${ownerId}/end`, { reason })
      .pipe(tap((k) => this.latest.set(k)));
  }

  /** Members by KYM status in the user's offices (or one office and those under it), a page at a time. */
  list(status: KymListStatus, officeId: number | null, offset: number, limit: number): Observable<KymListRow[]> {
    const params: Record<string, string | number> = { status, offset, limit };
    if (officeId != null) {
      params['officeId'] = officeId;
    }
    return this.http.get<KymListRow[]>('/nepal/kym', { params });
  }

  /** An organisation's own answers (only the fields sent change); someone authorised to act for it is present. */
  updateOrganisation(clientId: number, changes: Record<string, unknown>): Observable<KymView> {
    return this.http
      .put<KymView>(`/nepal/kym/${clientId}/organisation`, { ...changes, inPerson: true })
      .pipe(tap((k) => this.latest.set(k)));
  }

  /** Links a person (a client of this cooperative) to an organisation as board member, chief executive or operator. */
  linkPerson(clientId: number, personClientId: number, role: string, title?: string): Observable<KymView> {
    return this.http
      .post<KymView>(`/nepal/kym/${clientId}/people`, { personClientId, role, title: title || null })
      .pipe(tap((k) => this.latest.set(k)));
  }

  endPerson(clientId: number, linkId: number, reason: string): Observable<KymView> {
    return this.http
      .post<KymView>(`/nepal/kym/${clientId}/people/${linkId}/end`, { reason })
      .pipe(tap((k) => this.latest.set(k)));
  }

  /** Uploads one of the documents the KYM looks for, under its fixed name, as a Fineract client document. */
  uploadDocument(clientId: number, name: string, file: File, description?: string): Observable<unknown> {
    const form = new FormData();
    form.append('name', name);
    form.append('description', description ?? '');
    form.append('file', file, file.name);
    return this.http.post(`/clients/${clientId}/documents`, form);
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
