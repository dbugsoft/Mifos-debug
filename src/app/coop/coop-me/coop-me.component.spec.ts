import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoopMeComponent } from './coop-me.component';

describe('CoopMeComponent', () => {
  let component: CoopMeComponent;
  let fixture: ComponentFixture<CoopMeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoopMeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(CoopMeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
