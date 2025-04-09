import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SmileyKeyboardComponent } from './smiley-keyboard.component';

describe('SmileyKeyboardComponent', () => {
  let component: SmileyKeyboardComponent;
  let fixture: ComponentFixture<SmileyKeyboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmileyKeyboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SmileyKeyboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
