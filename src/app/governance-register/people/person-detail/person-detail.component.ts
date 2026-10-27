/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { AdToBsPipe } from 'app/pipes/ad-to-bs.pipe';
import { InputDialogComponent, InputDialogData } from 'app/compliance/input-dialog/input-dialog.component';
import { GovernanceRegisterService } from '../../governance-register.service';
import { saveBlob } from '../../governance-register.utils';
import { BUILT_IN_POSITION_CODES, Declaration, Person, PersonDocument, Term } from '../../governance-register.models';
import { TermDialogComponent, TermDialogData } from '../../committees/term-dialog/term-dialog.component';
import { EndTermDialogComponent, EndTermDialogData } from '../../committees/end-term-dialog/end-term-dialog.component';
import { DocumentDialogComponent } from '../document-dialog/document-dialog.component';
import { DeclarationDialogComponent } from '../declaration-dialog/declaration-dialog.component';
import { PersonDialogComponent, PersonDialogData } from '../person-dialog/person-dialog.component';

/** One person's dossier: the positions they hold or have held, their documents and declarations (fineract-dbug #138). */
@Component({
  selector: 'mifosx-person-detail',
  templateUrl: './person-detail.component.html',
  styleUrls: ['./person-detail.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    RouterLink,
    MatIcon,
    MatProgressBar,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private governance = inject(GovernanceRegisterService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly person = signal<Person | null>(null);
  readonly declarations = signal<Declaration[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.load(Number(p.get('id'))));
  }

  private load(id: number): void {
    this.loading.set(true);
    this.governance.person(id).subscribe({
      next: (p) => {
        this.person.set(p);
        this.loading.set(false);
        if (p.canSeeDeclarations) {
          this.governance.declarations(id).subscribe((d) => this.declarations.set(d));
        } else {
          this.declarations.set([]);
        }
      },
      error: () => this.loading.set(false)
    });
  }

  edit(): void {
    const p = this.person();
    if (!p) {
      return;
    }
    this.dialog
      .open<PersonDialogComponent, PersonDialogData, Person>(PersonDialogComponent, {
        data: { person: p },
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((saved) => saved && this.load(p.id));
  }

  positionLabel(t: Term): string {
    return BUILT_IN_POSITION_CODES.includes(t.positionCode)
      ? `governanceRegister.position.${t.positionCode}`
      : t.positionName;
  }

  changePosition(t: Term): void {
    this.dialog
      .open<TermDialogComponent, TermDialogData, Term>(TermDialogComponent, {
        data: { committee: { id: t.committeeId, name: t.committeeName }, changePositionOf: t },
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((changed) => changed && this.load(this.person()!.id));
  }

  endTerm(t: Term): void {
    this.dialog
      .open<EndTermDialogComponent, EndTermDialogData, Term>(EndTermDialogComponent, {
        data: { term: t },
        width: '520px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((ended) => ended && this.load(this.person()!.id));
  }

  voidTerm(t: Term): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'governanceRegister.committees.voidTermTitle',
          message: t.personName,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'governanceRegister.committees.MarkAsAMistake',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.governance.voidTerm(t.id, r.reason).subscribe(() => this.load(this.person()!.id));
        }
      });
  }

  addDocument(): void {
    const p = this.person();
    if (!p) {
      return;
    }
    this.dialog
      .open(DocumentDialogComponent, { data: { personId: p.id }, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((added) => added && this.load(p.id));
  }

  downloadDocument(d: PersonDocument): void {
    this.governance.downloadDocument(d.id).subscribe((blob) => saveBlob(blob, d.fileName));
  }

  removeDocument(d: PersonDocument): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'governanceRegister.documents.TakeOutTitle',
          message: d.title,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'governanceRegister.documents.TakeOut',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        const p = this.person();
        if (r?.reason && p) {
          this.governance.removeDocument(d.id, r.reason).subscribe(() => this.load(p.id));
        }
      });
  }

  addDeclaration(): void {
    const p = this.person();
    if (!p) {
      return;
    }
    this.dialog
      .open(DeclarationDialogComponent, {
        data: { personId: p.id },
        width: '560px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((added) => added && this.load(p.id));
  }

  downloadDeclaration(d: Declaration): void {
    this.governance.downloadDeclaration(d.id).subscribe((blob) => saveBlob(blob, d.fileName));
  }

  voidDeclaration(d: Declaration): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'governanceRegister.declarations.VoidTitle',
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'governanceRegister.committees.MarkAsAMistake',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        const p = this.person();
        if (r?.reason && p) {
          this.governance.voidDeclaration(d.id, r.reason).subscribe(() => this.load(p.id));
        }
      });
  }
}
