/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { NepalLocationService } from 'app/clients/member-address/nepal-location.service';
import { NepalLocationIndex } from 'app/clients/member-address/nepal-location-index';
import { AuthenticationService } from 'app/core/authentication/authentication.service';
import { ComplianceService } from '../../compliance.service';
import { Grade } from '../../compliance.models';
import { AreaRisk, OccupationRisk, PepService } from '../pep.service';

/**
 * The occupation and area tables (fineract-dbug #129, #136; design M5): the grade an occupation or a place gives a
 * member (the tables only raise a grade), and which occupations are political posts (they suggest PEPs).
 */
@Component({
  selector: 'mifosx-risk-tables',
  templateUrl: './risk-tables.component.html',
  styleUrls: ['./risk-tables.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCheckbox,
    MatProgressBar
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RiskTablesComponent implements OnInit {
  private compliance = inject(ComplianceService);
  private peps = inject(PepService);
  private locations = inject(NepalLocationService);
  private authentication = inject(AuthenticationService);
  private destroyRef = inject(DestroyRef);

  readonly allowed = signal<boolean | null>(null);
  readonly busy = signal(false);
  readonly occupations = signal<OccupationRisk[]>([]);
  readonly areas = signal<AreaRisk[]>([]);
  readonly index = signal<NepalLocationIndex | null>(null);
  readonly grades: Grade[] = [
    'HIGH',
    'MEDIUM',
    'NORMAL'
  ];
  readonly regraded = signal<number | null>(null);
  canEdit = false;
  /** Fineract's own permission to read the list of places, needed to pick an area */
  canReadPlaces = false;

  // the area being added
  readonly province = signal<string | null>(null);
  readonly district = signal<string | null>(null);
  readonly localLevel = signal<string | null>(null);
  readonly areaGrade = signal<Grade>('HIGH');
  readonly areaNote = signal('');
  readonly provinces = computed(() => this.index()?.provinces() ?? []);
  readonly districts = computed(() => this.index()?.districts(this.province()) ?? []);
  readonly localLevels = computed(() => this.index()?.localLevels(this.province(), this.district()) ?? []);

  ngOnInit(): void {
    this.compliance
      .loadAccess()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.allowed.set(this.compliance.can('READ_AMLCOMPLIANCE', 'UPDATE_AMLSETTINGS'));
        this.canEdit = this.compliance.can('UPDATE_AMLSETTINGS');
        const held: string[] = this.authentication.getCredentials()?.permissions ?? [];
        this.canReadPlaces = [
          'ALL_FUNCTIONS',
          'ALL_FUNCTIONS_READ',
          'READ_NEPALLOCATION'
        ].some((p) => held.includes(p));
        if (this.allowed()) {
          this.peps.occupations().subscribe((o) => this.occupations.set(o));
          this.peps.areas().subscribe((a) => this.areas.set(a));
          if (this.canEdit && this.canReadPlaces) {
            this.locations.locations().subscribe((i) => this.index.set(i));
          }
        }
      });
  }

  setOccupation(o: OccupationRisk, choice: Grade | '' | null, political: boolean): void {
    const grade = choice || null;
    this.busy.set(true);
    this.peps.setOccupation(o.occupationId, grade, political && grade === 'HIGH', o.note ?? undefined).subscribe({
      next: (rows) => {
        this.occupations.set(rows);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }

  addArea(): void {
    const local = this.localLevel();
    const level = local ? 'LOCAL_LEVEL' : 'DISTRICT';
    const code = local ?? (this.province() ?? '') + (this.district() ?? '');
    this.busy.set(true);
    this.peps.setArea(level, code, this.areaGrade(), this.areaNote().trim()).subscribe({
      next: (rows) => {
        this.areas.set(rows);
        this.district.set(null);
        this.localLevel.set(null);
        this.areaNote.set('');
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }

  removeArea(a: AreaRisk): void {
    this.busy.set(true);
    this.peps.setArea(a.level, a.code, null).subscribe({
      next: (rows) => {
        this.areas.set(rows);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }

  regrade(): void {
    this.busy.set(true);
    this.peps.regradeAll().subscribe({
      next: (r) => {
        this.regraded.set(r.members);
        this.busy.set(false);
      },
      error: () => this.busy.set(false)
    });
  }
}
