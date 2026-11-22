/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { debounceTime, filter, forkJoin, map, of, switchMap } from 'rxjs';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { ComplianceService } from '../compliance.service';
import { AmlSettings, AmlSettingsView, CashClass, PaymentTypeClass, SettingsEffect } from '../compliance.models';
import { NepaliDateInputComponent } from 'app/shared/nepali-date-input/nepali-date-input.component';
import { GoamlSetupComponent } from '../goaml-reports/goaml-setup.component';
import { InputDialogComponent, InputDialogData } from '../input-dialog/input-dialog.component';
import {
  EffectKind,
  Sentence,
  SentenceField,
  SentencePart,
  SETTINGS_SENTENCES,
  SettingsGroup,
  sentenceParts,
  structuringFloor
} from './settings-sentences';

/** The settings each effect count depends on: a change to any of them asks again. */
const EFFECT_KEYS: Record<EffectKind, (keyof AmlSettings)[]> = {
  thresholdReports: [
    'ttrLine',
    'sharesCountAsCash',
    'unknownPaymentCountsAsCash'
  ],
  unusualYearly: ['unusualYearlyLine'],
  sourceOfFunds: ['sourceOfFundsLine']
};

/**
 * One tab of Compliance › Settings (ADR-0063): each setting as the rule it sets, its field inside the sentence, why it
 * exists under it, the model policy's value when it differs, and what a changed number would have done over the last 12
 * months. Saving asks why; the reason is kept with the change. Read-only without UPDATE_AMLSETTINGS.
 */
