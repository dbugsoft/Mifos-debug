/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { OfficerService } from './officer.service';

/**
 * The line at the top of every compliance page (fineract-dbug ADR-0064): who works as compliance officer today, so
 * nobody files under the wrong name while someone covers.
 */
@Component({
  selector: 'mifosx-working-as',
  templateUrl: './working-as.component.html',
  styleUrls: ['./working-as.component.scss'],
  imports: [
    RouterLink,
    TranslatePipe,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkingAsComponent implements OnInit {
  readonly officer = inject(OfficerService);

  ngOnInit(): void {
    this.officer.load().subscribe();
  }
}
