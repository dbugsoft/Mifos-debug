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
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { StandingService } from '../standing.service';
import { saveBlob } from '../../elections/elections.utils';
import { Listing } from '../standing.models';
import { BlacklistDialogComponent } from './blacklist-dialog/blacklist-dialog.component';
import { RemoveDialogComponent, RemoveDialogData } from './remove-dialog/remove-dialog.component';

/**
 * The member blacklist (fineract-dbug #144, elections' own candidate check): never deleted, only taken off, or
 * marked as a mistake and kept crossed out. Reusable with a fixed `clientId`, so a member's own page can show just
 * their own entries.
 */
@Component({
  selector: 'mifosx-blacklist',
  templateUrl: './blacklist.component.html',
  styleUrls: ['./blacklist.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    AdToBsPipe,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BlacklistComponent implements OnInit {
  private standing = inject(StandingService);
  private dialog = inject(MatDialog);

  /** Fixed to one member when embedded on their own page; left unset for the Blacklist tab's own "Show all". */
  @Input() clientId: number | null = null;

  /** The member-picker's wrapping element, so the "Find" button beside it can focus its search field. */
  @ViewChild('pickerWrap') pickerWrap?: ElementRef<HTMLElement>;

  readonly listings = signal<Listing[]>([]);
  readonly loading = signal(false);
  readonly filterMember = signal<KymPerson | null>(null);
  readonly today = new Date();

  /** The counts behind the summary tiles, shown only on the register's own "Show all" page. */
  readonly onListCount = computed(() => this.listings().filter((l) => !l.voided && !l.removedOn).length);
  readonly takenOffCount = computed(() => this.listings().filter((l) => !l.voided && !!l.removedOn).length);
  readonly mistakeCount = computed(() => this.listings().filter((l) => l.voided).length);

  ngOnInit(): void {
    if (this.clientId) {
      this.filterMember.set({ clientId: this.clientId, name: '', accountNo: '' });
    }
    this.load();
  }

  pickFilter(p: KymPerson): void {
    this.filterMember.set(p);
    this.load();
  }

  showAll(): void {
    this.filterMember.set(null);
    this.load();
  }

  focusMemberPicker(): void {
    this.pickerWrap?.nativeElement.querySelector('input')?.focus();
  }

  load(): void {
    this.loading.set(true);
    this.standing.blacklist(this.filterMember()?.clientId ?? undefined).subscribe({
      next: (l) => {
        // Newest first (docs/governance-elections.md) - a stable sort by listedOn, so it only reorders if the API
        // ever doesn't, and otherwise keeps the order it returned.
        this.listings.set([...l].sort((a, b) => (a.listedOn < b.listedOn ? 1 : a.listedOn > b.listedOn ? -1 : 0)));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  add(): void {
    this.dialog
      .open<BlacklistDialogComponent, { clientId: number | null }, Listing>(BlacklistDialogComponent, {
        data: { clientId: this.clientId },
        width: '560px',
        maxWidth: '96vw',
        maxHeight: '90vh',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => created && this.load());
  }

  takenOff(l: Listing): void {
    this.dialog
      .open<RemoveDialogComponent, RemoveDialogData, Listing>(RemoveDialogComponent, {
        data: { listing: l },
        width: '420px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.load());
  }

  voidEntry(l: Listing): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'elections.blacklistVoidTitle',
          message: l.name,
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
          this.standing.voidListing(l.id, r.reason).subscribe(() => this.load());
        }
      });
  }

  /** A two-letter avatar badge from a "First Last" member name. */
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

  downloadNotice(l: Listing): void {
    this.standing.listingFile(l.id).subscribe((blob) => saveBlob(blob, l.fileName ?? 'notice'));
  }
}
