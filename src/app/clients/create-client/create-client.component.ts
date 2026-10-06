/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, map, of, switchMap } from 'rxjs';

/** Custom Services */
import { ClientsService } from '../clients.service';
import { MemberBsDatesService } from '../member-bs-dates.service';

/** Custom Components */
import { ClientGeneralStepComponent } from '../client-stepper/client-general-step/client-general-step.component';
import { ClientFamilyMembersStepComponent } from '../client-stepper/client-family-members-step/client-family-members-step.component';
import { ClientAddressStepComponent } from '../client-stepper/client-address-step/client-address-step.component';
import { ClientDatatableStepComponent } from '../client-stepper/client-datatable-step/client-datatable-step.component';

/** Custom Services */
import { SettingsService } from 'app/settings/settings.service';
import { MatStepper, MatStepperIcon, MatStep, MatStepLabel } from '@angular/material/stepper';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { ClientPreviewStepComponent } from '../client-stepper/client-preview-step/client-preview-step.component';
import { MembershipService } from '../membership/membership.service';
import { MembershipTemplate } from '../membership/membership.models';
import { MembershipSharesStepComponent } from '../membership/membership-shares-step/membership-shares-step.component';
import { MembershipSharesPreviewComponent } from '../membership/membership-shares-step/membership-shares-preview.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MemberAddressStepComponent } from '../member-address/member-address-step/member-address-step.component';
import { MemberAddressPreviewComponent } from '../member-address/member-address-preview/member-address-preview.component';
import { MemberAddressService } from '../member-address/member-address.service';
import { ClientActionNotifierService } from '../clients-view/client-actions/client-action-notifier.service';

/**
 * Create Client Component.
 */
