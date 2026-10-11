/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { FORCE_PASSWORD_CHANGE_DIALOG_CONFIG } from './force-password-change-dialog.config';

describe('FORCE_PASSWORD_CHANGE_DIALOG_CONFIG', () => {
  it('cannot be dismissed by Escape, backdrop click or navigation', () => {
    expect(FORCE_PASSWORD_CHANGE_DIALOG_CONFIG.disableClose).toBe(true);
    expect(FORCE_PASSWORD_CHANGE_DIALOG_CONFIG.hasBackdrop).toBe(true);
    expect(FORCE_PASSWORD_CHANGE_DIALOG_CONFIG.closeOnNavigation).toBe(false);
  });

  it('is announced as an alert dialog labelled by its title', () => {
    expect(FORCE_PASSWORD_CHANGE_DIALOG_CONFIG.role).toBe('alertdialog');
    expect(FORCE_PASSWORD_CHANGE_DIALOG_CONFIG.ariaLabelledBy).toBe('force-password-change-title');
  });
});
