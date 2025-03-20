import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay.component';

describe('AddUserToChannelOverlayComponent', () => {
  let component: AddUserToChannelOverlayComponent;
  let fixture: ComponentFixture<AddUserToChannelOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUserToChannelOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUserToChannelOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
