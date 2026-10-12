/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject, DestroyRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Dates } from 'app/core/utils/dates';

/** Custom Services */
import { OrganizationService } from 'app/organization/organization.service';
import { SettingsService } from 'app/settings/settings.service';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** Address fields, reused as-is from the member address form (GH-224: "Address works exactly like the member address"). */
import { MemberAddressFieldsComponent } from 'app/clients/member-address/member-address-fields/member-address-fields.component';
import { NepalLocationService } from 'app/clients/member-address/nepal-location.service';
import { NepalLocationIndex } from 'app/clients/member-address/nepal-location-index';
import {
  createMemberAddressForm,
  MemberAddressForm,
  toMemberAddressRequest
} from 'app/clients/member-address/member-address-form';
import { ServiceCenter, ServiceCenterApiErrorDetail, UpdateServiceCenterRequest } from '../service-center.model';

/**
 * Edit Service Center component (GH-224).
 */
@Component({
  selector: 'mifosx-edit-office',
  templateUrl: './edit-office.component.html',
  styleUrls: ['./edit-office.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MemberAddressFieldsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditOfficeComponent implements OnInit {
  private organizationService = inject(OrganizationService);
  private settingsService = inject(SettingsService);
  private formBuilder = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dateUtils = inject(Dates);
  private locationService = inject(NepalLocationService);

  /** Service center detail being edited (GET /nepal/service-centers/{officeId}). */
  officeData: ServiceCenter;
  /** The plain office list, for the Parent Office dropdown - excludes this office itself. */
  officeList: any[] = [];
  /** Service Center form - everything except the address. */
  officeForm: FormGroup;
  /** Province/District/Local Level/Ward/Tole/House No - the same form shape the member address form uses. */
  addressForm: MemberAddressForm = createMemberAddressForm();
  /** Minimum Date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum Date allowed. */
  maxDate = new Date();

  readonly statusOptions: Array<'ACTIVE' | 'INACTIVE'> = [
    'ACTIVE',
    'INACTIVE'
  ];

  /** Nepal's provinces/districts/local levels, for the address fields. */
  readonly locations = signal<NepalLocationIndex | null>(null);
  readonly locationsLoadFailed = signal(false);

  /** A general (non-field-specific) error from the last submit attempt. */
  serverError: string | null = null;

  isSubmitting = false;

  constructor() {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: { officeTemplate: any; offices: any }) => {
        this.officeData = data.officeTemplate;
        this.officeList = (data.offices ?? []).filter((office: any) => office.id !== this.officeData.id);
      });
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createOfficeForm();
    this.loadLocations();
  }

  /**
   * Loads Nepal's provinces/districts/local levels for the address fields.
   */
  loadLocations(): void {
    this.locationsLoadFailed.set(false);
    this.locationService
      .locations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (index) => this.locations.set(index),
        error: () => this.locationsLoadFailed.set(true)
      });
  }

  /**
   * Create Edit Office Form.
   */
  createOfficeForm() {
    const office = this.officeData;
    this.officeForm = this.formBuilder.group({
      name: [
        office.name,
        Validators.required
      ],
      parentId: [
        office.parentId ?? '',
        Validators.required
      ],
      code: [
        office.code ?? '',
        [
          Validators.required,
          Validators.pattern(/^[A-Za-z0-9]{2,10}$/)
        ]
      ],
      status: [office.status ?? 'ACTIVE'],
      openingDate: [
        office.openingDate && new Date(office.openingDate),
        Validators.required
      ],
      externalId: [office.externalId ?? ''],
      landline: [office.landline ?? ''],
      mobile: [
        office.mobile ?? '',
        Validators.pattern(/^(97|98)\d{8}$/)
      ],
      workingArea: [office.workingArea ?? '']
    });

    const address = office.address;
    if (address) {
      this.addressForm.setValue(
        {
          provinceCode: address.provinceCode ?? null,
          districtCode: address.districtKey ?? null,
          localLevelCode: address.localLevelCode ?? null,
          wardNo: address.wardNo ?? null,
          tole: address.tole ?? null,
          houseNumber: address.houseNumber ?? null
        },
        { emitEvent: false }
      );
    }
  }

  /**
   * Upper-cases the Service Center Code as it's typed - the API stores it in capitals.
   */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = input.value.toUpperCase();
    if (input.value !== upper) {
      input.value = upper;
      this.officeForm.get('code')?.setValue(upper, { emitEvent: false });
    }
  }

  /**
   * Submits the edit service center form.
   */
  submit() {
    this.serverError = null;
    if (this.officeForm.invalid || this.addressForm.invalid) {
      this.officeForm.markAllAsTouched();
      this.addressForm.markAllAsTouched();
      return;
    }

    const officeFormData = this.officeForm.getRawValue();
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    const prevOpenedOn: Date = officeFormData.openingDate;
    if (prevOpenedOn instanceof Date) {
      officeFormData.openingDate = this.dateUtils.formatDate(prevOpenedOn, dateFormat);
    }

    const address = toMemberAddressRequest(this.addressForm);

    const data: UpdateServiceCenterRequest = {
      name: officeFormData.name,
      parentId: officeFormData.parentId,
      openingDate: officeFormData.openingDate,
      dateFormat,
      locale,
      externalId: officeFormData.externalId || undefined,
      code: officeFormData.code.toUpperCase(),
      localLevelCode: address.localLevelCode!,
      wardNo: address.wardNo!,
      tole: address.tole ?? undefined,
      houseNumber: address.houseNumber ?? undefined,
      landline: officeFormData.landline || undefined,
      mobile: officeFormData.mobile || undefined,
      status: officeFormData.status,
      workingArea: officeFormData.workingArea || undefined
    };

    this.isSubmitting = true;
    this.organizationService
      .updateServiceCenter(String(this.officeData.id), data)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.router.navigate(['../'], { relativeTo: this.route });
        },
        error: (error) => {
          this.isSubmitting = false;
          this.applyServerErrors(error?.error?.errors);
        }
      });
  }

  /**
   * Attaches each server-side validation error to its field (by `parameterName`); any error that
   * doesn't match a known field is shown as a general banner instead.
   */
  private applyServerErrors(errors: ServiceCenterApiErrorDetail[] | undefined): void {
    if (!errors || errors.length === 0) {
      this.serverError = 'Unable to update service center. Please try again.';
      return;
    }

    const addressParams = new Set([
      'localLevelCode',
      'wardNo',
      'tole',
      'houseNumber'
    ]);
    let generalMessage: string | null = null;

    for (const apiError of errors) {
      const message = apiError.defaultUserMessage || 'This field is invalid.';
      const parameterName = apiError.parameterName;
      const control = parameterName
        ? (this.officeForm.get(parameterName) ??
          (addressParams.has(parameterName) ? this.addressForm.get(parameterName) : null))
        : null;

      if (control) {
        control.setErrors({ server: message });
        control.markAsTouched();
      } else {
        generalMessage = message;
      }
    }

    if (generalMessage) {
      this.serverError = generalMessage;
    }
  }
}
