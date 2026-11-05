/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { grouped } from 'app/coop-dashboard/coop-format';
import { LoanEligibilityService } from '../loan-eligibility.service';
import { eligibilityReason } from '../eligibility-reason';
import { COLLATERAL_KINDS, CollateralKind, LoanEligibilityCheckResponse } from '../loan-eligibility.models';

/**
 * "Check loan eligibility" (fineract-dbug #154; docs/loan-eligibility.md) as its own page instead of a dialog,
 * opened from the member's page: `clients/:clientId/loan-eligibility`. Reads the member's id off the parent
 * `:clientId` route, since `loan-eligibility` itself carries no route param.
 */
@Component({
  selector: 'mifosx-loan-eligibility-page',
  templateUrl: './loan-eligibility-page.component.html',
  styleUrls: ['./loan-eligibility-page.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatTooltip,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanEligibilityPageComponent {
  private route = inject(ActivatedRoute);
  private service = inject(LoanEligibilityService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly clientId = Number(this.route.parent?.snapshot.paramMap.get('clientId'));

  readonly collateralKinds = COLLATERAL_KINDS;
  readonly checking = signal(false);
  readonly response = signal<LoanEligibilityCheckResponse | null>(null);
  readonly reasonFn = eligibilityReason;
  readonly grouped = grouped;

  readonly form = inject(FormBuilder).group({
    amount: [
      null as number | null,
      [
        Validators.required,
        Validators.min(0.01)
      ]
    ],
    collateral: [
      'NONE' as CollateralKind | null,
      Validators.required
    ],
    collateralValue: [null as number | null],
    guarantors: [
      0,
      Validators.min(0)
    ]
  });

  constructor() {
    this.form.controls.collateral.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.toggleCollateralValue());
    this.toggleCollateralValue();
  }

  get showCollateralValue(): boolean {
    const c = this.form.value.collateral;
    return c === 'DEPOSIT' || c === 'LAND_CITY' || c === 'LAND_ELSEWHERE';
  }

  get collateralValueHint(): string | null {
    return this.form.value.collateral === 'DEPOSIT' ? 'loanEligibility.depositValueHint' : null;
  }

  get showGuarantors(): boolean {
    return this.form.value.collateral === 'NONE';
  }

  reason(rule: LoanEligibilityCheckResponse['result']['rules'][number]): string {
    return this.reasonFn(rule, (key, params) => this.translate.instant(key, params));
  }

  check(): void {
    if (this.form.invalid || this.checking()) {
      this.form.markAllAsTouched();
      return;
    }
    this.checking.set(true);
    const v = this.form.getRawValue();
    this.service
      .check({
        clientId: this.clientId,
        amount: Number(v.amount),
        collateral: (v.collateral ?? 'NONE') as CollateralKind,
        collateralValue: this.showCollateralValue && v.collateralValue != null ? Number(v.collateralValue) : undefined,
        guarantors: this.showGuarantors ? Number(v.guarantors ?? 0) : undefined
      })
      .subscribe({
        next: (r) => {
          this.checking.set(false);
          this.response.set(r);
        },
        error: (e) => {
          this.checking.set(false);
          this.applyServerErrors(e?.error?.errors);
        }
      });
  }

  private toggleCollateralValue(): void {
    const control = this.form.controls.collateralValue;
    const c = this.form.value.collateral;
    if (c === 'LAND_CITY' || c === 'LAND_ELSEWHERE') {
      control.setValidators([
        Validators.required,
        Validators.min(0.01)
      ]);
    } else if (c === 'DEPOSIT') {
      control.setValidators([Validators.min(0.01)]);
    } else {
      control.setValidators(null);
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  /** Fineract's `{parameterName, defaultUserMessage}` errors (400), one per field; all come at once. */
  private applyServerErrors(errors: Array<{ parameterName?: string; defaultUserMessage?: string }> | undefined): void {
    if (!errors?.length) {
      return;
    }
    for (const e of errors) {
      const control = e.parameterName ? this.form.get(e.parameterName) : null;
      if (control) {
        control.setErrors({ server: e.defaultUserMessage || true });
      }
    }
  }
}
