/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateService } from '@ngx-translate/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { KymMemberPickerComponent } from 'app/clients/kym/member-picker/member-picker.component';
import { KymPerson } from 'app/clients/kym/kym.models';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { Pep, PepLink, PepService } from '../pep.service';
import { PepDialogComponent, PepDialogData } from '../pep-dialog/pep-dialog.component';

/** One politically exposed person and the members they expose (fineract-dbug #200, #136). */
@Component({
  selector: 'mifosx-pep-detail',
  templateUrl: './pep-detail.component.html',
  styleUrls: ['./pep-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    AdToBsPipe,
    KymMemberPickerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PepDetailComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private peps = inject(PepService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly pep = signal<Pep | null>(null);
  readonly busy = signal(false);
  /** The member being linked, before the relationship is chosen */
  readonly picked = signal<KymPerson | null>(null);
  readonly relationship = signal('FAMILY');
  readonly detail = signal('');
  readonly current = computed(() => (this.pep()?.links ?? []).filter((l) => !l.endedAt));
  readonly ended = computed(() => (this.pep()?.links ?? []).filter((l) => !!l.endedAt));
  canManage = false;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canManage = this.compliance.can('MANAGE_AMLSCREENING');
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          if (this.allowed()) {
            this.peps.get(Number(p.get('id'))).subscribe((x) => this.pep.set(x));
          }
        });
      });
  }

  edit(): void {
    const p = this.pep();
    if (!p) {
      return;
    }
    this.dialog
      .open<PepDialogComponent, PepDialogData, Pep>(PepDialogComponent, {
        data: { pep: p },
        width: '720px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((x) => x && this.pep.set(x));
  }

  link(): void {
    const p = this.pep();
    const m = this.picked();
    if (!p || !m) {
      return;
    }
    this.busy.set(true);
    this.peps.link(p.id, m.clientId, this.relationship(), this.detail().trim()).subscribe({
      next: (x) => {
        this.pep.set(x);
        this.picked.set(null);
        this.detail.set('');
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }

  endLink(l: PepLink): void {
    const p = this.pep();
    if (!p) {
      return;
    }
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: this.translate.instant('compliance.pep.endLinkTitle', { name: l.name }),
          fields: [
            { name: 'reason', label: 'compliance.risk.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'compliance.risk.End'
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.peps.endLink(p.id, l.id, r.reason).subscribe((x) => this.pep.set(x));
        }
      });
  }
}
