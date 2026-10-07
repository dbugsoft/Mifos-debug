/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/** Angular Imports */
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

/** Custom Dialogs */
import { UnassignStaffDialogComponent } from './custom-dialogs/unassign-staff-dialog/unassign-staff-dialog.component';
import { UploadSignatureDialogComponent } from './custom-dialogs/upload-signature-dialog/upload-signature-dialog.component';
import { ViewSignatureDialogComponent } from './custom-dialogs/view-signature-dialog/view-signature-dialog.component';
import { DeleteSignatureDialogComponent } from './custom-dialogs/delete-signature-dialog/delete-signature-dialog.component';
import { DrawSignatureDialogComponent } from './custom-dialogs/draw-signature-dialog/draw-signature-dialog.component';
import { DeleteDialogComponent } from 'app/shared/delete-dialog/delete-dialog.component';
import { UploadImageDialogComponent } from './custom-dialogs/upload-image-dialog/upload-image-dialog.component';
import { CaptureImageDialogComponent } from './custom-dialogs/capture-image-dialog/capture-image-dialog.component';

/** Custom Services */
import { ClientsService } from '../clients.service';
import { LegalFormId } from '../models/legal-form.enum';
import {
  MatCard,
  MatCardHeader,
  MatCardTitleGroup,
  MatCardMdImage,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent
} from '@angular/material/card';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';
import { EntityNameComponent } from '../../shared/entity-name/entity-name.component';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { AccountNumberComponent } from '../../shared/account-number/account-number.component';
import { ExternalIdentifierComponent } from '../../shared/external-identifier/external-identifier.component';
import { MatTabNav, MatTabLink, MatTabNavPanel } from '@angular/material/tabs';
import { StatusLookupPipe } from '../../pipes/status-lookup.pipe';
import { DateFormatPipe } from '../../pipes/date-format.pipe';
import { STANDALONE_SHARED_IMPORTS } from 'app/standalone-shared.module';
import { formatTabLabel } from 'app/shared/utils/format-tab-label.util';

import { MembershipApplication, MembershipTemplate } from '../membership/membership.models';
import { MembershipService } from '../membership/membership.service';
import { MembershipDeadlineComponent } from '../membership/membership-deadline/membership-deadline.component';
import {
  MembershipDecisionData,
  MembershipDecisionDialogComponent
} from '../membership/membership-decision-dialog/membership-decision-dialog.component';
import { openApplyDialog, reloadMemberPage } from '../membership/membership-tab/membership-tab.component';
import { ClientActionNotifierService } from './client-actions/client-action-notifier.service';

