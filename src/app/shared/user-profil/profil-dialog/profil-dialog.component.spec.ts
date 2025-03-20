import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilDialogComponent } from './profil-dialog.component';

describe('ProfilDialogComponent', () => {
  let component: ProfilDialogComponent;
  let fixture: ComponentFixture<ProfilDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
