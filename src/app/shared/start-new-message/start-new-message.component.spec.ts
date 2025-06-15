import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StartNewMessageComponent } from './start-new-message.component';

describe('StartNewMessageComponent', () => {
  let component: StartNewMessageComponent;
  let fixture: ComponentFixture<StartNewMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartNewMessageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StartNewMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
