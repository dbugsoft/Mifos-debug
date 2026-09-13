/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import { Component, ViewChild } from '@angular/core';

import { CommonModule } from '@angular/common';

import { StepperSelectionEvent } from '@angular/cdk/stepper';

import { MatStepper, MatStepperModule } from '@angular/material/stepper';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { CoopNavbarComponent } from '../../coop-navbar/coop-navbar.component';

import { CoopProfileComponent } from '../coop-profile/coop-profile.component';

import { CoopDocumentsComponent } from '../coop-profile/coop-documents/coop-documents.component';

interface CoopStepperStep {
  label: string;

  title: string;

  subtitle: string;
}

@Component({
  selector: 'mifosx-coop-stepper',

  standalone: true,

  imports: [
    CommonModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    CoopNavbarComponent,
    CoopProfileComponent,
    CoopDocumentsComponent
  ],

  templateUrl: './coop-stepper.component.html',

  styleUrl: './coop-stepper.component.scss'
})
export class CoopStepperComponent {
  // =====================================================
  // CHILD REFERENCES
  // =====================================================

  @ViewChild('stepper')
  stepper!: MatStepper;

  /**
   * Read-only reference used solely to mirror `profileStatus` (the
   * "PENDING"/"ACTIVE" badge) into the step-indicator row so it sits
   * level with the indicator instead of on its own row further down.
   * mat-step content is lazy-rendered but the first step is active by
   * default, so this resolves as soon as the view initializes.
   */
  @ViewChild(CoopProfileComponent)
  profileComponent?: CoopProfileComponent;

  // =====================================================
  // STEPS
  // =====================================================

  /**
   * Drives the custom step-indicator bar rendered under the shared
   * navbar (Material's own step header is hidden - see the component
   * stylesheet - since it was rendering above the navbar instead of
   * below it).
   */
  readonly steps: CoopStepperStep[] = [
    {
      label: 'General Information',
      title: 'Cooperative Profile',
      subtitle: "Manage your cooperative's registration and contact information."
    },
    {
      label: 'Documents',
      title: 'Cooperative Documents',
      subtitle: 'Upload and manage your cooperative documents.'
    }
  ];

  currentStepIndex = 0;

  get currentStep(): CoopStepperStep {
    return this.steps[this.currentStepIndex];
  }

  // =====================================================
  // STEP COMPLETION
  // =====================================================

  /**
   * Drives `mat-step[completed]` for General Information. Stays false
   * until the profile save actually succeeds, and combined with the
   * stepper's `linear` mode this is what stops the user from clicking
   * straight into the Documents step header to skip validation.
   */
  generalInfoCompleted = false;

  // =====================================================
  // STEP CHANGE
  // =====================================================

  onSelectionChange(event: StepperSelectionEvent): void {
    this.currentStepIndex = event.selectedIndex;
  }

  // =====================================================
  // INDICATOR CLICK
  // =====================================================

  /**
   * Only lets the indicator jump to the current step or one already
   * completed - moving forward always goes through "Next", so its
   * validation/save gate can never be skipped by clicking ahead.
   */
  goToStep(index: number): void {
    if (index > this.currentStepIndex) {
      return;
    }

    this.stepper.selectedIndex = index;
  }

  // =====================================================
  // NEXT: GENERAL INFORMATION -> DOCUMENTS
  // =====================================================

  /**
   * CoopProfileComponent's own "Next" button (next to its Save/Update
   * button) does the required-field validation and the actual
   * create/update API call, then emits `nextStep` only once that
   * succeeds - this just advances the stepper in response, no
   * validation or save logic is duplicated here.
   *
   * `generalInfoCompleted` still drives the `[completed]` template
   * binding (for the indicator/header), but that binding only reaches
   * the actual `mat-step` on Angular's *next* change-detection pass -
   * not synchronously. `stepper.next()` (CDK's `selectedIndex` setter,
   * in linear mode) checks the step's *current* `completed` value in
   * this same synchronous call, so setting only the template-bound
   * property left it reading the stale `false` and silently no-op'd on
   * the first click - the actual root cause of the two-click bug.
   * Setting `completed` directly on the CDK step instance below writes
   * straight to its internal signal, so `stepper.next()` sees the
   * correct value immediately, in the same tick.
   */
  onGeneralInfoNext(): void {
    this.generalInfoCompleted = true;

    const generalInfoStep = this.stepper.steps.toArray()[0];

    if (generalInfoStep) {
      generalInfoStep.completed = true;
    }

    this.stepper.next();
  }
}
