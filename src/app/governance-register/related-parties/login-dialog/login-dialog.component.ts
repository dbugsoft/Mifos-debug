/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { UsersService } from 'app/users/users.service';
import { RelatedPartiesService } from '../related-parties.service';
import { PersonParties } from '../related-parties.models';

export interface LoginDialogData {
  person: PersonParties;
}

interface UserOption {
  id: number;
  username: string;
  officeName: string | null;
}

/** Sets which login a person in the register signs in with (fineract-dbug #139: PUT people/{personId}/login). */
@Component({
  selector: 'mifosx-login-dialog',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatDialogModule,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginDialogComponent implements OnInit {
  readonly data = inject<LoginDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<LoginDialogComponent, PersonParties>);
  private relatedParties = inject(RelatedPartiesService);
  private usersService = inject(UsersService);

  readonly busy = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly users = signal<UserOption[]>([]);
  readonly loadingUsers = signal(false);
  readonly usersForbidden = signal(false);
  readonly userId = new FormControl<number | null>(this.data.person.userId);

  ngOnInit(): void {
    this.loadingUsers.set(true);
    this.usersService.getUsers().subscribe({
      next: (u: UserOption[]) => {
        this.users.set(u);
        this.loadingUsers.set(false);
      },
      error: (e) => {
        this.loadingUsers.set(false);
        this.usersForbidden.set(e?.status === 403);
      }
    });
  }

  save(): void {
    this.busy.set(true);
    this.serverError.set(null);
    this.relatedParties.setLogin(this.data.person.personId, this.userId.value).subscribe({
      next: (p) => this.ref.close(p),
      error: (e) => {
        this.busy.set(false);
        this.serverError.set(e?.error?.defaultUserMessage || e?.error?.errors?.[0]?.defaultUserMessage || null);
      }
    });
  }
}
