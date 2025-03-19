import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelCreateOverlayComponent } from './channel-create-overlay.component';

describe('ChannelCreateOverlayComponent', () => {
  let component: ChannelCreateOverlayComponent;
  let fixture: ComponentFixture<ChannelCreateOverlayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelCreateOverlayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelCreateOverlayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
