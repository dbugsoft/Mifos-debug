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
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import moment from 'moment';
import { NepalLocationService } from 'app/clients/member-address/nepal-location.service';
import { NepalLocationIndex, bilingualName } from 'app/clients/member-address/nepal-location-index';
import { injectNepaliFirst } from 'app/clients/member-address/nepali-first';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { Valuer, ValuersService } from '../../valuers/valuers.service';
import { Appraisal, AppraisalService, Valuation, ValuationInput } from '../appraisal.service';

export interface ValuationDialogData {
  loanId: number;
  /** The valuation to correct; none to add one. */
  valuation?: Valuation;
  registeredValuerNeeded: boolean;
  hold: boolean;
}

/** A district in the picker, with the province it is looked up in. */
interface DistrictOption {
  key: string;
  provinceCode: string;
  code: string;
  nameEn: string;
  nameNp: string;
}

/**
 * Add or correct one property's valuation. The place is picked from Nepal's districts, local levels and wards and
 * saved by its English name, as the backend keeps it as text. Answers the whole appraisal again.
 */
@Component({
  selector: 'mifosx-valuation-dialog',
  templateUrl: './valuation-dialog.component.html',
  styleUrls: ['./valuation-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ValuationDialogComponent implements OnInit {
  readonly data = inject<ValuationDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<ValuationDialogComponent, Appraisal>);
  private fb = inject(FormBuilder);
  private appraisals = inject(AppraisalService);
  private valuersService = inject(ValuersService);
  private locationService = inject(NepalLocationService);
  private destroyRef = inject(DestroyRef);
  private nepaliFirst = injectNepaliFirst();

  readonly editing = !!this.data.valuation;
  readonly today = new Date();
  readonly busy = signal(false);
  readonly valuers = signal<Valuer[]>([]);
  readonly districts = signal<DistrictOption[]>([]);
  readonly localLevels = signal<{ code: string; nameEn: string; nameNp: string }[]>([]);
  readonly wards = signal<number[]>([]);
  private index: NepalLocationIndex | null = null;

  readonly form = this.fb.group({
    ownerName: [
      this.data.valuation?.ownerName ?? '',
      [
        Validators.required,
        Validators.maxLength(200)
      ]
    ],
    district: [null as string | null],
    municipality: [null as string | null],
    ward: [null as number | null],
    plotNo: [
      this.data.valuation?.plotNo ?? '',
      Validators.maxLength(100)
    ],
    area: [
      this.data.valuation?.area ?? '',
      Validators.maxLength(100)
    ],
    description: [
      this.data.valuation?.description ?? '',
      Validators.maxLength(1000)
    ],
    landValue: [
      this.data.valuation?.landValue ?? (null as number | null),
      [
        Validators.required,
        Validators.min(0)
      ]
    ],
    houseValue: [
      this.data.valuation?.houseValue ?? (null as number | null),
      Validators.min(0)
    ],
    tenancyValue: [
      this.data.valuation?.tenancyValue ?? (null as number | null),
      Validators.min(0)
    ],
    valuerId: [
      this.data.valuation?.valuer?.id ?? (null as number | null),
      Validators.required
    ],
    valuedOn: [
      this.data.valuation?.valuedOn ? moment(this.data.valuation.valuedOn).toDate() : (null as Date | null),
      Validators.required
    ]
  });

  ngOnInit(): void {
    // Listen before the places arrive: they may come from the cache at once and fill in a saved place.
    const { district, municipality, ward } = this.form.controls;
    district.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((key) => {
      municipality.reset(null, { emitEvent: false });
      ward.reset(null);
      this.wards.set([]);
      this.localLevels.set(this.levelsOf(key));
    });
    municipality.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((code) => {
      ward.reset(null);
      this.wards.set(this.index?.wards(code) ?? []);
    });

    this.valuersService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((all) => {
        // Loans of this size need a registered valuer listed for this year; keep the saved one so it still shows.
        const savedId = this.data.valuation?.valuer?.id;
        this.valuers.set(
          this.data.registeredValuerNeeded ? all.filter((v) => v.listedThisYear || v.id === savedId) : all
        );
      });

    this.locationService
      .locations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((index) => {
        this.index = index;
        const districts = index
          .provinces()
          .flatMap((p) =>
            index.districts(p.code).map((d) => ({ ...d, key: `${p.code}/${d.code}`, provinceCode: p.code }))
          )
          .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'));
        this.districts.set(districts);
        this.prefillPlace();
      });
  }

  /** A saved place is found again by its names; one that is no longer in the list is left for the user to pick. */
  private prefillPlace(): void {
    const v = this.data.valuation;
    const district = v?.district && this.districts().find((d) => d.nameEn === v.district);
    if (!district) {
      return;
    }
    this.form.controls.district.setValue(district.key);
    const level = this.localLevels().find((l) => l.nameEn === v.municipality);
    if (level) {
      this.form.controls.municipality.setValue(level.code);
      const ward = Number(v.ward);
      if (this.wards().includes(ward)) {
        this.form.controls.ward.setValue(ward);
      }
    }
  }

  private levelsOf(key: string | null) {
    const d = this.districts().find((x) => x.key === key);
    return d && this.index ? this.index.localLevels(d.provinceCode, d.code) : [];
  }

  name(o: { nameEn: string; nameNp: string }): string {
    return bilingualName(o.nameEn, o.nameNp, this.nepaliFirst());
  }

  save(): void {
    if (this.busy()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const district = this.districts().find((d) => d.key === v.district);
    const level = this.localLevels().find((l) => l.code === v.municipality);
    const body: ValuationInput = {
      ownerName: v.ownerName.trim(),
      district: district?.nameEn ?? null,
      municipality: level?.nameEn ?? null,
      ward: v.ward != null ? String(v.ward) : null,
      plotNo: blankToNull(v.plotNo),
      area: blankToNull(v.area),
      description: blankToNull(v.description),
      landValue: v.landValue,
      houseValue: v.houseValue ?? null,
      tenancyValue: v.tenancyValue ?? null,
      valuerId: v.valuerId,
      valuedOn: moment(v.valuedOn).format('YYYY-MM-DD')
    };
    this.busy.set(true);
    const call = this.editing
      ? this.appraisals.updateValuation(this.data.loanId, this.data.valuation.id, body)
      : this.appraisals.addValuation(this.data.loanId, body);
    // A refusal shows the backend's message through the app's error alert; the dialog stays open to fix it.
    call.subscribe({
      next: (appraisal) => this.ref.close(appraisal),
      error: () => this.busy.set(false)
    });
  }
}

function blankToNull(value: string | null | undefined): string | null {
  const text = (value ?? '').trim();
  return text ? text : null;
}
