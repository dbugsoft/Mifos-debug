/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { Pep, PepService, PepStatus, PepSuggestion } from '../pep.service';
import { PepDialogComponent, PepDialogData } from '../pep-dialog/pep-dialog.component';

type View = 'REGISTER' | 'SUGGESTIONS';

/**
 * The register of politically exposed persons and the possible ones to check (fineract-dbug #200, #136): from KYM
 * answers and from political occupations of members and their family members.
 */
@Component({
  selector: 'mifosx-pep-register',
  templateUrl: './pep-register.component.html',
  styleUrls: ['./pep-register.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PepRegisterComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private peps = inject(PepService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly view = signal<View>('REGISTER');
  readonly status = signal<PepStatus | 'ALL'>('ALL');
  readonly search = signal('');
  readonly loading = signal(false);
  readonly register = signal<Pep[]>([]);
  readonly suggestions = signal<PepSuggestion[]>([]);
  canManage = false;

  readonly statuses: (PepStatus | 'ALL')[] = [
    'ALL',
    'IN_OFFICE',
    'LEFT_OFFICE',
    'PAST_RETENTION'
  ];

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canManage = this.compliance.can('MANAGE_AMLSCREENING');
        this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          this.view.set(p.get('view') === 'suggestions' ? 'SUGGESTIONS' : 'REGISTER');
          if (this.allowed()) {
            this.load();
          }
        });
      });
  }

  show(v: View): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { view: v.toLowerCase() }, replaceUrl: true });
  }

  load(): void {
    this.loading.set(true);
    if (this.view() === 'SUGGESTIONS') {
      this.peps.suggestions().subscribe({
        next: (s) => {
          this.suggestions.set(s);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
      return;
    }
    this.peps.list(this.status(), this.search()).subscribe({
      next: (r) => {
        this.register.set(r);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  open(p: Pep): void {
    this.router.navigate([
      '/compliance',
      'peps',
      p.id
    ]);
  }

  add(from?: PepSuggestion): void {
    this.dialog
      .open<PepDialogComponent, PepDialogData, Pep>(PepDialogComponent, {
        data: { suggestion: from },
        width: '720px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((created) => {
        if (created) {
          this.router.navigate([
            '/compliance',
            'peps',
            created.id
          ]);
        }
      });
  }

  dismiss(s: PepSuggestion): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'compliance.pep.Not a politically exposed person',
          message: s.fullName,
          fields: [
            { name: 'reason', label: 'compliance.risk.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'compliance.pep.Dismiss'
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.peps.dismiss(s.suggestionKey, r.reason).subscribe(() => this.load());
        }
      });
  }
}
