/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { GovernanceRegisterService } from '../governance-register.service';
import { PropertyDeclarations } from '../governance-register.models';

/** Who, among those who govern the cooperative, has declared their property for a fiscal year (fineract-dbug #138). */
@Component({
  selector: 'mifosx-property-declarations',
  templateUrl: './property-declarations.component.html',
  styleUrls: ['./property-declarations.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PropertyDeclarationsComponent implements OnInit {
  private governance = inject(GovernanceRegisterService);

  readonly table = signal<PropertyDeclarations | null>(null);
  readonly loading = signal(false);
  readonly fiscalYear = new FormControl<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.governance.propertyDeclarations(this.fiscalYear.value ?? undefined).subscribe({
      next: (t) => {
        this.table.set(t);
        this.fiscalYear.setValue(t.fiscalYear, { emitEvent: false });
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
