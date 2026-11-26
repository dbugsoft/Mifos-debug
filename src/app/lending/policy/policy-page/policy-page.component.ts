/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatCell,
  MatCellDef,
  MatColumnDef,
  MatHeaderCell,
  MatHeaderCellDef,
  MatHeaderRow,
  MatHeaderRowDef,
  MatRow,
  MatRowDef,
  MatTable
} from '@angular/material/table';
import { MatTab, MatTabGroup } from '@angular/material/tabs';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment';
import { Committee } from 'app/governance-register/governance-register.models';
import { GovernanceRegisterService } from 'app/governance-register/governance-register.service';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanFileService } from '../../files/loan-file.service';
import {
  LendingPolicy,
  LendingPolicyService,
  PolicyArea,
  PolicyBand,
  PolicyDocument,
  PolicyLevel,
  PolicyVersion,
  PolicyView,
  SECURITIES,
  policyChanges
} from '../lending-policy.service';

/** A document, area, line or level code: capitals, digits and _, 2 to 40, starting with a letter. */
const CODE = /^[A-Z][A-Z0-9_]{1,39}$/;

/**
 * Admin › Lending policy (fineract-dbug #327): the policy's dated versions, and a form for a new version that starts
 * from the one in force. Versions are never changed; a new one starts on its date.
 */
