/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Accounting } from 'app/core/utils/accounting';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { MatDivider } from '@angular/material/divider';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow
} from '@angular/material/table';
import { ViewSavingsAccountingDetailsComponent } from '../../../../shared/accounting/view-savings-accounting-details/view-savings-accounting-details.component';
import { FormatNumberPipe } from '../../../../pipes/format-number.pipe';
import { YesnoPipe } from '../../../../pipes/yesno.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { TranslateService } from '@ngx-translate/core';
import { exportProductJson, exportProductPdf } from 'app/shared/utils/product-export.util';

@Component({
  selector: 'mifosx-saving-product-general-tab',
  templateUrl: './saving-product-general-tab.component.html',
  styleUrls: ['./saving-product-general-tab.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    FaIconComponent,
    MatDivider,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    ViewSavingsAccountingDetailsComponent,
    FormatNumberPipe,
    YesnoPipe,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SavingProductGeneralTabComponent {
  private route = inject(ActivatedRoute);
  private accounting = inject(Accounting);
  private translateService = inject(TranslateService);

  savingProduct: any;
  /** Rendered product summary; the PDF is built from it so it matches the screen. */
  @ViewChild('summary') summary: ElementRef<HTMLElement>;

  chargesDisplayedColumns: string[] = [
    'name',
    'chargeCalculationType',
    'amount',
    'chargeTimeType'
  ];
  paymentFundSourceDisplayedColumns: string[] = [
    'paymentTypeId',
    'fundSourceAccountId'
  ];
  feesPenaltyIncomeDisplayedColumns: string[] = [
    'chargeId',
    'incomeAccountId'
  ];

  constructor() {
    this.route.data.subscribe((data: { savingProduct: any }) => {
      this.savingProduct = data.savingProduct;
    });
  }

  isCashOrAccrualAccounting(): boolean {
    return this.accounting.isCashOrAccrualAccounting(this.savingProduct.accountingRule);
  }

  isAccrualAccounting(): boolean {
    return this.accounting.isAccrualAccounting(this.savingProduct.accountingRule);
  }

  exportDefinition(): void {
    exportProductJson(this.savingProduct);
  }

  exportPdf(): void {
    exportProductPdf(
      this.summary.nativeElement,
      this.savingProduct.name,
      `${this.translateService.instant('labels.inputs.Savings Product')} | ${this.savingProduct.shortName}`
    );
  }
}
