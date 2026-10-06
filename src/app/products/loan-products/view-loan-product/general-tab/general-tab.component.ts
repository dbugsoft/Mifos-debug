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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/** Brand blue and slate tones used in the PDF export. */
const PDF_ACCENT: [
  number,
  number,
  number
] = [
  16,
  116,
  185
];
const PDF_MUTED: [
  number,
  number,
  number
] = [
  100,
  116,
  139
];
const PDF_TEXT: [
  number,
  number,
  number
] = [
  30,
  41,
  59
];
const PDF_LINE: [
  number,
  number,
  number
] = [
  226,
  232,
  240
];
const PDF_MARGIN = 40;

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
    // Copy so the displayed product keeps its id.
    const { id, ...product } = this.loanProduct;
    const fileName: string = product.name.replace(/\s+/g, '_') + '.json';
    const link = document.createElement('a');
    link.setAttribute(
      'href',
      'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(product, null, 2))
    );
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Exports the product summary as a PDF: one label / value table per section,
   * plus the by-loan-cycle tables as they appear on screen.
   */
  exportPdf(): void {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageHeight = pdf.internal.pageSize.getHeight();
    const clean = (text: string | null) => (text || '').replace(/\s+/g, ' ').trim();
    const nextY = () => (pdf as any).lastAutoTable.finalY + 8;
    let y = 48;
    let rows: string[][] = [];

    pdf
      .setFont('helvetica', 'bold')
      .setFontSize(18)
      .setTextColor(...PDF_TEXT);
    pdf.text(this.loanProduct.name, PDF_MARGIN, y);
    pdf
      .setFont('helvetica', 'normal')
      .setFontSize(10)
      .setTextColor(...PDF_MUTED);
    pdf.text(`${this.getProductTypeLabel(false)} | ${this.loanProduct.shortName}`, PDF_MARGIN, y + 16);
    y += 24;

    const flushRows = () => {
      if (!rows.length) {
        return;
      }
      autoTable(pdf, {
        startY: y,
        body: rows,
        theme: 'plain',
        margin: { left: PDF_MARGIN, right: PDF_MARGIN },
        styles: { fontSize: 9, cellPadding: 4, lineColor: PDF_LINE, lineWidth: { bottom: 0.5 } },
        columnStyles: {
          0: { cellWidth: 200, textColor: PDF_MUTED },
          1: { fontStyle: 'bold', textColor: PDF_TEXT }
        }
      });
      y = nextY();
      rows = [];
    };

    const heading = (text: string, size: number) => {
      flushRows();
      if (y > pageHeight - 80) {
        pdf.addPage();
        y = 32;
      }
      y += size + 8;
      pdf
        .setFont('helvetica', 'bold')
        .setFontSize(size)
        .setTextColor(...PDF_ACCENT);
      pdf.text(text, PDF_MARGIN, y);
      y += 4;
    };

    this.summary.nativeElement.querySelectorAll('h3, h4, table, div').forEach((el: Element) => {
      if (el.tagName === 'TABLE') {
        flushRows();
        autoTable(pdf, {
          html: el as HTMLTableElement,
          startY: y,
          theme: 'grid',
          margin: { left: PDF_MARGIN, right: PDF_MARGIN },
          headStyles: { fillColor: PDF_ACCENT, textColor: 255 },
          styles: { fontSize: 8, lineColor: PDF_LINE }
        });
        y = nextY();
      } else if (el.closest('table')) {
        return;
      } else if (el.tagName === 'H3' || el.tagName === 'H4') {
        heading(clean(el.textContent), el.tagName === 'H3' ? 12 : 10);
      } else {
        const label = el.querySelector(':scope > span.flex-40');
        const value = el.querySelector(':scope > span.flex-60');
        if (label && value) {
          rows.push([
            clean(label.textContent).replace(/:$/, ''),
            clean(value.textContent)
          ]);
        }
      }
    });
    flushRows();

    pdf.save(this.loanProduct.name.replace(/\s+/g, '_') + '.pdf');
  }
}