@Component({
  selector: 'mifosx-clients-view',
  templateUrl: './clients-view.component.html',
  styleUrls: ['./clients-view.component.scss'],
  imports: [
    ...STANDALONE_SHARED_IMPORTS,
    MatCardHeader,
    MatCardTitleGroup,
    MatCardMdImage,
    MatTooltip,
    MatCardTitle,
    NgClass,
    EntityNameComponent,
    MatIconButton,
    MatMenuTrigger,
    MatIcon,
    FaIconComponent,
    MatCardSubtitle,
    AccountNumberComponent,
    ExternalIdentifierComponent,
    MatMenu,
    MatMenuItem,
    MatTabNav,
    MatTabLink,
    RouterLinkActive,
    MatTabNavPanel,
    RouterOutlet,
    StatusLookupPipe,
    DateFormatPipe,
    MembershipDeadlineComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClientsViewComponent implements OnInit {
  complianceHideClientData = environment.complianceHideClientData;
  /**
   * Mask a string, keeping first and last letter, masking the rest with *
   */
  maskName(name: string): string {
    if (!name) return '';
    return name
      .trim()
      .split(/(\s+)/)
      .map((word) => {
        if (!word.trim()) return word;
        if (word.length <= 2) return word[0] + '*';
        return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
      })
      .join('');
  }

  /**
   * Mask external id, mobile, etc (show only first char, rest as *)
   */
  maskValue(val: string): string {
    if (!val) return '';
    if (val.length <= 2) return val[0] + '*';
    return val[0] + '*'.repeat(val.length - 1);
  }

  /**
   * Mask email: v********@f*******
   */
  maskEmail(email: string): string {
    if (!email) return '';
    const [
      user,
      domain
    ] = email.split('@');
    if (!user || !domain || user.length < 1) return this.maskValue(email);
    let maskedUser = user.length > 1 ? user[0] + '*'.repeat(user.length - 1) : user[0] + '*';
    const domainLabel = domain.split('.')[0] || '';
    const domainMaskLen = Math.max(0, domainLabel.length - 1);
    let maskedDomain = domainLabel.length > 0 ? domainLabel[0] + '*'.repeat(domainMaskLen) : '';
    let domainRest = '';
    if (domain.length > domainLabel.length) {
      domainRest = domain.substring(domainLabel.length);
    }
    if (!maskedDomain) return this.maskValue(email);
    return maskedUser + '@' + maskedDomain + domainRest;
  }
  formatTabLabel(label: string): string {
    return formatTabLabel(label);
  }
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clientsService = inject(ClientsService);
  dialog = inject(MatDialog);
  private destroyRef = inject(DestroyRef);

  clientViewData: any;
  clientDatatables: any;
  /** The member's membership application, if any (fineract-dbug ADR 0023) */
  readonly membershipApplication = signal<MembershipApplication | null>(null);
  /** Whether the share-first rule is on; only looked up for a pending or refused client */
  readonly shareFirstRule = signal(false);
  /** The membership settings and products; only looked up for a pending or refused client (fineract-dbug ADR 0035) */
  readonly membershipTemplate = signal<MembershipTemplate | null>(null);
  private membershipService = inject(MembershipService);
  private notifier = inject(ClientActionNotifierService);
  /**
   * blob: URL of the client's photo, or null when there is none.
   * A signal, because this component is OnPush: a plain field set in the HTTP callback would not
   * re-render the template, and the placeholder would stay until something else marked the view dirty.
   */
  readonly clientImage = signal<string | null>(null);
  clientTemplateData: any;

  constructor() {
    this.route.data
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(
        (data: {
          clientViewData: any;
          clientTemplateData: any;
          clientDatatables: any;
          membershipApplication: MembershipApplication | null;
        }) => {
          this.clientViewData = data.clientViewData;
          this.membershipApplication.set(data.membershipApplication ?? null);
          const status = data.clientViewData?.status?.value;
          if (status === 'Pending' || status === 'Rejected') {
            this.membershipService.templateOrNull().subscribe((template) => {
              this.membershipTemplate.set(template);
              this.shareFirstRule.set(!!template?.settings.shareFirstEnabled);
            });
          }
          this.clientDatatables = this.filterDatatablesByClientSubtype(
            data.clientDatatables,
            data.clientViewData?.legalForm?.id
          );
          this.clientTemplateData = data.clientTemplateData;
        }
      );
  }

  /** A pending applicant: the board decides through the application, not through Fineract's own actions. */
  get applicationPending(): boolean {
    return this.membershipApplication()?.status === 'PENDING';
  }

  /** Every member has a Membership tab for users who may read memberships, with or without an application on record. */
  readonly canReadMembership = this.membershipService.canRead();

  /** Approve and Refuse are offered, unless "a different person must approve" is on and this user entered it. */
  get canDecideMembership(): boolean {
    const application = this.membershipApplication();
    return (
      application?.status === 'PENDING' &&
      this.membershipService.mayDecide(application, this.membershipTemplate()?.settings)
    );
  }

  /** A refused person applies again on their existing record (their citizenship number is unique). */
  get canApplyAgain(): boolean {
    return (
      this.clientViewData?.status?.value === 'Rejected' &&
      !!this.membershipTemplate()?.shareProducts.length &&
      (this.shareFirstRule() || !!this.membershipApplication()) &&
      this.membershipService.can('CREATE_MEMBERSHIP')
    );
  }

  /** A client pending from before the rule gets an application with its original date (administrators). */
  get canEnterExisting(): boolean {
    return (
      this.clientViewData?.status?.value === 'Pending' &&
      !this.applicationPending &&
      this.shareFirstRule() &&
      !!this.membershipTemplate()?.shareProducts.length &&
      this.membershipService.can('ENTER_MEMBERSHIP')
    );
  }

  applyForMembership(mode: 'again' | 'existing'): void {
    const template = this.membershipTemplate();
    if (!template) {
      return;
    }
    openApplyDialog(this.dialog, {
      template,
      clientId: this.clientViewData.id,
      name: this.clientViewData.displayName,
      mode,
      previous: this.membershipApplication()
    }).subscribe((taken) => {
      if (taken) {
        this.notifier.notify('membership.messages.applicationTaken');
        reloadMemberPage(this.router, taken.clientId);
      }
    });
  }

  decideMembership(decision: 'approve' | 'reject'): void {
    const application = this.membershipApplication();
    if (!application) {
      return;
    }
    this.dialog
      .open<MembershipDecisionDialogComponent, MembershipDecisionData>(MembershipDecisionDialogComponent, {
        data: { application, decision },
        width: '560px',
        maxWidth: 'calc(100vw - 32px)'
      })
      .afterClosed()
      .subscribe((decided?: MembershipApplication) => {
        if (decided) {
          this.notifier.notify(
            decision === 'approve' ? 'membership.messages.approved' : 'membership.messages.rejected'
          );
          reloadMemberPage(this.router, decided.clientId);
        }
      });
  }

  /**
   * Filters datatables based on the client's legal form (Person or Entity).
   * Datatables without an entitySubType are kept visible for all client types.
   */
  private filterDatatablesByClientSubtype(datatables: any[], legalFormId: number): any[] {
    if (!datatables || !legalFormId) {
      return datatables || [];
    }
    const subtype = legalFormId === LegalFormId.PERSON ? 'person' : 'entity';
    return datatables.filter((dt: any) => !dt.entitySubType || dt.entitySubType.toLowerCase() === subtype);
  }

  ngOnInit() {
    // A blob: URL points at memory held for this page; release it when the page goes away.
    this.destroyRef.onDestroy(() => this.releaseClientImage());
    this.clientsService
      .getClientProfileImage(this.clientViewData.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (image: Blob | null) => {
          this.releaseClientImage();
          // A null image means the client has no profile image. A blob: URL passes Angular's URL
          // sanitizer as it is, so no bypassSecurityTrust call is needed.
          this.clientImage.set(image ? URL.createObjectURL(image) : null);
        },
        error: (error: any) => {
          // Handle any unexpected errors
          console.error('Error loading client profile image:', error);
          this.releaseClientImage();
        }
      });
  }

  private releaseClientImage() {
    const url = this.clientImage();
    if (url) {
      URL.revokeObjectURL(url);
      this.clientImage.set(null);
    }
  }

  isActive(): boolean {
    return this.clientViewData.status.value === 'Active';
  }

  /**
   * Performs action button/option action.
   * @param {string} name action name.
   */
  doAction(name: string) {
    switch (name) {
      case 'Assign Staff':
      case 'Close':
      case 'Survey':
      case 'Reject':
      case 'Activate':
      case 'Withdraw':
      case 'Update Default Savings':
      case 'Transfer Client':
      case 'Undo Transfer':
      case 'Accept Transfer':
      case 'Reject Transfer':
      case 'Reactivate':
      case 'Undo Rejection':
      case 'Add Charge':
      case 'Create Collateral':
      case 'Client Screen Reports':
        this.router.navigate([`actions/${name}`], { relativeTo: this.route });
        break;
      case 'Unassign Staff':
        this.unassignStaff();
        break;
      case 'Delete':
        this.deleteClient();
        break;
      case 'View Signature':
        this.viewSignature();
        break;
      case 'Upload Signature':
        this.uploadSignature();
        break;
      case 'Delete Signature':
        this.deleteSignature();
        break;
      case 'Capture Image':
        this.captureProfileImage();
        break;
      case 'Upload Image':
        this.uploadProfileImage();
        break;
      case 'Delete Image':
        this.deleteProfileImage();
        break;
      case 'Create Standing Instructions':
        const createStandingInstructionsQueryParams: any = {
          officeId: this.clientViewData.officeId,
          accountType: 'fromsavings'
        };
        this.router.navigate(['standing-instructions/create-standing-instructions'], {
          relativeTo: this.route,
          queryParams: createStandingInstructionsQueryParams
        });
        break;
      case 'View Standing Instructions':
        const viewStandingInstructionsQueryParams: any = {
          officeId: this.clientViewData.officeId,
          accountType: 'fromsavings'
        };
        this.router.navigate(['standing-instructions/list-standing-instructions'], {
          relativeTo: this.route,
          queryParams: viewStandingInstructionsQueryParams
        });
        break;
    }
  }

  /**
   * Refetches data for the component
   * TODO: Replace by a custom reload component instead of hard-coded back-routing.
   */
  reload() {
    const url: string = this.router.url;
    this.router.navigateByUrl(`/members`, { skipLocationChange: true }).then(() => this.router.navigate([url]));
  }

  /**
   * Deletes the client
   */
  private deleteClient() {
    const deleteClientDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `client with id: ${this.clientViewData.id}` }
    });
    deleteClientDialogRef.afterClosed().subscribe((response: any) => {
      if (!response) {
        return;
      }
      if (response.delete) {
        this.clientsService.deleteClient(this.clientViewData.id).subscribe(() => {
          this.router.navigate(['/members'], { relativeTo: this.route });
        });
      }
    });
  }

  /**
   * Unassign's the client's staff.
   */
  private unassignStaff() {
    const unAssignStaffDialogRef = this.dialog.open(UnassignStaffDialogComponent);
    unAssignStaffDialogRef.afterClosed().subscribe((response: { confirm: any }) => {
      if (!response) {
        return;
      }
      if (response.confirm) {
        this.clientsService
          .executeClientCommand(this.clientViewData.id, 'unassignStaff', { staffId: this.clientViewData.staffId })
          .subscribe(() => {
            this.reload();
          });
      }
    });
  }

  /**
   * Shows client signature in a dialog
   */
  private viewSignature() {
    this.clientsService.getClientDocuments(this.clientViewData.id).subscribe((documents: any) => {
      const viewSignatureDialogRef = this.dialog.open(ViewSignatureDialogComponent, {
        data: {
          documents: documents,
          id: this.clientViewData.id
        }
      });
      viewSignatureDialogRef.afterClosed().subscribe((response: any) => {
        if (!response) {
          return;
        }
        if (response.upload) {
          this.uploadSignature();
        } else if (response.draw) {
          this.drawSignature();
        } else if (response.delete) {
          this.deleteSignature();
        }
      });
    });
  }

  /**
   * Uploads client signature
   */
  private uploadSignature() {
    const uploadSignatureDialogRef = this.dialog.open(UploadSignatureDialogComponent);
    uploadSignatureDialogRef.afterClosed().subscribe((signature: File) => {
      if (signature) {
        this.clientsService.uploadClientSignatureImage(this.clientViewData.id, signature).subscribe(() => {
          this.reload();
        });
      }
    });
  }

  /**
   * Opens draw pad for client signature
   */
  private drawSignature() {
    const drawSignatureDialogRef = this.dialog.open(DrawSignatureDialogComponent);
    drawSignatureDialogRef.afterClosed().subscribe((signature: File) => {
      if (signature) {
        this.clientsService.uploadClientSignatureImage(this.clientViewData.id, signature).subscribe(() => {
          this.reload();
        });
      }
    });
  }

  /**
   * Deletes client signature
   */
  private deleteSignature() {
    this.clientsService.getClientDocuments(this.clientViewData.id).subscribe((documents: any) => {
      const deleteSignatureDialogRef = this.dialog.open(DeleteSignatureDialogComponent, {
        data: documents
      });
      deleteSignatureDialogRef.afterClosed().subscribe((response: any) => {
        if (!response) {
          return;
        }
        if (response.delete) {
          this.clientsService.deleteClientDocument(this.clientViewData.id, response.id).subscribe(() => {
            this.reload();
          });
        } else if (response.upload) {
          this.uploadSignature();
        }
      });
    });
  }

  /**
   * Captures clients profile image.
   */
  private captureProfileImage() {
    const captureImageDialogRef = this.dialog.open(CaptureImageDialogComponent);
    captureImageDialogRef.afterClosed().subscribe((imageURL: string) => {
      if (imageURL) {
        this.clientsService.uploadCapturedClientProfileImage(this.clientViewData.id, imageURL).subscribe(() => {
          this.reload();
        });
      }
    });
  }

  /**
   * Uploads the clients image.
   */
  private uploadProfileImage() {
    const uploadImageDialogRef = this.dialog.open(UploadImageDialogComponent);
    uploadImageDialogRef.afterClosed().subscribe((image: File) => {
      if (image) {
        this.clientsService.uploadClientProfileImage(this.clientViewData.id, image).subscribe(() => {
          this.reload();
        });
      }
    });
  }

  /**
   * Deletes the client image.
   */
  private deleteProfileImage() {
    const deleteClientImageDialogRef = this.dialog.open(DeleteDialogComponent, {
      data: { deleteContext: `the profile image of ${this.clientViewData.displayName}` }
    });
    deleteClientImageDialogRef.afterClosed().subscribe((response: any) => {
      if (response.delete) {
        this.clientsService.deleteClientProfileImage(this.clientViewData.id).subscribe(() => {
          this.reload();
        });
      }
    });
  }
}
