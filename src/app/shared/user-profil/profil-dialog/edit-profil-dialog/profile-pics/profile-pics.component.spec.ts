import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePicsComponent } from './profile-pics.component';

describe('ProfilePicsComponent', () => {
  let component: ProfilePicsComponent;
  let fixture: ComponentFixture<ProfilePicsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePicsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilePicsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
