/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { GovernanceRegisterService } from '../governance-register.service';
import { BUILT_IN_POSITION_CODES, Person, PersonListItem, Term } from '../governance-register.models';
import { PersonDialogComponent, PersonDialogData } from './person-dialog/person-dialog.component';

/** The people register: everyone given a term, whether serving today or not (fineract-dbug #138). */
@Component({
  selector: 'mifosx-governance-people',
  templateUrl: './people.component.html',
  styleUrls: ['./people.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PeopleComponent implements OnInit {
  private governance = inject(GovernanceRegisterService);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  readonly people = signal<PersonListItem[]>([]);
  readonly loading = signal(false);
  readonly search = new FormControl('');
  readonly currentOnly = signal(false);
  readonly servingCount = computed(() => this.people().filter((p) => p.current.length > 0).length);

  ngOnInit(): void {
    this.load();
  }

  toggleCurrent(e: MatCheckboxChange): void {
    this.currentOnly.set(e.checked);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.governance.people(this.search.value ?? '', this.currentOnly() || undefined).subscribe({
      next: (p) => {
        this.people.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  positionLabel(t: Term): string {
    return BUILT_IN_POSITION_CODES.includes(t.positionCode)
      ? `governanceRegister.position.${t.positionCode}`
      : t.positionName;
  }

  open(p: PersonListItem): void {
    this.router.navigate([
      '/governance-register/people',
      p.id
    ]);
  }

  add(): void {
    this.dialog
      .open<PersonDialogComponent, PersonDialogData, Person>(PersonDialogComponent, {
        data: {},
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.router.navigate([
            '/governance-register/people',
            created.id
          ]);
        }
      });
  }
}
