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
import { MatIcon } from '@angular/material/icon';
import { debounceTime, distinctUntilChanged, filter, switchMap } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MeetingsService } from 'app/governance-register/meetings/meetings.service';
import { Decision } from 'app/governance-register/meetings/meetings.models';

/**
 * Finds and picks a decision recorded in a meeting, by its reference or subject (fineract-dbug #144): the board
 * decision that calls an election, or the general meeting's decision that declares its results. The same search
 * term-dialog.component.ts already runs inline, pulled out here so this screen doesn't repeat it.
 */
@Component({
  selector: 'mifosx-decision-picker',
  template: `
    <mat-form-field class="field" subscriptSizing="dynamic">
      <mat-icon matPrefix>gavel</mat-icon>
      <mat-label>{{ label | translate }}</mat-label>
      <input matInput [formControl]="search" [matAutocomplete]="auto" autocomplete="off" />
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="pick($event.option.value)">
        @for (d of found(); track d.id) {
          <mat-option [value]="d"
            >{{ d.reference }}
            @if (d.subject) {
              · {{ d.subject }}
            }
          </mat-option>
        }
      </mat-autocomplete>
      <mat-hint>{{ 'governanceRegister.committees.typeToSearch' | translate }}</mat-hint>
    </mat-form-field>
    @if (searched() && !found().length && (search.value?.length ?? 0) >= 2) {
      <p class="no-match">
        <mat-icon>search_off</mat-icon>
        <span>{{ 'governanceRegister.committees.NoDecisionMatch' | translate }}</span>
      </p>
    }
  `,
  styles: [
    `
      .field {
        display: block;
        width: 100%;
      }
      .no-match {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: -8px 0 16px;
        color: var(--dk-danger, #c62828);
        font-size: 13px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    `
  ],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatIcon
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DecisionPickerComponent {
  private meetingsService = inject(MeetingsService);

  /** The translation key for the field's label. */
  @Input() label = 'governanceRegister.committees.FindADecision';
  /** Limits the search to one committee's decisions (the board, say); omit for a general meeting's. */
  @Input() committeeId?: number;
  /** Limits the search to GENERAL_MEETING, SUB_COMMITTEE and so on. */
  @Input() body?: string;
  /** Kept to just one meeting's decisions, once it is chosen (client-side: the API has no such filter). */
  @Input() meetingId?: number;
  @Output() readonly picked = new EventEmitter<Decision>();

  readonly search = new FormControl('');
  readonly found = signal<Decision[]>([]);
  readonly searched = signal(false);

  constructor() {
    this.search.valueChanges
      .pipe(
        filter((v): v is string => typeof v === 'string' && v.trim().length >= 2),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((v) => {
          this.searched.set(true);
          return this.meetingsService.decisions(this.body, this.committeeId, undefined, v.trim());
        }),
        takeUntilDestroyed(inject(DestroyRef))
      )
      .subscribe((r) => this.found.set(this.meetingId ? r.filter((d) => d.meetingId === this.meetingId) : r));
  }

  pick(d: Decision): void {
    this.picked.emit(d);
    this.search.setValue('');
    this.found.set([]);
  }
}