@Component({
  selector: 'mifosx-create-client',
  templateUrl: './create-client.component.html',
  styleUrls: ['./create-client.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatStepper,
    MatStepperIcon,
    FaIconComponent,
    MatStep,
    MatStepLabel,
    ClientGeneralStepComponent,
    ClientAddressStepComponent,
    ClientDatatableStepComponent,
    ClientPreviewStepComponent,
    MemberAddressStepComponent,
    MemberAddressPreviewComponent,
    MembershipSharesStepComponent,
    MembershipSharesPreviewComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateClientComponent implements AfterViewInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientsService = inject(ClientsService);
  private memberBsDates = inject(MemberBsDatesService);
  private membershipService = inject(MembershipService);
  private settingsService = inject(SettingsService);
  private destroyRef = inject(DestroyRef);
  private snackBar = inject(MatSnackBar);
  private cdr = inject(ChangeDetectorRef);
  private memberAddressService = inject(MemberAddressService);
  private notifier = inject(ClientActionNotifierService);

  /** Step labels for toast messages — built dynamically to match the actual rendered steps */
  private get stepLabels(): string[] {
    const labels = [
      'GENERAL',
      'ADDRESS'
    ];
    if (this.clientTemplate?.isAddressEnabled) {
      labels.push('ADDRESS');
    }
    this.datatables.forEach((dt: any) => labels.push(dt.registeredTableName));
    if (this.membershipMode) {
      labels.push('SHARES');
    }
    labels.push('PREVIEW');
    return labels;
  }

  /** Client General Step */
  @ViewChild(ClientGeneralStepComponent, { static: true }) clientGeneralStep: ClientGeneralStepComponent;
  /** Client Family Members Step */
  @ViewChild('clientFamily') clientFamilyMembersStep: ClientFamilyMembersStepComponent;
  /** Client Address Step */
  @ViewChild('clientAddress') clientAddressStep: ClientAddressStepComponent;
  /** Member (Nepal) Address Step, which replaces Fineract's address step (ADR-0014) */
  @ViewChild('memberAddress', { static: true }) memberAddressStep: MemberAddressStepComponent;
  /** Get handle on dtclient tags in the template */
  @ViewChildren('dtclient') clientDatatables: QueryList<ClientDatatableStepComponent>;

  datatables: any = [];
  legalFormType = 1;

  /** Client Template */
  clientTemplate: any;
  /** Client Address Field Config */
  clientAddressFieldConfig: any;
  /** Share products and settings, or null when this user may not read memberships (fineract-dbug ADR 0023) */
  membershipTemplate: MembershipTemplate | null = null;
  /** Shares step, present while the share-first rule is on */
  @ViewChild(MembershipSharesStepComponent) sharesStep: MembershipSharesStepComponent;

  /** With the share-first rule on, a new member is a membership application: a pending client buying shares. */
  get membershipMode(): boolean {
    return !!this.membershipTemplate?.settings.shareFirstEnabled && this.membershipTemplate.shareProducts.length > 0;
  }

  /**
   * Fetches client and address template from `resolve`
   * @param {ActivatedRoute} route Activated Route
   * @param {Router} router Router
   * @param {ClientsService} clientsService Clients Service
   * @param {SettingsService} settingsService Setting service
   */
  constructor() {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (data: {
          clientTemplate: any;
          clientAddressFieldConfig: any;
          membershipTemplate: MembershipTemplate | null;
        }) => {
          this.clientTemplate = data.clientTemplate;
          this.clientAddressFieldConfig = data.clientAddressFieldConfig;
          this.membershipTemplate = data.membershipTemplate ?? null;
          this.setDatatables();
        }
      );
  }

  ngAfterViewInit() {
    this.clientGeneralStep.createClientForm.statusChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());
  }

  /**
   * Retrieves general information about client.
   */
  get clientGeneralForm() {
    return this.clientGeneralStep.createClientForm;
  }

  /**
   * Retrieves the client object
   */
  get client() {
    if (this.clientTemplate.isAddressEnabled) {
      return {
        ...this.clientGeneralStep.clientGeneralDetails,
        ...this.clientFamilyMembersStep?.familyMembers,
        ...this.clientAddressStep.address
      };
    } else {
      return {
        ...this.clientGeneralStep.clientGeneralDetails,
        ...this.clientFamilyMembersStep?.familyMembers
      };
    }
  }

  areFormvalids(): boolean {
    let areValids = this.clientGeneralForm.valid && this.memberAddressStep.valid();
    if (this.membershipMode) {
      areValids = areValids && !!this.sharesStep?.valid();
    }
    if (this.clientTemplate.isAddressEnabled) {
      areValids = areValids && this.clientAddressStep.address.address.length > 0;
    }
    if (this.clientTemplate.datatables && this.clientTemplate.datatables.length > 0 && this.clientDatatables) {
      this.clientDatatables.forEach((clientDatatable: ClientDatatableStepComponent) => {
        areValids = areValids && clientDatatable.datatableForm.valid;
      });
    }

    return areValids;
  }

  setDatatables(): void {
    this.datatables = [];
    let legalFormTypeVal = 'person';
    if (this.legalFormType === 2) {
      legalFormTypeVal = 'entity';
    }
    if (this.clientTemplate.datatables) {
      this.clientTemplate.datatables.forEach((datatable: any) => {
        if (datatable.entitySubType.toLowerCase() === legalFormTypeVal) {
          this.datatables.push(datatable);
        }
      });
    }
  }

  onStepChange(event: any) {
    if (event.selectedIndex <= event.previouslySelectedIndex) return;
    const previousLabel = this.stepLabels[event.previouslySelectedIndex];
    if (previousLabel) {
      this.snackBar.open(`${previousLabel} step completed!`, 'Close', {
        duration: 2000,
        verticalPosition: 'top',
        horizontalPosition: 'right'
      });
    }
  }

  legalFormChange(eventData: { legalForm: number }) {
    this.legalFormType = eventData.legalForm;
    this.setDatatables();
  }

  /**
   * Submits the create client form.
   */
  submit() {
    if (!this.areFormvalids()) return;
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    const clientData = {
      ...this.client,
      dateFormat,
      locale
    };

    if (this.clientTemplate.datatables && this.clientTemplate.datatables.length > 0) {
      const datatables: any[] = [];
      this.clientDatatables.forEach((clientDatatable: ClientDatatableStepComponent) => {
        datatables.push(clientDatatable.payload);
      });
      if (datatables.length > 0) {
        clientData['datatables'] = datatables;
      }
    }

    const addressDraft = this.memberAddressStep.draft();
    const dateOfBirthBs = this.clientGeneralStep.dateOfBirthBs;
    // With the share-first rule on, the member is created through a membership application: a pending client and
    // the shares to buy at approval (fineract-dbug ADR 0023). Everything after the first call is the same.
    const sharesRequest = this.membershipMode ? this.sharesStep?.request() : null;
    const created$ = sharesRequest
      ? this.membershipService
          .apply({ client: clientData, ...sharesRequest })
          .pipe(map((a) => ({ clientId: a.clientId })))
      : this.clientsService.createClient(clientData).pipe(map((response: any) => ({ clientId: response.resourceId })));
    created$
      .pipe(
        switchMap(({ clientId }) => {
          if (!addressDraft) {
            return of({ clientId, addressSaved: true });
          }
          // The member exists at this point; if the address fails, take the user to it rather than lose the member.
          return this.memberAddressService.saveDraft(clientId, addressDraft).pipe(
            map(() => ({ clientId, addressSaved: true })),
            catchError(() => of({ clientId, addressSaved: false }))
          );
        }),
        // Keep the date of birth as typed in BS (fineract-dbug ADR 0020). The AD date is already saved and is what
        // counts, so a failure here never loses the member.
        switchMap((result) =>
          dateOfBirthBs
            ? this.memberBsDates.saveDateOfBirthBs(result.clientId, dateOfBirthBs).pipe(
                map(() => result),
                catchError(() => of(result))
              )
            : of(result)
        )
      )
      .subscribe(({ clientId, addressSaved }) => {
        if (sharesRequest) {
          this.notifier.notify('membership.messages.applicationTaken');
        }
        if (addressSaved && sharesRequest) {
          this.router.navigate(
            [
              '../',
              clientId,
              'membership'
            ],
            { relativeTo: this.route }
          );
        } else if (addressSaved) {
          this.router.navigate(
            [
              '../',
              clientId
            ],
            { relativeTo: this.route }
          );
        } else {
          this.notifier.notify('clients.memberAddress.messages.createdWithoutAddress');
          this.router.navigate(
            [
              '../',
              clientId,
              'address'
            ],
            { relativeTo: this.route }
          );
        }
      });
  }
}
