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
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
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
import { RelatedPartiesService } from '../../related-parties/related-parties.service';
import { Link, PersonParties } from '../../related-parties/related-parties.models';
import { LinkDialogComponent, LinkDialogData } from '../../related-parties/link-dialog/link-dialog.component';
import { LoginDialogComponent, LoginDialogData } from '../../related-parties/login-dialog/login-dialog.component';

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
    MatTabsModule,
    MatTooltip,
    AdToBsPipe
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PersonDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private governance = inject(GovernanceRegisterService);
  private relatedParties = inject(RelatedPartiesService);
  private dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  readonly person = signal<Person | null>(null);
  readonly declarations = signal<Declaration[]>([]);
  readonly parties = signal<PersonParties | null>(null);
  readonly loading = signal(false);

  // Object URLs for the documents that are images, keyed by document id, so a thumbnail can be shown alongside
  // the name instead of everything (PDFs, photos, scans alike) reading as the same plain text row.
  private readonly thumbUrls = new Map<number, string>();
  readonly documentThumbs = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => this.load(Number(p.get('id'))));
    this.destroyRef.onDestroy(() => this.clearThumbs());
  }

  private clearThumbs(): void {
    this.thumbUrls.forEach((url) => URL.revokeObjectURL(url));
    this.thumbUrls.clear();
    this.documentThumbs.set({});
  }

  private loadThumbs(documents: PersonDocument[]): void {
    this.clearThumbs();
    for (const d of documents) {
      if (!d.removed && d.contentType.startsWith('image/')) {
        this.governance.downloadDocument(d.id).subscribe((blob) => {
          const url = URL.createObjectURL(blob);
          this.thumbUrls.set(d.id, url);
          this.documentThumbs.update((t) => ({ ...t, [d.id]: url }));
        });
      }
    }
  }

  private load(id: number): void {
    this.loading.set(true);
    this.governance.person(id).subscribe({
      next: (p) => {
        this.person.set(p);
        this.loading.set(false);
        this.loadThumbs(p.documents);
        if (p.canSeeDeclarations) {
          this.governance.declarations(id).subscribe((d) => this.declarations.set(d));
        } else {
          this.declarations.set([]);
        }
      },
      error: () => this.loading.set(false)
    });
    this.relatedParties.person(id).subscribe({ next: (p) => this.parties.set(p), error: () => this.parties.set(null) });
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
        maxHeight: '90vh',
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

  addLink(): void {
    const p = this.person();
    if (!p) {
      return;
    }
    this.dialog
      .open<LinkDialogComponent, LinkDialogData, PersonParties>(LinkDialogComponent, {
        data: { personId: p.id, officerName: p.name },
        width: '520px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((linked) => linked && this.parties.set(linked));
  }

  removeLink(l: Link): void {
    this.dialog
      .open<InputDialogComponent, InputDialogData, { reason: string }>(InputDialogComponent, {
        data: {
          title: 'relatedParties.RemoveLinkTitle',
          message: l.name,
          fields: [
            { name: 'reason', label: 'governanceRegister.Reason', type: 'textarea', required: true, maxLength: 500 }
          ],
          confirm: 'relatedParties.RemoveLink',
          danger: true
        },
        width: '520px',
        maxWidth: '96vw'
      })
      .afterClosed()
      .subscribe((r) => {
        if (r?.reason) {
          this.relatedParties.removeLink(l.id, r.reason).subscribe((p) => this.parties.set(p));
        }
      });
  }

  setLogin(): void {
    const parties = this.parties();
    if (!parties) {
      return;
    }
    this.dialog
      .open<LoginDialogComponent, LoginDialogData, PersonParties>(LoginDialogComponent, {
        data: { person: parties },
        width: '480px',
        maxWidth: '96vw',
        autoFocus: false
      })
      .afterClosed()
      .subscribe((updated) => updated && this.parties.set(updated));
  }
}
