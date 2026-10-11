/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, concat, last } from 'rxjs';

import {
  MemberAddress,
  MemberAddressDraft,
  MemberAddressRequest,
  MemberAddressTemplate,
  MemberAddressType
} from './member-address.model';

/** Fineract's usual reply to a command. */
export interface CommandResult {
  resourceId?: number;
  clientId?: number;
  changes?: Record<string, unknown>;
}

/** `/v1/clients/{clientId}/nepal-addresses`: a member's permanent and temporary address. */
@Injectable({ providedIn: 'root' })
export class MemberAddressService {
  private readonly http = inject(HttpClient);

  getAddresses(clientId: number | string): Observable<MemberAddress[]> {
    return this.http.get<MemberAddress[]>(this.url(clientId));
  }

  getTemplate(clientId: number | string): Observable<MemberAddressTemplate> {
    return this.http.get<MemberAddressTemplate>(`${this.url(clientId)}/template`);
  }

  create(
    clientId: number | string,
    addressType: MemberAddressType,
    request: MemberAddressRequest
  ): Observable<CommandResult> {
    return this.http.post<CommandResult>(this.url(clientId), { addressType, ...request });
  }

  /** Replaces the whole address; optional fields left out are cleared. */
  update(
    clientId: number | string,
    addressType: MemberAddressType,
    request: MemberAddressRequest
  ): Observable<CommandResult> {
    return this.http.put<CommandResult>(`${this.url(clientId)}/${addressType}`, request);
  }

  delete(clientId: number | string, addressType: MemberAddressType): Observable<CommandResult> {
    return this.http.delete<CommandResult>(`${this.url(clientId)}/${addressType}`);
  }

  /**
   * Saves the addresses entered while creating a member. The permanent address goes first, because a temporary
   * address that is "same as permanent" needs it to exist.
   */
  saveDraft(clientId: number | string, draft: MemberAddressDraft): Observable<CommandResult> {
    const permanent = this.create(clientId, 'PERMANENT', draft.permanent);
    if (!draft.temporary) {
      return permanent;
    }
    return concat(permanent, this.create(clientId, 'TEMPORARY', draft.temporary)).pipe(last());
  }

  private url(clientId: number | string): string {
    return `/v1/clients/${clientId}/nepal-addresses`;
  }
}
