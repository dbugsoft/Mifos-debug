/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatTooltip } from '@angular/material/tooltip';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { GovernanceRegisterService } from '../../governance-register.service';
import { Committee, Term, BUILT_IN_COMMITTEE_CODES } from '../../governance-register.models';
import { isoDate } from '../../governance-register.utils';
import { CommitteeDialogComponent, CommitteeDialogData } from '../committee-dialog/committee-dialog.component';
import { TermDialogComponent, TermDialogData } from '../term-dialog/term-dialog.component';
import { EndTermDialogComponent, EndTermDialogData } from '../end-term-dialog/end-term-dialog.component';

/**
 * One committee's own page: who serves on it today (or on any day in the past, with `asOf`), its warnings, and
 * its past members - split out of the Committees list (fineract-dbug #138; docs/governance-register.md) so the
 * list reads as a scannable table instead of one long card per committee.
 */
@Component({
  selector: 'mifosx-committee-detail',
  templateUrl: './committee-detail.component.html',
  styleUrls: ['./committee-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    MatTooltip,
    AdToBsPipe,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommitteeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private governance = inject(GovernanceRegisterService);
  private dialog = inject(MatDialog);

  readonly committee = signal<Committee | null>(null);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly asOf = new FormControl<Date | null>(null);
  readonly today = new Date();
  readonly builtInCodes = BUILT_IN_COMMITTEE_CODES;

  readonly pastMembersOpen = signal(false);
  readonly pastMembersLoading = signal(false);
  readonly pastMembersLoaded = signal(false);
  readonly pastMembers = signal<Term[]>([]);

  private id = 0;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.asOf.valueChanges.subscribe(() => this.load());
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.governance.committee(this.id, isoDate(this.asOf.value) ?? undefined).subscribe({
      next: (c) => {
        this.committee.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      }
    });
  }

  editCommittee(): void {
    const c = this.committee();
    if (!c) {
      return;
    }
    this.dialog
      .open<CommitteeDialogComponent, CommitteeDialogData, Committee>(CommitteeDialogComponent, {
        data: { committee: c },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((saved) => saved && this.load());
  }

  addPerson(): void {
    const c = this.committee();
    if (!c) {
      return;
    }
    this.dialog
      .open<TermDialogComponent, TermDialogData, Term>(TermDialogComponent, {
        data: { committee: c },
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((added) => added && this.load());
  }

  changePosition(t: Term): void {
    const c = this.committee();
    if (!c) {
      return;
    }
    this.dialog
      .open<TermDialogComponent, TermDialogData, Term>(TermDialogComponent, {
        data: { committee: c, changePositionOf: t },
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((changed) => changed && this.load());
  }

  endTerm(t: Term): void {
    this.dialog
      .open<EndTermDialogComponent, EndTermDialogData, Term>(EndTermDialogComponent, {
        data: { term: t },
        width: '520px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((ended) => ended && this.load());
  }

  voidTerm(t: Term): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'governanceRegister.committees.voidTermTitle',
          message: t.personName,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'governanceRegister.committees.MarkAsAMistake',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.governance.voidTerm(t.id, r.reason).subscribe(() => this.load());
        }
      });
  }

  togglePastMembers(): void {
    const open = !this.pastMembersOpen();
    this.pastMembersOpen.set(open);
    if (!open || this.pastMembersLoaded()) {
      return;
    }
    this.pastMembersLoading.set(true);
    this.governance.terms(this.id).subscribe({
      next: (terms) => {
        this.pastMembers.set(terms.filter((t) => !t.current));
        this.pastMembersLoaded.set(true);
        this.pastMembersLoading.set(false);
      },
      error: () => this.pastMembersLoading.set(false)
    });
  }

  committeeLabel(c: Pick<Committee, 'code' | 'name'>): string {
    return this.builtInCodes.includes(c.code) ? `governanceRegister.committee.${c.code}` : c.name;
  }

  /** A two-letter avatar badge from a "First Last" member's name. */
  initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  positionLabel(t: Term): string {
    return t.positionCode.startsWith('OWN_') ? t.positionName : `governanceRegister.position.${t.positionCode}`;
  }
}
