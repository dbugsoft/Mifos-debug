/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface CoopAuthFeature {
  title: string;
  description: string;
}

@Component({
  selector: 'mifosx-coop-auth-layout',
  standalone: true,
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthLayoutComponent {
  /**
   * Same default logo used by the main Mifos login component.
   */
  logoPath = 'assets/images/debug-bg.png';

  @Input() title = 'Welcome to CoIMS';

  @Input()
  subtitle =
    'Your trusted cooperative banking platform for savings, loans, share management, and seamless financial services.';

  @Input()
  features: CoopAuthFeature[] = [
    {
      title: 'Savings & Deposits',
      description: 'Manage member savings, fixed deposits, and recurring deposits'
    },
    {
      title: 'Loan Management',
      description: 'Process loan applications, disbursements, and repayments'
    },
    {
      title: 'Share Capital',
      description: 'Track member shares, dividends, and equity contributions'
    }
  ];

  onLogoError(): void {
    this.logoPath = 'assets/images/debug-bg.png';
  }
}
