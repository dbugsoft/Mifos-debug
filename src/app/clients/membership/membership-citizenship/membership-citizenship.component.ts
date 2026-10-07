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
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepalLocationService } from '../../member-address/nepal-location.service';
import { LocationOption } from '../../member-address/nepal-location-index';
import { injectNepaliFirst } from '../../member-address/nepali-first';

/** A district as the backend stores the citizenship's issuing district: province code and district code together. */
export function issuingDistrictOption(provinceCode: string, district: LocationOption): LocationOption {
  return { ...district, code: provinceCode + district.code };
}

/**
 * The citizenship number and the district that issued it, on a membership application (fineract-dbug ADR 0035). The
 * number is saved as the member's "Citizenship" identifier (their Identities tab) and must not belong to anyone else.
 * Kept apart from the client form so these fields never go into Fineract's own client request.
 */
@Component({
  selector: 'mifosx-membership-citizenship',
  template: `
    <div [formGroup]="form" class="citizenship">
      <mat-form-field class="number">
        <mat-label>{{ 'membership.Citizenship number' | translate }}</mat-label>
        <input matInput formControlName="citizenshipNumber" maxlength="50" required />
        @if (form.controls.citizenshipNumber.hasError('required')) {
          <mat-error>{{ 'membership.errors.citizenshipRequired' | translate }}</mat-error>
        }
      </mat-form-field>
      <mat-form-field class="district">
        <mat-label>{{ 'membership.Issuing district' | translate }}</mat-label>
        <mat-select formControlName="citizenshipDistrictCode" required>
          @for (d of districts(); track d.code) {
            <mat-option [value]="d.code">{{ districtName(d) }}</mat-option>
          }
        </mat-select>
        @if (form.controls.citizenshipDistrictCode.hasError('required')) {
          <mat-error>{{ 'membership.errors.districtRequired' | translate }}</mat-error>
        }
      </mat-form-field>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .citizenship {
        display: flex;
        flex-wrap: wrap;
        gap: 0 2%;
      }
      .number,
      .district {
        flex: 0 0 32%;
        min-width: 0;
      }
      @media (width <= 768px) {
        .number,
        .district {
          flex: 1 1 100%;
        }
      }
    `
  ],
  imports: [...STANDALONE_SHARED_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MembershipCitizenshipComponent implements OnInit {
  private formBuilder = inject(FormBuilder);
  private locationService = inject(NepalLocationService);
  private destroyRef = inject(DestroyRef);
  readonly nepaliFirst = injectNepaliFirst();
  readonly districts = signal<LocationOption[]>([]);

  readonly form = this.formBuilder.group({
    citizenshipNumber: [
      '',
      [
        Validators.required,
        Validators.maxLength(50)
      ]
    ],
    citizenshipDistrictCode: [
      null as string | null,
      Validators.required
    ]
  });

  ngOnInit(): void {
    this.locationService
      .locations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((index) =>
        this.districts.set(
          index
            .provinces()
            // a district code repeats across provinces ("01" is Taplejung, Dolakha and more), so the value is
            // province and district together, "301" for Dolakha (fineract-dbug #209)
            .flatMap((province) => index.districts(province.code).map((d) => issuingDistrictOption(province.code, d)))
            .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'))
        )
      );
  }

  /** The request fields, or null while incomplete. */
  value(): { citizenshipNumber: string; citizenshipDistrictCode: string } | null {
    const v = this.form.getRawValue();
    const number = (v.citizenshipNumber ?? '').trim();
    return this.form.valid && number
      ? { citizenshipNumber: number, citizenshipDistrictCode: v.citizenshipDistrictCode }
      : null;
  }

  /** The chosen district's name, for the preview. */
  districtLabel(): string {
    const d = this.districts().find((x) => x.code === this.form.value.citizenshipDistrictCode);
    return d ? this.districtName(d) : '';
  }

  districtName(d: LocationOption): string {
    return this.nepaliFirst() ? `${d.nameNp} (${d.nameEn})` : `${d.nameEn} (${d.nameNp})`;
  }
}
