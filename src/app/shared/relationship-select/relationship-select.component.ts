/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { HttpClient, HttpParams } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injectable,
  Input,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Observable, shareReplay, startWith } from 'rxjs';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';

/** An entry of GET /nepal/relationships (fineract-dbug ADR-0045, ADR-0046). */
export interface RelationshipOption {
  code: string;
  /** The server's English label; the screens translate by code (relationship.<CODE>) and fall back to it */
  labelEn: string;
  /** The relationship needs a description, e.g. Guardian or Other */
  needsDetail: boolean;
}

/**
 * A relationship in the user's language: the language files hold the words for each code (fineract-dbug ADR-0046);
 * a code they do not know yet shows the server's English label.
 */
export function relationshipLabel(translate: TranslateService, code: string, labelEn?: string | null): string {
  const key = `relationship.${code}`;
  const label = translate.instant(key);
  return label && label !== key ? label : labelEn || code;
}

/**
 * A relationship as shown: the label with any description ("Guardian: uncle"), or, for one typed before the list, the
 * text as it was typed.
 */
export function relationshipText(
  translate: TranslateService,
  code: string | null | undefined,
  detail: string | null | undefined,
  text: string | null | undefined,
  labelEn?: string | null
): string {
  if (!code) {
    return text ?? '';
  }
  const label = relationshipLabel(translate, code, labelEn);
  return detail ? `${label}: ${detail}` : label;
}

/** The list of relationships a person named on a member's record may have, fetched once. */
@Injectable({ providedIn: 'root' })
export class RelatedPersonRelationships {
  private http = inject(HttpClient);
  // an error is not replayed, so the next subscriber asks again
  readonly list$: Observable<RelationshipOption[]> = this.http
    .get<RelationshipOption[]>('/nepal/relationships', { params: new HttpParams().set('use', 'RELATED_PERSON') })
    .pipe(shareReplay(1));
}

/**
 * The relationship dropdown for a person named on a member's record (source of funds, KYM, beneficial owner, PEP
 * link; fineract-dbug #244): the code goes in {@link code}, and for Guardian and Other a description in
 * {@link detail}. Lays its fields out in the parent's grid.
 */
@Component({
  selector: 'mifosx-relationship-select',
  template: `
    <mat-form-field>
      <mat-label>{{ label | translate }}</mat-label>
      <mat-select [formControl]="code" [required]="required">
        @if (!required) {
          <mat-option [value]="null">—</mat-option>
        }
        @for (o of options(); track o.code) {
          <mat-option [value]="o.code">{{ labelOf(o) }}</mat-option>
        }
      </mat-select>
      @if (state() === 'loading') {
        <mat-hint>{{ 'membership.relationshipsLoading' | translate }}</mat-hint>
      } @else if (state() === 'failed') {
        <mat-hint class="failed" role="alert"
          >{{ 'membership.relationshipsFailed' | translate }}
          <button mat-button color="primary" type="button" (click)="load()">
            {{ 'labels.buttons.Retry' | translate }}
          </button></mat-hint
        >
      } @else if (typed && !chosen()) {
        <mat-hint>{{ 'relationshipList.typedBefore' | translate: { text: typed } }}</mat-hint>
      }
      @if (code.hasError('required')) {
        <mat-error>{{ 'relationshipList.required' | translate }}</mat-error>
      }
    </mat-form-field>
    @if (chosen()?.needsDetail) {
      <mat-form-field>
        <mat-label>{{ 'membership.Nature of the relation' | translate }}</mat-label>
        <input matInput [formControl]="detail" maxlength="100" required />
        <mat-hint>{{ 'membership.relationshipDetailHint' | translate }}</mat-hint>
        @if (detail.hasError('required')) {
          <mat-error>{{ 'relationshipList.detailRequired' | translate }}</mat-error>
        }
      </mat-form-field>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      /* in a parent's flex row, share the space; a grid ignores it */
      mat-form-field {
        flex: 1 1 160px;
        min-width: 0;
      }
      .failed {
        color: var(--mat-sys-error, #b3261e);
      }
    `
  ],
  imports: [...STANDALONE_SHARED_IMPORTS],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RelationshipSelectComponent implements OnInit {
  private relationships = inject(RelatedPersonRelationships);
  private translate = inject(TranslateService);
  private destroyRef = inject(DestroyRef);

  @Input({ required: true }) code!: FormControl<string | null>;
  @Input({ required: true }) detail!: FormControl<string | null>;
  @Input() label = 'kym.Relationship';
  @Input() required = false;
  /** The relationship as typed before the list, shown until one is chosen so staff can pick the matching entry */
  @Input() typed: string | null | undefined;

  readonly options = signal<RelationshipOption[]>([]);
  readonly state = signal<'loading' | 'failed' | 'loaded'>('loading');
  private readonly codeValue = signal<string | null>(null);
  readonly chosen = computed(() => this.options().find((o) => o.code === this.codeValue()) ?? null);

  ngOnInit(): void {
    this.load();
    this.code.valueChanges.pipe(startWith(this.code.value), takeUntilDestroyed(this.destroyRef)).subscribe((c) => {
      this.codeValue.set(c);
      // only Guardian and Other keep a description
      if (this.state() === 'loaded' && !this.chosen()?.needsDetail && this.detail.value) {
        this.detail.setValue(null);
      }
    });
  }

  load(): void {
    this.state.set('loading');
    this.relationships.list$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => {
        this.options.set(list);
        this.state.set('loaded');
      },
      error: () => this.state.set('failed')
    });
  }

  labelOf(o: RelationshipOption): string {
    return relationshipLabel(this.translate, o.code, o.labelEn);
  }
}
