import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopPasswordChecklistComponent } from './coop-password-checklist.component';

describe('CoopPasswordChecklistComponent', () => {
  let component: CoopPasswordChecklistComponent;
  let fixture: ComponentFixture<CoopPasswordChecklistComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopPasswordChecklistComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopPasswordChecklistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
