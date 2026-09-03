/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { CoopMe, CoopProfileService } from '../services/coop-profile.service';
import { CoopNavbarComponent } from '../coop-navbar/coop-navbar.component';
@Component({
  selector: 'mifosx-coop-me',
  standalone: true,
  imports: [
    CommonModule,
    CoopNavbarComponent
  ],
  templateUrl: './coop-me.component.html',
  styleUrl: './coop-me.component.scss'
})
export class CoopMeComponent implements OnInit {
  private coopProfileService = inject(CoopProfileService);

  private cdr = inject(ChangeDetectorRef);

  me: CoopMe | null = null;

  loading = true;

  errorMessage = '';

  ngOnInit(): void {
    console.log('ME PAGE INIT');

    this.coopProfileService.getMe().subscribe({
      next: (response) => {
        console.log('NEXT FIRED:', response);

        this.me = response;

        this.loading = false;

        console.log('LOADING:', this.loading);
        console.log('ME:', this.me);

        this.cdr.detectChanges();
      },

      error: (error) => {
        console.error('ME ERROR:', error);

        this.loading = false;

        this.errorMessage = error?.error?.message || error?.error?.error || 'Unable to load user information.';

        this.cdr.detectChanges();
      },

      complete: () => {
        console.log('COMPLETE FIRED');
      }
    });
  }
}
