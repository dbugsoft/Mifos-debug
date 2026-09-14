/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { MatDialogConfig } from '@angular/material/dialog';

/**
 * The "set a new password" dialog must not be dismissible: no Escape, no backdrop click, and it survives
 * navigation. The only ways out are a successful password change or signing out.
 */
export const FORCE_PASSWORD_CHANGE_DIALOG_CONFIG: MatDialogConfig = {
  disableClose: true,
  hasBackdrop: true,
  closeOnNavigation: false,
  autoFocus: 'first-tabbable',
  restoreFocus: false,
  width: '440px',
  maxWidth: '95vw',
  role: 'alertdialog',
  ariaLabelledBy: 'force-password-change-title',
  panelClass: 'force-password-change-dialog'
};
