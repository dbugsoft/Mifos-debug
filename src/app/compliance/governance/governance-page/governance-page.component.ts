/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { Observable } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { ComplianceService } from '../../compliance.service';
import { InputDialogComponent, InputDialogData, InputDialogField } from '../../input-dialog/input-dialog.component';
import {
  AUDIENCES,
  BoardReview,
  DECLARATION_ROLES,
  Governance,
  GovernanceService,
  Officer,
  StaffAction
} from '../governance.service';

/**
 * Compliance › Governance (fineract-dbug #205): the compliance officer and the notices of the appointment, the board's
 * six-monthly reviews with the pack of counts they saw, the yearly action plan, self-declarations, recommendations
 * about staff, and training; with what is due at the top.
 */
@Component({
  selector: 'mifosx-governance-page',
  templateUrl: './governance-page.component.html',
  styleUrls: ['../governance.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GovernancePageComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private governance = inject(GovernanceService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly data = signal<Governance | null>(null);
  readonly busy = signal(false);
  readonly review = signal<BoardReview | null>(null);
  readonly planFile = signal<File | null>(null);
  readonly declarationFile = signal<File | null>(null);
  canManage = false;
  canDownload = false;

  readonly officer = computed<Officer | null>(() => (this.data()?.officers ?? []).find((o) => !o.endedOn) ?? null);
  readonly pastOfficers = computed<Officer[]>(() => (this.data()?.officers ?? []).filter((o) => !!o.endedOn));
  readonly packKeys = computed<string[]>(() => Object.keys(this.review()?.pack ?? {}));

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE', 'READ_AMLSUMMARY', 'READ_AMLDECISIONS'));
        this.canManage = this.compliance.can('MANAGE_AMLGOVERNANCE');
        this.canDownload = this.compliance.can('READ_AMLCOMPLIANCE', 'MANAGE_AMLGOVERNANCE');
        if (this.allowed()) {
          this.run(this.governance.governance());
        }
      });
  }

  /** The fiscal year as the screens show it: 2082/83. */
  label(year: number): string {
    return year + '/' + String((year + 1) % 100).padStart(2, '0');
  }

  appoint(): void {
    this.ask(
      'compliance.governance.Record the officer',
      'compliance.governance.officerLead',
      [
        { name: 'name', label: 'compliance.governance.Name', required: true, maxLength: 200 },
        { name: 'phone', label: 'compliance.governance.Phone', maxLength: 50 },
        { name: 'email', label: 'compliance.governance.Email', maxLength: 200 },
        { name: 'appointedOn', label: 'compliance.governance.Appointed on', type: 'date', required: true },
        { name: 'boardDecision', label: 'compliance.governance.Board decision', maxLength: 200 }
      ],
      (v) => this.run(this.governance.appointOfficer(v))
    );
  }

  notified(o: Officer, to: 'FIU' | 'DEPARTMENT'): void {
    this.ask(
      to === 'FIU' ? 'compliance.governance.FIU-Nepal told' : 'compliance.governance.Department told',
      undefined,
      [{ name: 'on', label: 'compliance.governance.On', type: 'date', required: true }],
      (v) => this.run(this.governance.notified(o.id, to, v['on']))
    );
  }

  recordReview(): void {
    this.ask(
      'compliance.governance.Record a board review',
      'compliance.governance.reviewLead',
      [
        { name: 'periodFrom', label: 'compliance.governance.Period from', type: 'date', required: true },
        { name: 'periodTo', label: 'compliance.governance.Period to', type: 'date', required: true },
        { name: 'metOn', label: 'compliance.governance.Met on', type: 'date', required: true },
        { name: 'minuteReference', label: 'compliance.governance.Minute reference', maxLength: 200 },
        { name: 'notes', label: 'compliance.governance.Notes', type: 'textarea', maxLength: 4000 }
      ],
      (v) => {
        this.busy.set(true);
        this.governance.recordReview(v).subscribe({
          next: (r) => {
            this.review.set(r);
            this.run(this.governance.governance());
          },
          error: () => this.busy.set(false)
        });
      }
    );
  }

  showReview(r: BoardReview): void {
    if (this.review()?.id === r.id) {
      this.review.set(null);
      return;
    }
    this.governance.review(r.id).subscribe((x) => this.review.set(x));
  }

  pick(which: 'plan' | 'declaration', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    (which === 'plan' ? this.planFile : this.declarationFile).set(file);
  }

  addPlan(): void {
    const year = new Date().getFullYear() + 56 + (new Date().getMonth() >= 6 ? 1 : 0);
    this.ask(
      'compliance.governance.Add the action plan',
      'compliance.governance.planLead',
      [
        {
          name: 'fiscalYear',
          label: 'compliance.reports.Fiscal year',
          type: 'select',
          required: true,
          value: String(year),
          options: [
            year + 1,
            year,
            year - 1
          ].map((y) => ({ value: String(y), label: this.label(y) }))
        },
        {
          name: 'summary',
          label: 'compliance.governance.What the plan says',
          type: 'textarea',
          required: true,
          maxLength: 4000
        },
        { name: 'approvedOn', label: 'compliance.governance.Approved by the board on', type: 'date' },
        { name: 'boardDecision', label: 'compliance.governance.Board decision', maxLength: 200 }
      ],
      (v) => {
        const file = this.planFile();
        this.run(this.governance.addPlan(v, file), () => this.planFile.set(null));
      }
    );
  }

  addDeclaration(): void {
    this.ask(
      'compliance.governance.Record a declaration',
      'compliance.governance.declarationLead',
      [
        { name: 'personName', label: 'compliance.governance.Name', required: true, maxLength: 200 },
        {
          name: 'role',
          label: 'compliance.governance.Role',
          type: 'select',
          required: true,
          options: DECLARATION_ROLES.map((r) => ({ value: r, label: 'compliance.governance.role.' + r }))
        },
        { name: 'declaredOn', label: 'compliance.governance.Declared on', type: 'date', required: true },
        { name: 'note', label: 'compliance.governance.Notes', type: 'textarea', maxLength: 1000 }
      ],
      (v) => {
        const file = this.declarationFile();
        this.run(this.governance.addDeclaration(v, file), () => this.declarationFile.set(null));
      }
    );
  }

  download(kind: 'plans' | 'declarations', id: number, name: string): void {
    this.governance.document(kind, id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  recommend(): void {
    this.ask(
      'compliance.governance.Recommend action about staff',
      'compliance.governance.recommendLead',
      [
        { name: 'staffName', label: 'compliance.governance.Staff member', required: true, maxLength: 200 },
        {
          name: 'recommendation',
          label: 'compliance.governance.Recommendation',
          type: 'textarea',
          required: true,
          maxLength: 2000
        },
        {
          name: 'recommendedTo',
          label: 'compliance.governance.To',
          type: 'select',
          required: true,
          value: 'CHIEF_EXECUTIVE',
          options: [
            { value: 'CHIEF_EXECUTIVE', label: 'compliance.governance.to.CHIEF_EXECUTIVE' },
            { value: 'BOARD', label: 'compliance.governance.to.BOARD' }
          ]
        },
        { name: 'recommendedOn', label: 'compliance.governance.On', type: 'date', required: true }
      ],
      (v) => this.run(this.governance.addStaffAction(v))
    );
  }

  outcome(a: StaffAction): void {
    this.ask(
      'compliance.governance.Record what was done',
      undefined,
      [
        {
          name: 'outcome',
          label: 'compliance.governance.What was done',
          type: 'textarea',
          required: true,
          maxLength: 2000
        },
        { name: 'outcomeOn', label: 'compliance.governance.On', type: 'date', required: true },
        { name: 'fiuInformedOn', label: 'compliance.governance.FIU-Nepal told on', type: 'date' },
        { name: 'departmentInformedOn', label: 'compliance.governance.Department told on', type: 'date' }
      ],
      (v) => this.run(this.governance.staffActionOutcome(a.id, v))
    );
  }

  addTraining(): void {
    this.ask(
      'compliance.governance.Record training',
      undefined,
      [
        { name: 'heldOn', label: 'compliance.governance.Held on', type: 'date', required: true },
        { name: 'topic', label: 'compliance.governance.Topic', required: true, maxLength: 300 },
        {
          name: 'audience',
          label: 'compliance.governance.Who was trained',
          type: 'select',
          required: true,
          value: 'STAFF',
          options: AUDIENCES.map((a) => ({ value: a, label: 'compliance.governance.audience.' + a }))
        },
        { name: 'attendees', label: 'compliance.governance.How many attended', maxLength: 6 },
        { name: 'attendeeNames', label: 'compliance.governance.Names', type: 'textarea', maxLength: 4000 },
        { name: 'givenBy', label: 'compliance.governance.Given by', maxLength: 200 }
      ],
      (v) => this.run(this.governance.addTraining(v))
    );
  }

  private ask(
    title: string,
    message: string | undefined,
    fields: InputDialogField[],
    then: (v: Record<string, string>) => void
  ): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, Record<string, string>>(InputDialogComponent, {
        data: { title, message, fields, confirm: 'compliance.governance.Record' },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((v) => v && then(v));
  }

  private run(call: Observable<Governance>, after?: () => void): void {
    this.busy.set(true);
    call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (g) => {
        this.data.set(g);
        this.busy.set(false);
        after?.();
      },
      error: () => this.busy.set(false)
    });
  }
}
