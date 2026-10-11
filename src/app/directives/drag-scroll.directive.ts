/**
 * Copyright since 2025 Mifos Initiative
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import {
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  NgZone,
  inject
} from '@angular/core';

/** Pointer movement (px) past which a mousedown→mouseup counts as a drag, not a click. */
const DRAG_THRESHOLD = 5;

/**
 * Click-and-drag and mouse-wheel horizontal scroll for an `overflow-x: auto` rail.
 * Touch devices keep the native swipe scroll; mouse users get drag and wheel since the scrollbar is hidden.
 * Drag continuation/release is tracked on `window`, so releasing outside the rail still ends the drag.
 */
@Directive({ selector: '[mifosxDragScroll]', standalone: true })
export class DragScrollDirective {
  private el: HTMLElement = inject(ElementRef).nativeElement;
  private zone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  /** Whether a mouse drag is in progress. */
  @HostBinding('class.dragging') dragging = false;

  private startX = 0;
  private startScrollLeft = 0;
  /** Set once the pointer has moved past the threshold, to swallow the click that ends the drag. */
  private dragged = false;

  private onMouseMove = (event: MouseEvent) => {
    const walk = event.pageX - this.startX;
    if (Math.abs(walk) > DRAG_THRESHOLD) {
      this.dragged = true;
    }
    this.el.scrollLeft = this.startScrollLeft - walk;
  };

  private onMouseUp = () => {
    this.dragging = false;
    this.cdr.markForCheck();
    this.removeWindowListeners();
  };

  /** Runs in the capture phase so it cancels the click before a child `routerLink` navigates. */
  private onClickCapture = (event: MouseEvent) => {
    if (this.dragged) {
      event.preventDefault();
      event.stopPropagation();
      this.dragged = false;
    }
  };

  constructor() {
    this.el.addEventListener('click', this.onClickCapture, true);
    inject(DestroyRef).onDestroy(() => {
      this.el.removeEventListener('click', this.onClickCapture, true);
      this.removeWindowListeners();
    });
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    /** Stops the browser's native link/text drag from hijacking the gesture. */
    event.preventDefault();
    this.dragging = true;
    this.dragged = false;
    this.startX = event.pageX;
    this.startScrollLeft = this.el.scrollLeft;
    this.zone.runOutsideAngular(() => window.addEventListener('mousemove', this.onMouseMove));
    window.addEventListener('mouseup', this.onMouseUp);
  }

  /** Maps a vertical wheel to horizontal scroll, leaving the page scroll alone once the rail hits an end. */
  @HostListener('wheel', ['$event'])
  onWheel(event: WheelEvent) {
    if (event.deltaX !== 0 || event.deltaY === 0) {
      return;
    }
    const maxScrollLeft = this.el.scrollWidth - this.el.clientWidth;
    const canScroll = event.deltaY < 0 ? this.el.scrollLeft > 0 : this.el.scrollLeft < maxScrollLeft;
    if (canScroll) {
      event.preventDefault();
      this.el.scrollLeft += event.deltaY;
    }
  }

  private removeWindowListeners() {
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
  }
}
