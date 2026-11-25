/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, FormBuilder, UntypedFormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';

/** Custom Dialogs */
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';

/** Custom Services */
import { GroupsService } from 'app/groups/groups.service';
import { ClientsService } from 'app/clients/clients.service';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteTrigger, MatAutocomplete, MatOption } from '@angular/material/autocomplete';
import { MatIconButton } from '@angular/material/button';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatListSubheaderCssMatStyler, MatNavList } from '@angular/material/list';
import { MatLine } from '@angular/material/grid-list';
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { autocompleteResults, pickedOption } from 'app/shared/utils/autocomplete-search.util';
import { map } from 'rxjs';

/**
 * Manage Group Members Component
 */
@Component({
  selector: 'mifosx-manage-group-members',
  templateUrl: './manage-group-members.component.html',
  styleUrls: ['./manage-group-members.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatIconButton,
    FaIconComponent,
    MatListSubheaderCssMatStyler,
    MatNavList,
    MatLine,
    MatTooltip
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageGroupMembersComponent {
  private route = inject(ActivatedRoute);
  private groupsService = inject(GroupsService);
  private clientsService = inject(ClientsService);
  dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  /** Group Data */
  groupData: any;
  /** Client Members. */
  clientMembers: any[] = [];
  /** Client Choice. */
  clientChoice = new UntypedFormControl('');
  /** Search results for the typed text; null until a search for it returns. */
  readonly clientsData = toSignal(
    autocompleteResults<any>(this.clientChoice.valueChanges, (text) =>
      this.clientsService
        .getFilteredClients('displayName', 'ASC', true, text, this.groupData.officeId)
        .pipe(map((data: any) => data.pageItems))
    ),
    { initialValue: null }
  );

  /**
   * Fetches group action data from `resolve`
   * @param {ActivatedRoute} route Activated Route
   * @param {GroupsService} groupsService Groups Service
   * @param {ClientsService} clientsService Clients Service
   * @param {MatDialog} dialog Mat Dialog
   */
  constructor() {
    this.route.data.subscribe((data: { groupActionData: any }) => {
      this.groupData = data.groupActionData;
      this.clientMembers = data.groupActionData.clientMembers || [];
    });
  }

  /** The member picked from the dropdown, or null while the field only holds typed text. */
  get pickedClient(): any {
    return pickedOption(this.clientChoice.value);
  }

  /**
   * Adds the picked member to the group, once, and clears the field.
   */
  addClient() {
    const client = this.pickedClient;
    if (!client || this.clientMembers.some((member) => member.id === client.id)) {
      return;
    }
    this.groupsService
      .executeGroupCommand(this.groupData.id, 'associateClients', { clientMembers: [client.id] })
      .subscribe(() => {
        this.clientMembers = [
          ...this.clientMembers,
          client
        ];
        this.clientChoice.setValue('');
        this.cdr.markForCheck();
      });
  }

  /**
   * Remove client.
   * @param {number} index Client's array index.
   * @param {any} client Client
   */
  removeClient(index: number, client: any) {
    const removeMemberDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `client member: ${client.displayName}` }
    });
    removeMemberDialogRef.afterClosed().subscribe((response: any) => {
      if (response?.delete) {
        this.groupsService
          .executeGroupCommand(this.groupData.id, 'disassociateClients', { clientMembers: [client.id] })
          .subscribe(() => {
            this.clientMembers.splice(index, 1);
            this.cdr.markForCheck();
          });
      }
    });
  }

  /**
   * Displays Client name in form control input.
   * @param {any} client Client data.
   * @returns {string} Client name if valid otherwise undefined.
   */
  displayClient(client: any): string | undefined {
    return client ? client.displayName : undefined;
  }
}
