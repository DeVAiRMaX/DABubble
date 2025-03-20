import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [],
  templateUrl: './profil-dialog.component.html',
  styleUrl: './profil-dialog.component.scss'
})
export class ProfilDialogComponent {
  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<ProfilDialogComponent>) {
  }

  closeDialog() {
    this.dialogRef.close(ProfilDialogComponent);
  }
}
