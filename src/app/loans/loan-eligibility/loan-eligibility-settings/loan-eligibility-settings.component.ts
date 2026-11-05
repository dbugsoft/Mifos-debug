/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, Validators } from '@angular/forms';
import { ErrorStateMatcher, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { LoanEligibilityService } from '../loan-eligibility.service';
import {
  CollateralIdsByKind,
  CollateralProductOption,
  CollateralTypeOption,
  GlAccountOption,
  LoanEligibilityDefaults,
  LoanEligibilitySettings,
  MARKABLE_COLLATERAL_KINDS,
  MarkableCollateralKind,
  SavingsProductOption
} from '../loan-eligibility.models';

type RowKind = MarkableCollateralKind | 'UNMARKED';

/** The number-valued fields of LoanEligibilityDefaults - the only ones a "Policy: X" hint makes sense for. */
type NumericDefaultsKey = {
  [K in keyof LoanEligibilityDefaults]: LoanEligibilityDefaults[K] extends number ? K : never;
}[keyof LoanEligibilityDefaults];

/**
 * The cooperative's loan eligibility rules (fineract-dbug #154; docs/loan-eligibility.md): switched off by
 * default, until someone here switches them on and sets their numbers. Copies the structure of
 * MembershipSettingsComponent.
 */
@Component({
  selector: 'mifosx-loan-eligibility-settings',
  templateUrl: './loan-eligibility-settings.component.html',
  styleUrls: ['./loan-eligibility-settings.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    MatSlideToggle
  ],
  // Shows a field's red invalid state (e.g. grace days 91, over the max of 90) as soon as it's dirty, instead of
  // Material's default of waiting for blur or a submit attempt.
  providers: [{ provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher }],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoanEligibilitySettingsComponent implements OnInit {
  private service = inject(LoanEligibilityService);
  private authenticationService = inject(AuthenticationService);
  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly resettingToDefault = signal(false);
  readonly defaults = signal<LoanEligibilityDefaults | null>(null);
  readonly glAccountOptions = signal<GlAccountOption[]>([]);
  readonly savingsProductOptions = signal<SavingsProductOption[]>([]);
  readonly collateralProductOptions = signal<CollateralProductOption[]>([]);
  readonly collateralTypeOptions = signal<CollateralTypeOption[]>([]);
  private readonly productKind = signal<Record<number, RowKind>>({});
  private readonly typeKind = signal<Record<number, RowKind>>({});

  readonly markableKinds = MARKABLE_COLLATERAL_KINDS;

  readonly canUpdate = [
    'ALL_FUNCTIONS',
    'UPDATE_LOANELIGIBILITY'
  ].some((p) => (this.authenticationService.getCredentials()?.permissions ?? []).includes(p));

  readonly form = this.formBuilder.group({
    enabled: [false],
    membershipMonths: [
      3,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(600)
      ]
    ],
    unsecuredMembershipMonths: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(600)
      ]
    ],
    kymRequired: [false],
    noOverdueLoans: [true],
    overdueGraceDays: [
      0,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(90)
      ]
    ],
    singleMemberPercent: [
      15,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]
    ],
    savingsMultiple: [
      5,
      [
        Validators.required,
        Validators.min(0)
      ]
    ],
    unsecuredCap: [
      500000,
      [
        Validators.required,
        Validators.min(0)
      ]
    ],
    guarantorsRequired: [
      2,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(10)
      ]
    ],
    depositPercent: [
      90,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]
    ],
    landPercentCity: [
      60,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]
    ],
    landPercentElsewhere: [
      70,
      [
        Validators.required,
        Validators.min(0),
        Validators.max(100)
      ]
    ],
    capitalGlAccountIds: [[] as number[]],
    regularSavingsProductIds: [[] as number[]]
  });

  ngOnInit(): void {
    this.form.controls.noOverdueLoans.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((on) => this.toggleGraceDays(!!on));
    this.load();
  }

  /** The select's value for one collateral product or type row; 'UNMARKED' when it has no set limit. */
  productKindOf(id: number): RowKind {
    return this.productKind()[id] ?? 'UNMARKED';
  }

  typeKindOf(id: number): RowKind {
    return this.typeKind()[id] ?? 'UNMARKED';
  }

  /**
   * Matches a selected id against an option's id by value rather than strict `===` - a saved id that comes back
   * as a numeric string (`"3"` instead of `3`) would otherwise never match its `<mat-option>`, leaving the
   * mat-select showing its placeholder even though the form control's value is actually set correctly.
   */
  compareIds(a: number | string, b: number | string): boolean {
    return a === b || String(a) === String(b);
  }

  setProductKind(id: number, kind: RowKind): void {
    this.productKind.update((m) => ({ ...m, [id]: kind }));
  }

  setTypeKind(id: number, kind: RowKind): void {
    this.typeKind.update((m) => ({ ...m, [id]: kind }));
  }

  /** The regulator's own value for a rule field, shown beside it the way Compliance shows "Policy: X". */
  policy(key: NumericDefaultsKey): number | undefined {
    return this.defaults()?.[key];
  }

  /** Fills the 13 rule fields from the regulator's defaults; not `enabled`, not the lists. The user still saves. */
  useDefaults(): void {
    const d = this.defaults();
    if (!d || this.resettingToDefault()) {
      return;
    }
    this.form.patchValue({ ...d });
    this.resettingToDefault.set(true);
    setTimeout(() => this.resettingToDefault.set(false), 1000);
  }

  save(): void {
    this.clearServerErrors();
    if (this.form.invalid || this.saving() || !this.canUpdate) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const settings: LoanEligibilitySettings = {
      rules: {
        enabled: !!v.enabled,
        membershipMonths: Number(v.membershipMonths),
        unsecuredMembershipMonths: Number(v.unsecuredMembershipMonths),
        kymRequired: !!v.kymRequired,
        noOverdueLoans: !!v.noOverdueLoans,
        overdueGraceDays: Number(v.overdueGraceDays),
        singleMemberPercent: Number(v.singleMemberPercent),
        savingsMultiple: Number(v.savingsMultiple),
        unsecuredCap: Number(v.unsecuredCap),
        guarantorsRequired: Number(v.guarantorsRequired),
        depositPercent: Number(v.depositPercent),
        landPercentCity: Number(v.landPercentCity),
        landPercentElsewhere: Number(v.landPercentElsewhere)
      },
      capitalGlAccountIds: v.capitalGlAccountIds ?? [],
      regularSavingsProductIds: v.regularSavingsProductIds ?? [],
      collateralProductIds: this.groupByKind(this.collateralProductOptions(), this.productKind()),
      collateralTypeIds: this.groupByKind(this.collateralTypeOptions(), this.typeKind())
    };
    this.service.updateRules(settings).subscribe({
      next: (result) => {
        this.saving.set(false);
        const changed = !!result.changes && Object.keys(result.changes).length > 0;
        this.snackBar.open(
          this.translate.instant(
            changed ? 'loanEligibility.settings.Saved' : 'loanEligibility.settings.Nothing changed'
          ),
          this.translate.instant('labels.buttons.Close'),
          { duration: 3000 }
        );
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.applyServerErrors(e?.error?.errors);
      }
    });
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

  /** Clears a stale `server` error left on a control from a previous save, so it can't linger past this attempt
   * (a disabled control, e.g. overdueGraceDays while noOverdueLoans is off, is skipped by `form.invalid` and so
   * wouldn't otherwise be cleared just by the user editing another field). */
  private clearServerErrors(): void {
    Object.values(this.form.controls).forEach((control) => {
      if (control.hasError('server')) {
        control.updateValueAndValidity({ onlySelf: true, emitEvent: false });
      }
    });
  }

  private groupByKind(items: Array<{ id: number }>, kindOf: Record<number, RowKind>): CollateralIdsByKind {
    const result: CollateralIdsByKind = { DEPOSIT: [], LAND_CITY: [], LAND_ELSEWHERE: [], GOLD_SILVER: [] };
    for (const item of items) {
      const kind = kindOf[item.id];
      if (kind && kind !== 'UNMARKED') {
        result[kind].push(item.id);
      }
    }
    return result;
  }

  private invert(byKind: CollateralIdsByKind): Record<number, RowKind> {
    const result: Record<number, RowKind> = {};
    for (const kind of MARKABLE_COLLATERAL_KINDS) {
      for (const id of byKind[kind] ?? []) {
        result[id] = kind;
      }
    }
    return result;
  }

  private toggleGraceDays(on: boolean): void {
    const control = this.form.controls.overdueGraceDays;
    if (on && this.canUpdate) {
      control.enable({ emitEvent: false });
    } else {
      control.disable({ emitEvent: false });
    }
  }

  private load(): void {
    this.loading.set(true);
    forkJoin([
      this.service.rules(),
      this.service.glAccounts(),
      this.service.savingsProducts(),
      this.service.collateralProducts(),
      this.service.collateralTypes()
    ]).subscribe({
      next: ([
        rulesResponse,
        glAccounts,
        savingsProducts,
        collateralProducts,
        collateralTypes
      ]) => {
        this.loading.set(false);
        this.defaults.set(rulesResponse.defaults);
        this.glAccountOptions.set(glAccounts);
        this.savingsProductOptions.set(savingsProducts);
        this.collateralProductOptions.set(collateralProducts);
        this.collateralTypeOptions.set(collateralTypes);
        const s = rulesResponse.settings;
        this.form.reset({
          ...s.rules,
          capitalGlAccountIds: s.capitalGlAccountIds,
          regularSavingsProductIds: s.regularSavingsProductIds
        });
        this.productKind.set(this.invert(s.collateralProductIds));
        this.typeKind.set(this.invert(s.collateralTypeIds));
        if (this.canUpdate) {
          this.form.enable();
          this.toggleGraceDays(s.rules.noOverdueLoans);
        } else {
          this.form.disable();
        }
      },
      error: () => this.loading.set(false)
    });
  }
}
