/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { MembershipApplyRequest, MembershipTemplate, Nominee, ShareProductOption } from '../membership.models';

/** What the applicant buys, as shown in the step, the preview and the request. */
export interface SharesChoice {
  product: ShareProductOption;
  kitta: number;
  note: string;
  shareAmount: number;
  charges: { name: string; amount: number }[];
  total: number;
  /** The money is taken now, with the application */
  paidNow: boolean;
}

/**
 * Who applies: a new person (the Create Member form), a refused person applying again on their record, or an existing
 * application entered afterwards with its original date (administrators only).
 */
export type ApplicationMode = 'new' | 'again' | 'existing';

/**
 * The Membership step of a membership application (fineract-dbug ADR 0023 and 0035): the shares (product, kitta and
 * what they cost), the money when the cooperative takes it with the application, the nominee and a note. The citizenship
 * is asked with the person's details, in the General step. Shown in the Create Member form while the share-first rule is on, and in the dialog for applying
 * again or entering an existing application ({@link embedded}).
 */
@Component({
  selector: 'mifosx-membership-shares-step',
  templateUrl: './membership-shares-step.component.html',
  styleUrls: ['./membership-shares-step.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatStepperNext,
    MatStepperPrevious,
    FaIconComponent,
    FormatNumberPipe,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipSharesStepComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private settingsService = inject(SettingsService);
  private dates = inject(Dates);

  @Input({ required: true }) template!: MembershipTemplate;
  @Input() mode: ApplicationMode = 'new';
  /** In a dialog rather than the stepper: no Previous / Next buttons. */
  @Input() embedded = false;
  /** The person already has a nominee on record. */
  @Input() hasNominee = false;

  readonly today = this.settingsService.businessDate ?? new Date();

  readonly form = this.formBuilder.group({
    shareProductId: [
      null as number | null,
      Validators.required
    ],
    kitta: [
      null as number | null,
      [
        Validators.required,
        (c: AbstractControl) => this.kittaError(c)
      ]
    ],
    note: [
      '',
      Validators.maxLength(1000)
    ],
    nomineeName: [
      '',
      Validators.maxLength(200)
    ],
    nomineeRelationship: [
      '',
      Validators.maxLength(100)
    ],
    nomineeMobileNo: [
      '',
      Validators.maxLength(50)
    ],
    amountReceived: [null as number | null],
    receiptNumber: [
      '',
      Validators.maxLength(50)
    ],
    submittedOn: [null as Date | null]
  });

  private readonly value = signal(this.form.getRawValue());
  private readonly status = signal(this.form.status);

  readonly product = computed(
    () => this.template?.shareProducts.find((p) => p.id === this.value().shareProductId) ?? null
  );
  readonly minimum = computed(() => Math.max(1, this.product()?.minimumShares ?? 1));
  readonly maximum = computed(() => {
    const max = this.product()?.maximumShares;
    return max && max > 0 ? max : null;
  });
  readonly choice = computed<SharesChoice | null>(() => {
    const product = this.product();
    const kitta = Number(this.value().kitta);
    if (!product || !Number.isInteger(kitta) || kitta < 1) {
      return null;
    }
    const shareAmount = kitta * Number(product.unitPrice);
    const charges = product.charges.map((c) => ({ name: c.name, amount: Number(c.amount) }));
    return {
      product,
      kitta,
      note: (this.value().note ?? '').trim(),
      shareAmount,
      charges,
      total: shareAmount + charges.reduce((sum, c) => sum + c.amount, 0),
      paidNow: this.paidNow
    };
  });
  readonly valid = computed(() => this.status() === 'VALID' && this.choice() !== null);

  get paidNow(): boolean {
    return this.template?.settings.paymentTaken === 'AT_APPLICATION';
  }

  get nomineeRequired(): boolean {
    return !!this.template?.settings.nomineeRequired && !this.hasNominee;
  }

  ngOnInit(): void {
    const products = this.template.shareProducts;
    const preferred = products.find((p) => p.id === this.template.settings.shareProductId) ?? products[0];
    if (preferred) {
      this.form.patchValue({ shareProductId: preferred.id, kitta: Math.max(1, preferred.minimumShares ?? 1) });
    }
    if (products.length <= 1) {
      this.form.controls.shareProductId.disable();
    }
    this.setRules();
    this.value.set(this.form.getRawValue());
    this.status.set(this.form.status);
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.value.set(this.form.getRawValue());
      if (this.paidNow) {
        this.fillAmount();
        this.value.set(this.form.getRawValue());
      }
      this.form.controls.kitta.updateValueAndValidity({ emitEvent: false });
      this.form.controls.amountReceived.updateValueAndValidity({ emitEvent: false });
      this.form.controls.nomineeRelationship.updateValueAndValidity({ emitEvent: false });
      this.status.set(this.form.status);
    });
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => this.status.set(s));
  }

  /** The total, put in the amount received when staff have not typed one, so the usual case is one click. */
  fillAmount(): void {
    const total = this.choice()?.total;
    const amount = this.form.controls.amountReceived;
    if (total != null && !amount.dirty && amount.value !== total) {
      amount.setValue(total, { emitEvent: false });
    }
  }

  /** The request fields this step contributes. */
  request(): Omit<
    MembershipApplyRequest,
    'client' | 'clientId' | 'citizenshipNumber' | 'citizenshipDistrictCode'
  > | null {
    const choice = this.choice();
    if (!choice) {
      return null;
    }
    const v = this.form.getRawValue();
    const text = (s: string | null | undefined) => (s ?? '').trim() || undefined;
    const nominee: Nominee | undefined = text(v.nomineeName)
      ? { name: text(v.nomineeName), relationship: text(v.nomineeRelationship), mobileNo: text(v.nomineeMobileNo) }
      : undefined;
    return {
      kitta: choice.kitta,
      shareProductId: choice.product.id,
      note: choice.note || undefined,
      nominee,
      amountReceived: this.paidNow ? Number(v.amountReceived) : undefined,
      receiptNumber: this.paidNow ? text(v.receiptNumber) : undefined,
      submittedOn:
        this.mode === 'existing' && v.submittedOn ? this.dates.formatDate(v.submittedOn, 'yyyy-MM-dd') : undefined
    };
  }

  /** Which fields are required follows the settings and the kind of application. */
  private setRules(): void {
    const c = this.form.controls;
    if (this.nomineeRequired) {
      c.nomineeName.addValidators(Validators.required);
      c.nomineeRelationship.addValidators(Validators.required);
    } else {
      // optional, but a nominee needs both a name and a relationship
      c.nomineeRelationship.addValidators((control) =>
        (this.form?.controls.nomineeName.value ?? '').trim() && !(control.value ?? '').trim()
          ? { required: true }
          : null
      );
    }
    if (this.paidNow) {
      c.amountReceived.addValidators([
        Validators.required,
        this.amountIsTotal()
      ]);
      this.fillAmount();
    }
    if (this.mode === 'existing') {
      c.submittedOn.addValidators(Validators.required);
    }
    Object.values(c).forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  }

  /** The amount received must be the amount due: the shares and the charges. */
  private amountIsTotal(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const total = this.choice()?.total;
      if (control.value === null || control.value === '' || total == null) {
        return null;
      }
      return Math.abs(Number(control.value) - total) < 0.005 ? null : { notTotal: { total } };
    };
  }

  private kittaError(control: AbstractControl): ValidationErrors | null {
    const raw = control.value;
    if (raw === null || raw === '') {
      return null; // "required" says it
    }
    const kitta = Number(raw);
    if (!Number.isInteger(kitta) || kitta < 1) {
      return { atLeastOne: true };
    }
    const product = this.template?.shareProducts.find((p) => p.id === this.form?.getRawValue().shareProductId);
    const min = Math.max(1, product?.minimumShares ?? 1);
    const max = product?.maximumShares && product.maximumShares > 0 ? product.maximumShares : null;
    if (kitta < min) {
      return { belowMinimum: { min } };
    }
    if (max !== null && kitta > max) {
      return { aboveMaximum: { max } };
    }
    return null;
  }
}
