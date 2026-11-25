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
import { UntypedFormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

/** Custom Dialogs */
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';

/** Custom Services */
import { CentersService } from 'app/centers/centers.service';
import { GroupsService } from 'app/groups/groups.service';
import { MatDialog } from '@angular/material/dialog';
import { MatAutocompleteTrigger, MatAutocomplete, MatOption } from '@angular/material/autocomplete';
import { MatIconButton } from '@angular/material/button';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatListSubheaderCssMatStyler, MatNavList } from '@angular/material/list';
import { MatLine } from '@angular/material/grid-list';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { autocompleteResults, pickedOption } from 'app/shared/utils/autocomplete-search.util';

@Component({
  selector: 'mifosx-manage-groups',
  templateUrl: './manage-groups.component.html',
  styleUrls: ['./manage-groups.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAutocompleteTrigger,
    MatAutocomplete,
    MatIconButton,
    FaIconComponent,
    MatListSubheaderCssMatStyler,
    MatNavList,
    MatLine
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManageGroupsComponent {
  private route = inject(ActivatedRoute);
  private centersService = inject(CentersService);
  private groupsService = inject(GroupsService);
  dialog = inject(MatDialog);
  private cdr = inject(ChangeDetectorRef);

  /** Center Data */
  centerData: any;
  /** Group Members. */
  groupMembers: any[] = [];
  /** GroupChoice. */
  groupChoice = new UntypedFormControl('');
  /** Search results for the typed text; null until a search for it returns. */
  readonly groupsData = toSignal(
    autocompleteResults<any>(this.groupChoice.valueChanges, (text) =>
      this.groupsService.getFilteredGroups('name', 'ASC', text, this.centerData.officeId, 'true')
    ),
    { initialValue: null }
  );

  /**
   * Fetches center action data from `resolve`
   * @param {ActivatedRoute} route Activated Route
   * @param {CentersService} centersService Centers Service
   * @param {GroupsService} groupsService Groups Service
   * @param {MatDialog} dialog Mat Dialog
   */
  constructor() {
    this.route.data.subscribe((data: { centersActionData: any }) => {
      this.centerData = data.centersActionData;
      this.groupMembers = data.centersActionData.groupMembers;
    });
  }

  /** The group picked from the dropdown, or null while the field only holds typed text. */
  get pickedGroup(): any {
    return pickedOption(this.groupChoice.value);
  }

  /**
   * Adds the picked group to the center, once, and clears the field.
   */
  addGroup() {
    const group = this.pickedGroup;
    const members = this.groupMembers ?? [];
    if (!group || members.some((member) => member.id === group.id)) {
      return;
    }
    this.centersService
      .executeCenterActionCommand(this.centerData.id, 'associateGroups', { groupMembers: [group.id] })
      .subscribe(() => {
        this.groupMembers = [
          ...members,
          group
        ];
        this.groupChoice.setValue('');
        this.cdr.markForCheck();
      });
  }

  /**
   * Remove group.
   * @param index Group's array index.
   */
  removeGroup(index: number, group: any) {
    const removeMemberDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `group member: ${group.name}` }
    });
    removeMemberDialogRef.afterClosed().subscribe((response: any) => {
      if (response?.delete) {
        this.centersService
          .executeCenterActionCommand(this.centerData.id, 'disassociateGroups', { groupMembers: [group.id] })
          .subscribe(() => {
            this.groupMembers.splice(index, 1);
            this.cdr.markForCheck();
          });
      }
    });
  }

  /**
   * Displays Group name in form control input.
   * @param {any} group Group data.
   * @returns {string} Group name if valid otherwise undefined.
   */
  displayGroup(group: any): string | undefined {
    return group ? group.name : undefined;
  }
}
