import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelMembersOverlayComponent } from './channel-members-overlay.component';

describe('ChannelMembersOverlayComponent', () => {
  let component: ChannelMembersOverlayComponent;
  let fixture: ComponentFixture<ChannelMembersOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelMembersOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelMembersOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
