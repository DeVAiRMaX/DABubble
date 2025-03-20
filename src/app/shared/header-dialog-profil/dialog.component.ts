import { Component } from '@angular/core';
import { SharedModule } from './../../shared';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ProfilDialogComponent } from '../user-profil/profil-dialog/profil-dialog.component';


@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  
})
export class DialogComponent {

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<DialogComponent>) {
  }

  openProfilDialog() {
    this.dialog.open(ProfilDialogComponent);
    this.closeDialog();
  }

  closeDialog() {
    this.dialogRef.close(DialogComponent);
  }
}
