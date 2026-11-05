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
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { grouped } from 'app/coop-dashboard/coop-format';
import { LoanEligibilityService } from '../loan-eligibility.service';
import { eligibilityReason } from '../eligibility-reason';
import {
  ApplicationCollateralItem,
  COLLATERAL_KINDS,
  CollateralKind,
  LoanEligibilityCheckResponse
} from '../loan-eligibility.models';

export interface LoanEligibilityDialogData {
  clientId: number;
  clientName?: string;
  accountNo?: string;
  /** Prefilled from the New Loan Terms step (Part 3): the principal entered so far. */
  amount?: number;
  /** Collateral entered on this application (Part 3), so the clerk can see it while picking a kind to check. */
  applicationCollateral?: ApplicationCollateralItem[];
}

/**
 * "Check loan eligibility" (fineract-dbug #154; docs/loan-eligibility.md): before an application is made, each
 * rule with a plain reason and, when only time is in the way, the date the member becomes eligible. Opened from
 * the member's page and, prefilled, from the New Loan Preview step.
 */
@Component({
  selector: 'mifosx-loan-eligibility-dialog',
  templateUrl: './loan-eligibility-dialog.component.html',
  styleUrls: ['./loan-eligibility-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon,
    MatTooltip,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanEligibilityDialogComponent {
  readonly data = inject<LoanEligibilityDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<LoanEligibilityDialogComponent>);
  private service = inject(LoanEligibilityService);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly collateralKinds = COLLATERAL_KINDS;
  readonly checking = signal(false);
  readonly response = signal<LoanEligibilityCheckResponse | null>(null);
  readonly reasonFn = eligibilityReason;
  readonly grouped = grouped;

  /** A starting guess for the Collateral kind from "Collateral on this application" (Part 3), shown as a hint
   * next to the matched item too - see `guessCollateralKind()`. */
  readonly matchedCollateralKind = this.guessCollateralKind();

  readonly form = inject(FormBuilder).group({
    amount: [
      this.data.amount ?? null,
      [
        Validators.required,
        Validators.min(0.01)
      ]
    ],
    collateral: [
      (this.data.applicationCollateral?.length ? this.matchedCollateralKind : 'NONE') as CollateralKind | null,
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
        clientId: this.data.clientId,
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

  close(): void {
    this.ref.close();
  }

  /**
   * A starting guess for the Collateral kind from "Collateral on this application" (Part 3): only when there's
   * exactly one item and its name clearly says gold/silver or a deposit - the clerk can still change it. Land is
   * deliberately left unguessed (city vs. elsewhere can't be told from a name alone), matching why this screen
   * doesn't try to work out every kind on its own.
   */
  private guessCollateralKind(): CollateralKind | null {
    const items = this.data.applicationCollateral;
    if (items?.length !== 1) {
      return null;
    }
    const name = items[0].name.toLowerCase();
    if (name.includes('gold') || name.includes('silver')) {
      return 'GOLD_SILVER';
    }
    if (name.includes('deposit') || name.includes('fd')) {
      return 'DEPOSIT';
    }
    return null;
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
