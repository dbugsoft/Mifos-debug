/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface IdentifierBsDates {
  identifierId: number;
  issuanceDateBs: string | null;
  expiryDateBs: string | null;
}

/**
 * The Bikram Sambat dates as staff typed them, kept alongside Fineract's AD dates for a member's date of birth and
 * identity documents (fineract-dbug ADR 0020). Saved right after Fineract's own save; the server only keeps a BS date
 * that converts to the AD date Fineract holds.
 */
@Injectable({ providedIn: 'root' })
export class MemberBsDatesService {
  private http = inject(HttpClient);

  saveDateOfBirthBs(clientId: number | string, dateOfBirthBs: string | null): Observable<unknown> {
    return this.http.put(`/nepal/clients/${clientId}/bs-dates`, { dateOfBirthBs });
  }

  getIdentifierBsDates(clientId: number | string): Observable<IdentifierBsDates[]> {
    return this.http.get<IdentifierBsDates[]>(`/nepal/clients/${clientId}/identifiers/bs-dates`);
  }

  saveIdentifierBsDates(
    clientId: number | string,
    identifierId: number | string,
    issuanceDateBs: string | null,
    expiryDateBs: string | null
  ): Observable<unknown> {
    return this.http.put(`/nepal/clients/${clientId}/identifiers/${identifierId}/bs-dates`, {
      issuanceDateBs,
      expiryDateBs
    });
  }
}
