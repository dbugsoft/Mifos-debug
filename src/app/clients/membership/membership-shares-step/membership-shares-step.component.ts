/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MatStepperNext, MatStepperPrevious } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { MembershipTemplate, ShareProductOption } from '../membership.models';

/** What the applicant buys, as shown in the step, the preview and the request. */
export interface SharesChoice {
  product: ShareProductOption;
  kitta: number;
  note: string;
  shareAmount: number;
  charges: { name: string; amount: number }[];
  total: number;
}

/**
 * The Shares step of a membership application (fineract-dbug ADR 0023): which share product, how many kitta, and what
 * will be paid when the board approves. Shown in the Create Member form while the share-first rule is on.
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
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipSharesStepComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) template!: MembershipTemplate;

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
    ]
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
      total: shareAmount + charges.reduce((sum, c) => sum + c.amount, 0)
    };
  });
  readonly valid = computed(() => this.status() === 'VALID' && this.choice() !== null);

  ngOnInit(): void {
    const products = this.template.shareProducts;
    const preferred = products.find((p) => p.id === this.template.settings.shareProductId) ?? products[0];
    if (preferred) {
      this.form.patchValue({ shareProductId: preferred.id, kitta: Math.max(1, preferred.minimumShares ?? 1) });
    }
    if (products.length <= 1) {
      this.form.controls.shareProductId.disable();
    }
    this.value.set(this.form.getRawValue());
    this.status.set(this.form.status);
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.value.set(this.form.getRawValue());
      this.form.controls.kitta.updateValueAndValidity({ emitEvent: false });
    });
    this.form.statusChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((s) => this.status.set(s));
  }

  /** The request fields this step contributes. */
  request(): { kitta: number; shareProductId: number; note?: string } | null {
    const choice = this.choice();
    if (!choice) {
      return null;
    }
    return { kitta: choice.kitta, shareProductId: choice.product.id, ...(choice.note ? { note: choice.note } : {}) };
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
