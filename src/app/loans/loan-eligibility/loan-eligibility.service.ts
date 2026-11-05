/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import {
  CodeOption,
  CollateralKind,
  CollateralProductOption,
  CollateralTypeOption,
  GlAccountOption,
  LoanEligibilityCheckRequest,
  LoanEligibilityCheckResponse,
  LoanEligibilityCommandResult,
  LoanEligibilityRulesResponse,
  LoanEligibilitySettings,
  SavingsProductOption
} from './loan-eligibility.models';

const BASE = '/nepal/loan-eligibility';

/**
 * Whether a member may borrow, by the cooperative's own rules (fineract-dbug #154; docs/loan-eligibility.md): the
 * check before an application is made, the settings that switch the rules on and set their numbers, and the
 * lookups the settings tab's selects need.
 */
@Injectable({ providedIn: 'root' })
export class LoanEligibilityService {
  private http = inject(HttpClient);
  private authenticationService = inject(AuthenticationService);

  /** Whether the signed-in user holds one of these permissions, or all functions (or all-functions-read for a READ_ one). */
  private can(...permissions: string[]): boolean {
    const held: string[] = this.authenticationService.getCredentials()?.permissions ?? [];
    if (held.includes('ALL_FUNCTIONS')) {
      return true;
    }
    return permissions.some((p) => held.includes(p) || (p.startsWith('READ_') && held.includes('ALL_FUNCTIONS_READ')));
  }

  canRead(): boolean {
    return this.can('READ_LOANELIGIBILITY');
  }

  canUpdate(): boolean {
    return this.can('UPDATE_LOANELIGIBILITY');
  }

  rules(): Observable<LoanEligibilityRulesResponse> {
    return this.http.get<LoanEligibilityRulesResponse>(`${BASE}/rules`);
  }

  updateRules(settings: LoanEligibilitySettings): Observable<LoanEligibilityCommandResult> {
    return this.http.put<LoanEligibilityCommandResult>(`${BASE}/rules`, settings);
  }

  check(request: LoanEligibilityCheckRequest): Observable<LoanEligibilityCheckResponse> {
    let params = new HttpParams()
      .set('clientId', request.clientId)
      .set('amount', request.amount)
      .set('collateral', request.collateral);
    if (request.collateralValue != null) {
      params = params.set('collateralValue', request.collateralValue);
    }
    if (request.guarantors != null) {
      params = params.set('guarantors', request.guarantors);
    }
    return this.http.get<LoanEligibilityCheckResponse>(BASE, { params });
  }

  // ---- settings tab lookups

  glAccounts(): Observable<GlAccountOption[]> {
    return this.http.get<GlAccountOption[]>('/glaccounts', {
      params: new HttpParams().set('type', 3).set('usage', 1).set('disabled', false)
    });
  }

  savingsProducts(): Observable<SavingsProductOption[]> {
    return this.http.get<SavingsProductOption[]>('/savingsproducts');
  }

  collateralProducts(): Observable<CollateralProductOption[]> {
    return this.http.get<CollateralProductOption[]>('/collateral-management');
  }

  /** The values of Fineract's `LoanCollateral` code - the types offered by "Add Collateral" on a loan's page. */
  collateralTypes(): Observable<CollateralTypeOption[]> {
    return this.http.get<CodeOption[]>('/codes').pipe(
      map((codes) => codes.find((c) => c.name === 'LoanCollateral')?.id),
      switchMap((codeId) =>
        codeId == null ? of([]) : this.http.get<CollateralTypeOption[]>(`/codes/${codeId}/codevalues`)
      )
    );
  }
}
