import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaggingPersonsDialogComponent } from './tagging-persons-dialog.component';

describe('TaggingPersonsDialogComponent', () => {
  let component: TaggingPersonsDialogComponent;
  let fixture: ComponentFixture<TaggingPersonsDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaggingPersonsDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TaggingPersonsDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
