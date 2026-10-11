/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoanProduct } from '../../models/loan-product.model';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { LoanProductSummaryComponent } from '../../common/loan-product-summary/loan-product-summary.component';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { LoanProductBaseComponent } from '../../common/loan-product-base.component';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { exportProductJson, exportProductPdf } from 'app/shared/utils/product-export.util';

@Component({
  selector: 'mifosx-general-tab',
  templateUrl: './general-tab.component.html',
  styleUrls: ['./general-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    LoanProductSummaryComponent,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GeneralTabComponent extends LoanProductBaseComponent implements OnInit {
  private route = inject(ActivatedRoute);

  loanProduct: LoanProduct;
  /** Rendered product summary; the PDF is built from it so it matches the screen. */
  @ViewChild('summary', { read: ElementRef }) summary: ElementRef<HTMLElement>;
  useDueForRepaymentsConfigurations = false;

  constructor() {
    super();
    this.route.data.subscribe((data: { loanProduct: any }) => {
      this.loanProduct = data.loanProduct;
      this.useDueForRepaymentsConfigurations =
        !this.loanProduct.dueDaysForRepaymentEvent && !this.loanProduct.overDueDaysForRepaymentEvent;
    });
  }

  ngOnInit() {
    this.loanProduct.allowAttributeConfiguration = Object.values(this.loanProduct.allowAttributeOverrides).some(
      (attribute: boolean) => attribute
    );
  }

  exportDefinition(): void {
    exportProductJson(this.loanProduct);
  }

  exportPdf(): void {
    exportProductPdf(
      this.summary.nativeElement,
      this.loanProduct.name,
      `${this.getProductTypeLabel(false)} | ${this.loanProduct.shortName}`
    );
  }
}
