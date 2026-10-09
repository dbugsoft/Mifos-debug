/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  Output,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatAutocomplete, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { KymService } from '../kym.service';
import { KymPerson } from '../kym.models';

/** Find a client of this cooperative by name and pick them: for recommenders, family members here and owners. */
@Component({
  selector: 'mifosx-kym-member-picker',
  template: `
    <mat-form-field class="picker">
      <mat-label>{{ label | translate }}</mat-label>
      <input matInput [formControl]="search" [matAutocomplete]="auto" autocomplete="off" />
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="pick($event.option.value)">
        @for (c of found(); track c.id) {
          <mat-option [value]="c" [disabled]="c.id === exclude">{{ c.displayName }} · {{ c.accountNo }}</mat-option>
        }
      </mat-autocomplete>
      <mat-hint>{{ 'kym.typeToSearch' | translate }}</mat-hint>
    </mat-form-field>
  `,
  styles: [
    `
      .picker {
        width: 100%;
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAutocomplete,
    MatAutocompleteTrigger
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KymMemberPickerComponent {
  private kymService = inject(KymService);

  @Input() label = 'kym.Find a member';
  /** The member whose KYM this is: cannot pick themselves. */
  @Input() exclude: number | null = null;
  @Output() readonly picked = new EventEmitter<KymPerson>();

  readonly search = new FormControl<string | { id: number; displayName: string; accountNo: string }>('');
  readonly found = signal<{ id: number; displayName: string; accountNo: string }[]>([]);

  constructor() {
    this.search.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string' && v.trim().length >= 2),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((v) => this.kymService.searchClients(v.trim())),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((r) => this.found.set(r));
  }

  pick(c: { id: number; displayName: string; accountNo: string }): void {
    this.picked.emit({ clientId: c.id, name: c.displayName, accountNo: c.accountNo });
    this.search.setValue('');
    this.found.set([]);
  }
}