@Component({
  selector: 'mifosx-policy-page',
  templateUrl: './policy-page.component.html',
  styleUrls: ['./policy-page.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatSlideToggle,
    MatTabGroup,
    MatTab,
    MatIcon,
    MatTable,
    MatColumnDef,
    MatHeaderCell,
    MatHeaderCellDef,
    MatCell,
    MatCellDef,
    MatHeaderRow,
    MatHeaderRowDef,
    MatRow,
    MatRowDef,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PolicyPageComponent implements OnInit {
  private policies = inject(LendingPolicyService);
  private files = inject(LoanFileService);
  private governance = inject(GovernanceRegisterService);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);

  readonly securities = SECURITIES;
  readonly today = moment().startOf('day').toDate();
  readonly columns = [
    'version',
    'effectiveFrom',
    'note',
    'createdBy',
    'createdAt',
    'status'
  ];
  readonly view = signal<PolicyView | null>(null);
  readonly names = signal(new Map<number, string>());
  readonly committees = signal<Committee[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly editing = signal(false);
  /** The changes against the version in force, once previewed; cleared by any further edit. */
  readonly changes = signal<string[] | null>(null);

  readonly form = this.fb.group({
    effectiveFrom: [
      null as Date | null,
      Validators.required
    ],
    note: [
      '',
      [
        Validators.required,
        Validators.maxLength(500)
      ]
    ],
    fileRequiredForApproval: [false],
    documents: this.fb.array<FormGroup>([]),
    appraisal: this.fb.group({
      requiredFor: [[] as string[]],
      minOwnInvestmentPercent: [
        0,
        this.percent()
      ],
      areas: this.fb.array<FormGroup>([]),
      bands: this.fb.array<FormGroup>([])
    }),
    valuation: this.fb.group({
      marginPercent: [
        0,
        this.percent()
      ],
      tenancyDeductionPercent: [
        0,
        this.percent()
      ],
      registeredValuerFrom: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      holdUpTo: [
        0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ]
    }),
    approval: this.fb.group({
      required: [false],
      recommenderMayApprove: [false],
      insiderLevel: [null as string | null],
      depositManagerLimit: [
        null as number | null,
        Validators.min(0)
      ],
      depositPercent: [
        null as number | null,
        Validators.min(0)
      ],
      levels: this.fb.array<FormGroup>([])
    })
  });

  get documents(): FormArray<FormGroup> {
    return this.form.controls.documents;
  }

  get areas(): FormArray<FormGroup> {
    return this.form.controls.appraisal.controls.areas;
  }

  get bands(): FormArray<FormGroup> {
    return this.form.controls.appraisal.controls.bands;
  }

  get levels(): FormArray<FormGroup> {
    return this.form.controls.approval.controls.levels;
  }

  lines(area: FormGroup): FormArray<FormGroup> {
    return area.get('lines') as FormArray<FormGroup>;
  }

  ngOnInit(): void {
    this.load();
    this.policies
      .userNames()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((names) => this.names.set(names));
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.changes.set(null));
  }

  private load(): void {
    this.loading.set(true);
    this.policies
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (v) => {
          this.view.set(v);
          this.loading.set(false);
        },
        error: () => this.loading.set(false)
      });
  }

  /** Newest first. */
  get versions(): PolicyVersion[] {
    return [...(this.view()?.versions ?? [])].sort((a, b) => b.version - a.version);
  }

  isInForce(v: PolicyVersion): boolean {
    return this.view()?.inForce?.id === v.id;
  }

  isLater(v: PolicyVersion): boolean {
    return moment(v.effectiveFrom).isAfter(this.today);
  }

  date(value: string | null): string {
    return this.files.bsDate(value);
  }

  who(id: number | null): string {
    return id == null ? '—' : (this.names().get(id) ?? `#${id}`);
  }

  // ── The form ──────────────────────────────────────────────────────────

  /** Opens the form filled in from the policy that applies today. */
  startNew(): void {
    const p = this.view().policy;
    this.form.reset({
      effectiveFrom: null,
      note: '',
      fileRequiredForApproval: p.fileRequiredForApproval,
      appraisal: {
        requiredFor: p.appraisal.requiredFor,
        minOwnInvestmentPercent: p.appraisal.minOwnInvestmentPercent
      },
      valuation: { ...p.valuation },
      approval: {
        required: !!p.approval.required,
        recommenderMayApprove: !!p.approval.recommenderMayApprove,
        insiderLevel: p.approval.insiderLevel,
        depositManagerLimit: p.approval.depositManagerLimit,
        depositPercent: p.approval.depositPercent
      }
    });
    refill(
      this.documents,
      p.documents.map((d) => this.documentGroup(d, true))
    );
    refill(
      this.areas,
      p.appraisal.areas.map((a) => this.areaGroup(a))
    );
    refill(
      this.bands,
      p.appraisal.bands.map((b) => this.bandGroup(b))
    );
    refill(
      this.levels,
      p.approval.levels.map((l) => this.levelGroup(l))
    );
    this.changes.set(null);
    this.editing.set(true);
    if (!this.committees().length) {
      this.governance
        .committees()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (list) => this.committees.set((list ?? []).filter((c) => c.active)),
          error: () => undefined
        });
    }
  }

  private documentGroup(d: PolicyDocument | null, saved = false): FormGroup {
    return this.fb.group({
      // A saved item keeps its code: the Nepali wording and old files go by it.
      code: [
        { value: d?.code ?? '', disabled: saved },
        [
          Validators.required,
          Validators.pattern(CODE)
        ]
      ],
      label: [
        d?.label ?? '',
        [
          Validators.required,
          Validators.maxLength(200)
        ]
      ],
      appliesTo: [
        d?.appliesTo ?? ['ANY'],
        Validators.required
      ],
      required: [d?.required ?? true]
    });
  }

  private areaGroup(a: PolicyArea | null): FormGroup {
    return this.fb.group({
      code: [
        a?.code ?? '',
        [
          Validators.required,
          Validators.pattern(CODE)
        ]
      ],
      label: [
        a?.label ?? '',
        [
          Validators.required,
          Validators.maxLength(200)
        ]
      ],
      good: [
        a?.good ?? 1,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      ok: [
        a?.ok ?? 0.5,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      weak: [
        a?.weak ?? 0,
        [
          Validators.required,
          Validators.min(0)
        ]
      ],
      lines: this.fb.array((a?.lines ?? []).map((l) => this.lineGroup(l.code, l.label)))
    });
  }

  private lineGroup(code: string, label: string): FormGroup {
    return this.fb.group({
      code: [
        code,
        [
          Validators.required,
          Validators.pattern(CODE)
        ]
      ],
      label: [
        label,
        [
          Validators.required,
          Validators.maxLength(200)
        ]
      ]
    });
  }

  private bandGroup(b: PolicyBand | null): FormGroup {
    return this.fb.group({
      from: [
        b?.from ?? 0,
        this.percent()
      ],
      lendPercentOfCost: [
        b?.lendPercentOfCost ?? null,
        [
          Validators.min(0),
          Validators.max(100)
        ]
      ],
      needsLand: [b?.needsLand ?? false]
    });
  }

  private levelGroup(l: PolicyLevel | null): FormGroup {
    return this.fb.group({
      code: [
        l?.code ?? '',
        [
          Validators.required,
          Validators.pattern(CODE)
        ]
      ],
      label: [
        l?.label ?? '',
        [
          Validators.required,
          Validators.maxLength(200)
        ]
      ],
      upToPercentOfCapital: [
        l?.upToPercentOfCapital ?? 0,
        this.percent()
      ],
      committee: [l?.committee ?? null]
    });
  }

  private percent() {
    return [
      Validators.required,
      Validators.min(0),
      Validators.max(100)
    ];
  }

  addDocument(): void {
    this.documents.push(this.documentGroup(null));
  }

  addArea(): void {
    this.areas.push(this.areaGroup(null));
  }

  /** A new line gets the next free code of its area, which can be changed. */
  addLine(area: FormGroup): void {
    const lines = this.lines(area);
    const prefix = area.get('code').value || 'LINE';
    const taken = new Set(lines.controls.map((l) => l.get('code').value));
    let n = lines.length + 1;
    while (taken.has(`${prefix}_${n}`)) {
      n++;
    }
    lines.push(this.lineGroup(`${prefix}_${n}`, ''));
  }

  addBand(): void {
    this.bands.push(this.bandGroup(null));
  }

  addLevel(): void {
    this.levels.push(this.levelGroup(null));
  }

  remove(list: FormArray, index: number): void {
    list.removeAt(index);
    list.markAsDirty();
  }

  dropDocument(event: CdkDragDrop<unknown>): void {
    const control = this.documents.at(event.previousIndex);
    this.documents.removeAt(event.previousIndex);
    this.documents.insert(event.currentIndex, control);
  }

  /** The level codes, for the insider level. */
  get levelCodes(): { code: string; label: string }[] {
    return (this.levels.getRawValue() as { code: string; label: string }[]).filter((l) => l.code);
  }

  /** The policy as the form has it, in the backend's shape. */
  private toPolicy(): LendingPolicy {
    const v = this.form.getRawValue();
    return {
      fileRequiredForApproval: !!v.fileRequiredForApproval,
      documents: v.documents.map((d) => ({
        code: d.code.trim(),
        label: d.label.trim(),
        appliesTo: d.appliesTo,
        required: !!d.required
      })),
      appraisal: {
        requiredFor: v.appraisal.requiredFor as LendingPolicy['appraisal']['requiredFor'],
        minOwnInvestmentPercent: v.appraisal.minOwnInvestmentPercent,
        areas: v.appraisal.areas.map((a) => ({
          code: a.code.trim(),
          label: a.label.trim(),
          good: a.good,
          ok: a.ok,
          weak: a.weak,
          lines: a.lines.map((l: { code: string; label: string }) => ({ code: l.code.trim(), label: l.label.trim() }))
        })),
        bands: v.appraisal.bands.map((b) => ({
          from: b.from,
          lendPercentOfCost: b.lendPercentOfCost ?? null,
          needsLand: !!b.needsLand
        }))
      },
      valuation: v.valuation,
      approval: {
        required: !!v.approval.required,
        recommenderMayApprove: !!v.approval.recommenderMayApprove,
        insiderLevel: v.approval.insiderLevel ?? null,
        depositManagerLimit: v.approval.depositManagerLimit ?? null,
        depositPercent: v.approval.depositPercent ?? null,
        levels: v.approval.levels.map((l) => ({
          code: l.code.trim(),
          label: l.label.trim(),
          upToPercentOfCapital: l.upToPercentOfCapital,
          committee: l.committee || null
        }))
      }
    };
  }

  /** Lists what the new version changes; an invalid form shows its errors instead. */
  preview(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open(this.translate.instant('lending.policy.fixErrors'), undefined, { duration: 5000 });
      return;
    }
    this.changes.set(policyChanges(this.view().policy, this.toPolicy()));
  }

  save(): void {
    if (this.busy() || this.changes() === null || this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    // A refusal shows the backend's message through the app's error alert; the form stays open to fix it.
    this.policies.save(moment(v.effectiveFrom).format('YYYY-MM-DD'), v.note.trim(), this.toPolicy()).subscribe({
      next: () => {
        this.busy.set(false);
        this.editing.set(false);
        this.snackBar.open(this.translate.instant('lending.policy.saved'), undefined, { duration: 5000 });
        this.load();
      },
      error: () => this.busy.set(false)
    });
  }
}

function refill(list: FormArray<FormGroup>, groups: FormGroup[]): void {
  list.clear({ emitEvent: false });
  groups.forEach((g) => list.push(g, { emitEvent: false }));
}