@Component({
  selector: 'mifosx-settings-group',
  templateUrl: './settings-group.component.html',
  styleUrls: ['./settings-group.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatProgressBar,
    MatSlideToggle,
    MatTableModule,
    AdToBsPipe,
    GoamlSetupComponent,
    NepaliDateInputComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsGroupComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  readonly group = toSignal(inject(ActivatedRoute).data.pipe(map((d) => d['group'] as SettingsGroup)), {
    initialValue: 'REPORT' as SettingsGroup
  });
  readonly sentences = computed(() => SETTINGS_SENTENCES[this.group()] ?? []);
  readonly view = signal<AmlSettingsView | null>(null);
  readonly canEdit = signal(false);
  readonly saving = signal(false);
  readonly effect = signal<SettingsEffect | null>(null);
  /** Each count is shown once, under the first sentence it depends on (the threshold line, not each switch too). */
  readonly effectShownOn = computed(() => {
    const seen = new Set<EffectKind>();
    const ids = new Set<string>();
    for (const s of this.sentences()) {
      if (s.effect && !seen.has(s.effect)) {
        seen.add(s.effect);
        ids.add(s.id);
      }
    }
    return ids;
  });
  /** The form's values as typed, for the lines that follow them (the split deposit floor). */
  readonly typed = signal<Partial<AmlSettings>>({});
  readonly cashClasses: CashClass[] = [
    'CASH',
    'COOP_BANK_CASH',
    'NON_CASH'
  ];
  readonly paymentColumns = [
    'name',
    'cashClass'
  ];

  form: FormGroup = this.fb.group({});
  /** Payment type id to its class, as edited (Reporting tab). */
  classes: Record<number, CashClass | ''> = {};

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(
        switchMap((access) => {
          this.canEdit.set(access.permissions.includes('UPDATE_AMLSETTINGS'));
          return forkJoin([
            this.compliance.settings(),
            this.hasEffects() ? this.compliance.settingsEffect({}) : of(null)
          ]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(
        ([
          v,
          e
        ]) => {
          this.show(v);
          this.effect.set(e);
        }
      );
  }

  private hasEffects(): boolean {
    return this.sentences().some((s) => !!s.effect);
  }

  private show(v: AmlSettingsView): void {
    const controls: Record<string, unknown> = {};
    for (const s of this.sentences()) {
      for (const f of s.fields) {
        const value = v.settings[f.key];
        controls[f.key] = [
          f.kind === 'switch' ? !!value : (value ?? ''),
          this.validators(f)
        ];
      }
    }
    this.form = this.fb.group(controls);
    if (!this.canEdit()) {
      this.form.disable();
    }
    this.typed.set(this.form.getRawValue());
    this.classes = {};
    v.paymentTypes.forEach((t) => (this.classes[t.id] = t.cashClass ?? ''));
    this.view.set(v);
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.typed.set(this.form.getRawValue()));
    if (this.hasEffects()) {
      this.form.valueChanges
        .pipe(
          debounceTime(600),
          map(() => this.effectValues()),
          filter((values): values is Record<string, string | number | boolean> => values !== null),
          switchMap((values) => this.compliance.settingsEffect(values)),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((e) => this.effect.set(e));
    }
  }

  private validators(f: SentenceField): ValidatorFn[] {
    if (f.kind === 'switch' || f.kind === 'text' || f.kind === 'date') {
      return [];
    }
    if (f.kind === 'choice') {
      return [Validators.required];
    }
    return [
      Validators.required,
      Validators.min(f.min ?? 1),
      ...(f.max ? [Validators.max(f.max)] : [])
    ];
  }

  /** The changed settings an effect depends on, or null while one is not a valid value yet. */
  private effectValues(): Record<string, string | number | boolean> | null {
    const values: Record<string, string | number | boolean> = {};
    for (const key of Object.values(EFFECT_KEYS).flat()) {
      const control = this.form.get(key);
      if (!control || !control.dirty) {
        continue;
      }
      if (control.invalid) {
        return null;
      }
      values[key] = control.value;
    }
    return values;
  }

  parts(s: Sentence): SentencePart[] {
    const parts = sentenceParts(this.translate.instant('compliance.settings.sentence.' + s.id), s.fields);
    // a full stop alone after the last field would sit apart from it
    const last = parts[parts.length - 1];
    return last && 'text' in last && /^[\s.।]*$/.test(last.text) ? parts.slice(0, -1) : parts;
  }

  isField(p: SentencePart): p is { field: SentenceField } {
    return 'field' in p;
  }

  /** The model policy's value, when it differs from the setting as typed. */
  policyDiffers(f: SentenceField): boolean {
    const policy = this.view()?.policyDefaults[f.key];
    const now = this.typed()[f.key];
    return policy !== undefined && policy !== null && String(policy) !== String(now ?? '');
  }

  policyValue(f: SentenceField): string {
    const v = this.view()?.policyDefaults[f.key];
    if (f.kind === 'choice') {
      return this.translate.instant('compliance.settings.choice.' + v);
    }
    if (f.kind === 'switch') {
      return this.translate.instant(v ? 'compliance.settings.on' : 'compliance.settings.off');
    }
    if (f.kind === 'amount') {
      return 'Rs ' + Number(v).toLocaleString('en-IN');
    }
    return String(v);
  }

  /** The lowest split deposit watched, from the threshold line and the percent typed. */
  readonly structuringFloor = computed(() => {
    const percent = Number(this.typed().structuringBandPercent);
    const line = Number(this.view()?.settings.ttrLine);
    return percent > 0 && line > 0 ? structuringFloor(line, percent).toLocaleString('en-IN') : null;
  });

  effectOf(kind: EffectKind): { now: number; then: number } | null {
    return this.effect()?.[kind] ?? null;
  }

  setClass(type: PaymentTypeClass, value: CashClass): void {
    this.classes[type.id] = value;
  }

  /** Only what changed is sent, after asking why. */
  save(): void {
    const v = this.view();
    if (!v || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const changes: Record<string, unknown> = {};
    const raw = this.form.getRawValue();
    Object.keys(raw).forEach((k) => {
      const before = (v.settings as unknown as Record<string, unknown>)[k] ?? '';
      // the date field gives a date; the backend takes yyyy-MM-dd
      const after = raw[k] instanceof Date ? isoDay(raw[k]) : (raw[k] ?? '');
      if (String(before) !== String(after)) {
        changes[k] = after === '' ? null : after;
      }
    });
    const paymentClasses = v.paymentTypes
      .filter((t) => this.classes[t.id] && this.classes[t.id] !== (t.cashClass ?? ''))
      .map((t) => ({ paymentTypeId: t.id, cashClass: this.classes[t.id] as CashClass }));
    if (paymentClasses.length) {
      changes['paymentClasses'] = paymentClasses;
    }
    if (!Object.keys(changes).length) {
      this.snackBar.open(this.translate.instant('compliance.Nothing changed'), undefined, { duration: 3000 });
      return;
    }
    const data: InputDialogData = {
      title: 'compliance.settings.Why are these settings changing',
      message: 'compliance.settings.reasonMessage',
      fields: [
        {
          name: 'reason',
          label: 'compliance.settings.Reason',
          type: 'textarea',
          hint: 'compliance.settings.reasonHint',
          required: true,
          maxLength: 500
        }
      ],
      confirm: 'labels.buttons.Save Changes'
    };
    this.dialog
      .open(InputDialogComponent, { data, width: '520px', maxWidth: '95vw' })
      .afterClosed()
      .pipe(
        filter((r): r is Record<string, string> => !!r),
        switchMap((r) => {
          this.saving.set(true);
          return this.compliance.updateSettings({ ...changes, reason: r['reason'] } as never);
        }),
        switchMap(() =>
          forkJoin([
            this.compliance.settings(),
            this.hasEffects() ? this.compliance.settingsEffect({}) : of(null)
          ])
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ([
          fresh,
          e
        ]) => {
          this.saving.set(false);
          this.show(fresh);
          this.effect.set(e);
          this.snackBar.open(this.translate.instant('compliance.Settings saved'), undefined, { duration: 3000 });
        },
        error: () => this.saving.set(false)
      });
  }

  cancel(): void {
    const v = this.view();
    if (v) {
      this.show(v);
      if (this.hasEffects()) {
        this.compliance.settingsEffect({}).subscribe((e) => this.effect.set(e));
      }
    }
  }
}

/** A date as yyyy-MM-dd, by the calendar day it shows (not shifted by the time zone). */
export function isoDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
