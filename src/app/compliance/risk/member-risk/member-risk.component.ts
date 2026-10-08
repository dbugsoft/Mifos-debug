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
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { Grade } from '../../compliance.models';
import { InputDialogComponent, InputDialogData } from '../../input-dialog/input-dialog.component';
import { RiskService } from '../risk.service';
import { EDD_DECISIONS, Edd, FLAG_KINDS, GRADES, MemberRisk, PepExposure, RiskFlag } from '../risk.models';

/**
 * A member's compliance profile (fineract-dbug #136; design mockup "member compliance profile"): the grade and every
 * reason, the officer's flags, overrides and reviews, the politically exposed persons who expose the member, and
 * enhanced due diligence. Deliberately not a tab of the member page, which tellers use with the member in front of
 * them (no tipping off, policy §35).
 */
@Component({
  selector: 'mifosx-member-risk',
  templateUrl: './member-risk.component.html',
  styleUrls: ['./member-risk.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberRiskComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private risk = inject(RiskService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  clientId = 0;
  readonly allowed = signal<boolean | null>(null);
  readonly busy = signal(false);
  readonly member = signal<MemberRisk | null>(null);
  readonly peps = signal<PepExposure[]>([]);
  readonly edd = signal<Edd[]>([]);
  readonly showEnded = signal(false);

  readonly openEdd = computed(() => this.edd().find((e) => !e.closedOn) ?? null);
  readonly pastEdd = computed(() => this.edd().filter((e) => !!e.closedOn));
  readonly activeFlags = computed(() => (this.member()?.flags ?? []).filter((f) => !f.endedAt));
  readonly endedFlags = computed(() => (this.member()?.flags ?? []).filter((f) => !!f.endedAt));

  canOverride = false;
  canManage = false;

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE'));
        this.canOverride = this.compliance.can('OVERRIDE_RISKGRADE');
        this.canManage = this.compliance.can('MANAGE_AMLCASE');
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
          this.clientId = Number(p.get('clientId'));
          if (this.allowed()) {
            this.load();
          }
        });
      });
  }

  load(): void {
    forkJoin({
      member: this.risk.member(this.clientId),
      peps: this.risk.peps(this.clientId).pipe(catchError(() => of([] as PepExposure[]))),
      edd: this.risk.edd(this.clientId).pipe(catchError(() => of([] as Edd[])))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((d) => {
        this.member.set(d.member);
        this.peps.set(d.peps);
        this.edd.set(d.edd);
      });
  }

  /** The grade options for a select, translated by the dialog. */
  private grades(withComputed = false): { value: string; label: string }[] {
    const out = GRADES.map((g) => ({ value: g as string, label: 'compliance.grade.' + g }));
    return withComputed ? [
          { value: 'COMPUTED', label: 'compliance.risk.Back to the computed grade' },
          ...out
        ] : out;
  }

  private ask(data: InputDialogData): Observable<Record<string, string> | undefined> {
    return this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data,
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed();
  }

  changeGrade(): void {
    const m = this.member();
    if (!m) {
      return;
    }
    this.ask({
      title: 'compliance.risk.Change the grade',
      message: this.translate.instant('compliance.risk.changeLead', {
        grade: this.translate.instant('compliance.grade.' + m.computedGrade)
      }),
      fields: [
        {
          name: 'grade',
          label: 'compliance.risk.Grade',
          type: 'select',
          required: true,
          options: this.grades(!!m.overrideGrade),
          value: m.overrideGrade ?? m.computedGrade
        },
        {
          name: 'reason',
          label: 'compliance.risk.Reason',
          type: 'textarea',
          maxLength: 500,
          hint: 'compliance.risk.reasonToLower'
        }
      ],
      confirm: 'compliance.risk.Save'
    }).subscribe((r) => {
      if (r) {
        const grade = r['grade'] === 'COMPUTED' ? null : (r['grade'] as Grade);
        this.run(this.risk.override(this.clientId, grade, r['reason']));
      }
    });
  }

  review(): void {
    this.ask({
      title: 'compliance.risk.Confirm the grade',
      message: 'compliance.risk.reviewLead',
      fields: [{ name: 'note', label: 'compliance.risk.Note', type: 'textarea', maxLength: 500 }],
      confirm: 'compliance.risk.Confirm'
    }).subscribe((r) => r && this.run(this.risk.review(this.clientId, r['note'])));
  }

  addFlag(): void {
    this.ask({
      title: 'compliance.risk.Add what is known',
      message: 'compliance.risk.flagLead',
      fields: [
        {
          name: 'kind',
          label: 'compliance.risk.What',
          type: 'select',
          required: true,
          options: FLAG_KINDS.map((k) => ({ value: k, label: 'compliance.flag.' + k }))
        },
        {
          name: 'grade',
          label: 'compliance.risk.Grade',
          type: 'select',
          options: this.grades(),
          hint: 'compliance.risk.gradeForOther'
        },
        { name: 'detail', label: 'compliance.risk.Details', type: 'textarea', required: true, maxLength: 500 },
        { name: 'source', label: 'compliance.risk.Source', maxLength: 300, hint: 'compliance.risk.sourceHint' }
      ],
      confirm: 'compliance.risk.Add'
    }).subscribe((r) => {
      if (r) {
        this.run(
          this.risk.addFlag(this.clientId, {
            kind: r['kind'],
            grade: r['kind'] === 'OTHER' ? r['grade'] : undefined,
            detail: r['detail'],
            source: r['source'] || undefined
          })
        );
      }
    });
  }

  endFlag(f: RiskFlag): void {
    this.ask({
      title: this.translate.instant('compliance.risk.endFlagTitle', {
        what: this.translate.instant('compliance.flag.' + f.kind)
      }),
      fields: [{ name: 'reason', label: 'compliance.risk.Reason', type: 'textarea', required: true, maxLength: 500 }],
      confirm: 'compliance.risk.End'
    }).subscribe((r) => r && this.run(this.risk.endFlag(this.clientId, f.id, r['reason'])));
  }

  startEdd(): void {
    this.ask({
      title: 'compliance.edd.Start enhanced checks',
      message: 'compliance.edd.startLead',
      fields: [{ name: 'why', label: 'compliance.edd.Why', type: 'textarea', required: true, maxLength: 500 }],
      confirm: 'compliance.edd.Start'
    }).subscribe((r) => r && this.runEdd(this.risk.openEdd(this.clientId, r['why'])));
  }

  reviewEdd(e: Edd): void {
    this.ask({
      title: 'compliance.edd.Record a review',
      message: 'compliance.edd.reviewLead',
      fields: [
        {
          name: 'sourceOfAssets',
          label: 'compliance.edd.Source of assets',
          type: 'textarea',
          maxLength: 2000,
          value: e.sourceOfAssets ?? '',
          hint: 'compliance.edd.sourceHint'
        },
        { name: 'findings', label: 'compliance.edd.Findings', type: 'textarea', required: true, maxLength: 2000 },
        {
          name: 'decision',
          label: 'compliance.edd.Decision',
          type: 'select',
          required: true,
          options: EDD_DECISIONS.map((d) => ({ value: d, label: 'compliance.edd.decision.' + d })),
          value: 'CONTINUE'
        }
      ],
      confirm: 'compliance.risk.Save'
    }).subscribe((r) => {
      if (r) {
        this.runEdd(
          this.risk.reviewEdd(e.id, {
            sourceOfAssets: r['sourceOfAssets'] || undefined,
            findings: r['findings'],
            decision: r['decision']
          })
        );
      }
    });
  }

  closeEdd(e: Edd): void {
    this.ask({
      title: 'compliance.edd.End enhanced checks',
      message: 'compliance.edd.closeLead',
      fields: [{ name: 'finding', label: 'compliance.edd.Finding', type: 'textarea', required: true, maxLength: 1000 }],
      confirm: 'compliance.risk.End'
    }).subscribe((r) => r && this.runEdd(this.risk.closeEdd(e.id, r['finding'])));
  }

  /** A rule's code in words, or the rule itself. */
  ruleText(rule: string): string {
    const key = 'compliance.rule.' + rule;
    const t = this.translate.instant(key);
    return t && t !== key ? t : rule;
  }

  private run(call: Observable<MemberRisk>): void {
    this.busy.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (m) => {
        this.member.set(m);
        this.busy.set(false);
        // a flag or override can open or end enhanced checks
        this.risk.edd(this.clientId).subscribe((e) => this.edd.set(e));
      },
      error: () => this.busy.set(false)
    });
  }

  private runEdd(call: Observable<Edd[]>): void {
    this.busy.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (e) => {
        this.edd.set(e);
        this.busy.set(false);
        this.risk.member(this.clientId).subscribe((m) => this.member.set(m));
      },
      error: () => this.busy.set(false)
    });
  }
}
