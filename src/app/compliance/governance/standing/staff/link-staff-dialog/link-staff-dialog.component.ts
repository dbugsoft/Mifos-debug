/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { StandingService } from '../../standing.service';
import { Employee } from '../../standing.models';

export interface LinkStaffDialogData {
  employee: Employee;
}

/** Links one staff person to the member they also are (fineract-dbug #144): a member links to one staff at a time. */
@Component({
  selector: 'mifosx-link-staff-dialog',
  templateUrl: './link-staff-dialog.component.html',
  styleUrls: ['./link-staff-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FormsModule,
    MatDialogModule,
    MatIcon,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkStaffDialogComponent {
  readonly data = inject<LinkStaffDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<LinkStaffDialogComponent, Employee>);
  private standing = inject(StandingService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly member = signal<KymPerson | null>(null);

  /** A two-letter avatar badge from a "Last, First" staff name. */
  initials(name: string): string {
    const parts = name
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  save(): void {
    const m = this.member();
    if (!m) {
      return;
    }
    this.busy.set(true);
    this.serverError.set(null);
    this.standing.linkEmployee(this.data.employee.staffId, m.clientId).subscribe({
      next: (e) => this.ref.close(e),
      error: (e2) => {
        this.busy.set(false);
        this.serverError.set(e2?.error?.defaultUserMessage || e2?.error?.errors?.[0]?.defaultUserMessage || null);
      }
    });
  }
}
