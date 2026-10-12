/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  ElementRef,
  ViewChild,
  AfterViewInit,
  inject,
  DestroyRef,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { take } from 'rxjs';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

/** Custom Services */
import { OrganizationService } from '../../organization.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { MatDialog } from '@angular/material/dialog';
import { PopoverService } from '../../../configuration-wizard/popover/popover.service';
import { ConfigurationWizardService } from '../../../configuration-wizard/configuration-wizard.service';

/** Address fields, reused as-is from the member address form (GH-224: "Address works exactly like the member address"). */
import { MemberAddressFieldsComponent } from 'app/clients/member-address/member-address-fields/member-address-fields.component';
import { NepalLocationService } from 'app/clients/member-address/nepal-location.service';
import { NepalLocationIndex } from 'app/clients/member-address/nepal-location-index';
import {
  createMemberAddressForm,
  MemberAddressForm,
  toMemberAddressRequest
} from 'app/clients/member-address/member-address-form';

/** Custom Dialog Component */
import { ContinueSetupDialogComponent } from '../../../configuration-wizard/continue-setup-dialog/continue-setup-dialog.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { CreateServiceCenterRequest, ServiceCenterApiErrorDetail } from '../service-center.model';

/**
 * Create Service Center component (GH-224).
 */
@Component({
  selector: 'mifosx-create-office',
  templateUrl: './create-office.component.html',
  styleUrls: ['./create-office.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MemberAddressFieldsComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateOfficeComponent implements OnInit, AfterViewInit {
  private formBuilder = inject(FormBuilder);
  private organizationService = inject(OrganizationService);
  private destroyRef = inject(DestroyRef);
  private settingsService = inject(SettingsService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dateUtils = inject(Dates);
  private popoverService = inject(PopoverService);
  private configurationWizardService = inject(ConfigurationWizardService);
  private locationService = inject(NepalLocationService);
  dialog = inject(MatDialog);

  /** Service Center form - everything except the address. */
  officeForm: FormGroup;
  /** Province/District/Local Level/Ward/Tole/House No - the same form shape the member address form uses. */
  addressForm: MemberAddressForm = createMemberAddressForm();
  /** The plain office list, for the Parent Office dropdown (GET /v1/offices, not the service-centers endpoint). */
  officeData: any;
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

  /* Reference of create office form */
  @ViewChild('createOfficeFormRef') createOfficeFormRef: ElementRef<any>;
  /* template for popover on create office form */
  @ViewChild('templateCreateOfficeForm') templateCreateOfficeForm: TemplateRef<any>;

  /**
   * Retrieves the offices data from `resolve`.
   */
  constructor() {
    this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data: { offices: any }) => {
      this.officeData = data.offices;
    });
  }

  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createofficeForm();
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
   * Creates the Office Form
   */
  createofficeForm() {
    this.officeForm = this.formBuilder.group({
      name: [
        '',
        Validators.required
      ],
      code: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Za-z0-9]{2,10}$/)
        ]
      ],
      parentId: [
        '',
        Validators.required
      ],
      openingDate: [
        '',
        Validators.required
      ],
      externalId: [''],
      landline: [''],
      mobile: [
        '',
        Validators.pattern(/^(97|98)\d{8}$/)
      ],
      status: ['ACTIVE'],
      workingArea: ['']
    });
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
   * Submits the service center form and creates it.
   * if successful redirects to the list.
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
    const prevOpeningDate: Date = officeFormData.openingDate;
    if (prevOpeningDate instanceof Date) {
      officeFormData.openingDate = this.dateUtils.formatDate(prevOpeningDate, dateFormat);
    }

    const address = toMemberAddressRequest(this.addressForm);

    const data: CreateServiceCenterRequest = {
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
      .createServiceCenter(data)
      .pipe(take(1))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          if (this.configurationWizardService.showOfficeForm) {
            this.configurationWizardService.showOfficeForm = false;
            this.openDialog();
          } else {
            this.router.navigate(['../'], { relativeTo: this.route });
          }
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
      this.serverError = 'Unable to create service center. Please try again.';
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

  /**
   * Opens dialog if users wants to create more offices.
   */
  openDialog() {
    const continueSetupDialogRef = this.dialog.open(ContinueSetupDialogComponent, {
      data: {
        stepName: 'office'
      }
    });
    continueSetupDialogRef.afterClosed().subscribe((response: { step: number }) => {
      if (response.step === 1) {
        this.configurationWizardService.showOfficeForm = false;
        this.router.navigate(['../'], { relativeTo: this.route });
      } else if (response.step === 2) {
        this.configurationWizardService.showOfficeForm = true;
        this.router.routeReuseStrategy.shouldReuseRoute = () => false;
        this.router.onSameUrlNavigation = 'reload';
        this.router.navigate(['/organization/offices/create']);
      } else if (response.step === 3) {
        this.configurationWizardService.showOfficeForm = false;
        this.configurationWizardService.showAddEditCurrency = true;
        this.router.navigate(['/organization']);
      }
    });
  }

  /**
   * Popover function
   * @param template TemplateRef<any>.
   * @param target HTMLElement | ElementRef<any>.
   * @param position String.
   * @param backdrop Boolean.
   */
  showPopover(
    template: TemplateRef<any>,
    target: HTMLElement | ElementRef<any>,
    position: string,
    backdrop: boolean
  ): void {
    setTimeout(() => this.popoverService.open(template, target, position, backdrop, {}), 200);
  }

  /**
   * To show popover.
   */
  ngAfterViewInit() {
    if (this.configurationWizardService.showOfficeForm) {
      setTimeout(() => {
        this.showPopover(this.templateCreateOfficeForm, this.createOfficeFormRef.nativeElement, 'right', true);
      });
    }
  }

  /**
   * Next Step (Add Edit Currency) Configuration Wizard.
   */
  nextStep() {
    this.configurationWizardService.showOfficeForm = false;
    this.configurationWizardService.showAddEditCurrency = true;
    this.router.navigate(['/organization']);
  }

  /**
   * Previous Step (Manage Offices Page) Configuration Wizard.
   */
  previousStep() {
    this.configurationWizardService.showOfficeForm = false;
    this.configurationWizardService.showOfficeTable = true;
    this.router.navigate(['/organization/offices']);
  }
}
