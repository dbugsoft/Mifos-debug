/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { TranslateService } from '@ngx-translate/core';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { FormatNumberPipe } from 'app/pipes/format-number.pipe';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { AlertDetail, Case, CasesService } from '../cases.service';

/**
 * One alert with what is behind it (fineract-dbug #133, #135; mockup "alert review"): the movements, the member's
 * grade, earlier alerts, the concern. The officer closes it with the reason no report is needed, or takes it into a
 * case.
 */
@Component({
  selector: 'mifosx-alert-detail',
  templateUrl: './alert-detail.component.html',
  styleUrls: ['./alert-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatProgressBar,
    AdToBsPipe,
    FormatNumberPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AlertDetailComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private cases = inject(CasesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly alert = signal<AlertDetail | null>(null);
  readonly openCases = signal<Case[]>([]);
  readonly busy = signal(false);
  canManage = false;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canManage = this.compliance.can('MANAGE_AMLCASE');
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          if (this.allowed()) {
            this.cases.alert(Number(p.get('id'))).subscribe((a) => this.alert.set(a));
            if (this.canManage) {
              this.cases.cases('OPEN').subscribe((c) => this.openCases.set(c));
            }
          }
        });
      });
  }

  get isOpen(): boolean {
    const s = this.alert()?.status;
    return s === 'NEW' || s === 'IN_REVIEW';
  }

  review(): void {
    this.run(this.cases.reviewAlert(this.alert()!.id));
  }

  close(): void {
    this.ask({
      title: 'compliance.alert.Close the alert',
      message: 'compliance.alert.closeLead',
      fields: [{ name: 'reason', label: 'compliance.risk.Reason', type: 'textarea', required: true, maxLength: 1000 }],
      confirm: 'compliance.alert.Close'
    }).subscribe((r) => r && this.run(this.cases.closeAlert(this.alert()!.id, r['reason'])));
  }

  openCase(): void {
    const a = this.alert()!;
    this.ask({
      title: 'compliance.case.Open a case',
      message: 'compliance.case.openLead',
      fields: [
        {
          name: 'summary',
          label: 'compliance.case.Summary',
          type: 'textarea',
          required: true,
          maxLength: 4000,
          value: this.translate.instant('compliance.alert.rule.' + a.rule) + ': ' + a.detail
        }
      ],
      confirm: 'compliance.case.Open'
    }).subscribe((r) => {
      if (r) {
        this.busy.set(true);
        this.cases
          .openCase({
            clientId: a.clientId,
            subjectName: a.clientId ? undefined : (a.concern?.personName ?? undefined),
            summary: r['summary'],
            alertIds: [a.id]
          })
          .subscribe({
            next: (k) =>
              this.router.navigate([
                '/compliance',
                'cases',
                k.id
              ]),
            error: () => this.busy.set(false)
          });
      }
    });
  }

  addToCase(caseId: number): void {
    this.busy.set(true);
    this.cases.addAlerts(caseId, [this.alert()!.id]).subscribe({
      next: () =>
        this.router.navigate([
          '/compliance',
          'cases',
          caseId
        ]),
      error: () => this.busy.set(false)
    });
  }

  private ask(data: InputDialogData) {
    return this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data,
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed();
  }

  private run(call: ReturnType<CasesService['reviewAlert']>): void {
    this.busy.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (a) => {
        this.alert.set(a);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }
}
