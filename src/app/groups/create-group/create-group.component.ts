/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  UntypedFormGroup,
  UntypedFormBuilder,
  UntypedFormControl,
  Validators,
  ReactiveFormsModule
} from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';

/** Custom Services */
import { GroupsService } from '../groups.service';
import { ClientsService } from '../../clients/clients.service';
import { SettingsService } from 'app/settings/settings.service';
import { Dates } from 'app/core/utils/dates';
import { MatOption, MatAutocompleteTrigger, MatAutocomplete } from '@angular/material/autocomplete';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconButton, MatButton } from '@angular/material/button';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { autocompleteResults, pickedOption } from 'app/shared/utils/autocomplete-search.util';
import { map } from 'rxjs';

/**
 * Create Group component.
 */
@Component({
  selector: 'mifosx-create-group',
  templateUrl: './create-group.component.html',
  styleUrls: ['./create-group.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatIconButton,
    FaIconComponent,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CreateGroupComponent implements OnInit {
  private formBuilder = inject(UntypedFormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientsService = inject(ClientsService);
  private groupService = inject(GroupsService);
  private dateUtils = inject(Dates);
  private settingsService = inject(SettingsService);

  /** Minimum date allowed. */
  minDate = new Date(2000, 0, 1);
  /** Maximum date allowed. */
  maxDate = new Date();
  /** Group form. */
  groupForm: UntypedFormGroup;
  /** Office data. */
  officeData: any;
  /** Staff data. */
  staffData: any;
  /** Client Members. */
  clientMembers: any[] = [];
  /** ClientChoice. */
  clientChoice = new UntypedFormControl('');
  /** Search results for the typed text; null until a search for it returns. */
  readonly clientsData = toSignal(
    autocompleteResults<any>(this.clientChoice.valueChanges, (text) =>
      this.clientsService
        .getFilteredClients('displayName', 'ASC', true, text, this.groupForm.get('officeId').value)
        .pipe(map((data: any) => data.pageItems))
    ),
    { initialValue: null }
  );

  /**
   * Retrieves the offices data from `resolve`.
   * @param {FormBuilder} formBuilder Form Builder.
   * @param {ActivatedRoute} route Activated Route.
   * @param {Router} router Router for navigation.
   * @param {ClientsService} clientsService CentersService.
   * @param {GroupsService} groupService GroupsService.
   * @param {Dates} dateUtils Date Utils to format date.
   * @param {SettingsService} settingsService SettingsService
   */
  constructor() {
    this.route.data.subscribe((data: { offices: any }) => {
      this.officeData = data.offices;
    });
  }

  /**
   * Creates and sets the group form.
   */
  ngOnInit() {
    this.maxDate = this.settingsService.businessDate;
    this.createGroupForm();
  }

  /**
   * Creates the group form.
   */
  createGroupForm() {
    this.groupForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.pattern('(^[A-z]).*')
        ]
      ],
      officeId: [
        '',
        Validators.required
      ],
      submittedOnDate: [
        this.settingsService.businessDate,
        Validators.required
      ],
      staffId: [''],
      externalId: [''],
      active: [false]
    });
    this.buildDependencies();
  }

  /**
   * Sets the staff and clients data each time the user selects a new office.
   * Adds form control Activation Date if active.
   */
  buildDependencies() {
    this.groupForm.get('officeId').valueChanges.subscribe((option: any) => {
      this.groupService.getStaff(option).subscribe((data) => {
        this.staffData = data['staffOptions'];
        if (this.staffData === undefined) {
          this.groupForm.controls['staffId'].disable();
        } else {
          this.groupForm.controls['staffId'].enable();
        }
      });
    });
    this.groupForm.get('active').valueChanges.subscribe((bool: boolean) => {
      if (bool) {
        this.groupForm.addControl('activationDate', new UntypedFormControl('', Validators.required));
      } else {
        this.groupForm.removeControl('activationDate');
      }
    });
  }

  /** The member picked from the dropdown, or null while the field only holds typed text. */
  get pickedClient(): any {
    return pickedOption(this.clientChoice.value);
  }

  /**
   * Adds the picked member, once, and clears the field.
   */
  addClient() {
    const client = this.pickedClient;
    if (!client) {
      return;
    }
    if (!this.clientMembers.some((member) => member.id === client.id)) {
      this.clientMembers.push(client);
    }
    this.clientChoice.setValue('');
  }

  /**
   * Remove client.
   * @param index Client's array index.
   */
  removeClient(index: number) {
    this.clientMembers.splice(index, 1);
  }

  /**
   * Displays Client name in form control input.
   * @param {any} client Client data.
   * @returns {string} Client name if valid otherwise undefined.
   */
  displayClient(client: any): string | undefined {
    return client ? client.displayName : undefined;
  }

  /**
   * Submits the group form and creates group,
   * if successful redirects to groups.
   */
  submit() {
    const groupFormData = this.groupForm.value;
    const locale = this.settingsService.language.code;
    const dateFormat = this.settingsService.dateFormat;
    const submittedOnDate: Date = this.groupForm.value.submittedOnDate;
    const activationDate: Date = this.groupForm.value.activationDate;
    if (groupFormData.submittedOnDate instanceof Date) {
      groupFormData.submittedOnDate = this.dateUtils.formatDate(submittedOnDate, dateFormat);
    }
    if (groupFormData.activationDate instanceof Date) {
      groupFormData.activationDate = this.dateUtils.formatDate(activationDate, dateFormat);
    }
    const data = {
      ...groupFormData,
      dateFormat,
      locale
    };
    data.clientMembers = [];
    this.clientMembers.forEach((client: any) => data.clientMembers.push(client.id));
    this.groupService.createGroup(data).subscribe((response: any) => {
      this.router.navigate([
        '../groups',
        response.resourceId,
        'general'
      ]);
    });
  }
}
