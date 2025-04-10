import { Component, Inject, inject } from '@angular/core';
import { SharedModule } from './../../shared';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ProfilDialogComponent } from '../user-profil/profil-dialog/profil-dialog.component';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
  animations: [
    trigger('dialogAnimation', [
      state('open', style({
        height: '*',
        opacity: 1,
      })),
      state('close', style({
        height: '0',
        opacity: 0,
      })),
      transition('close => open', [
        style({ height: '0', opacity: 0 }),
        animate('0.26s ease-out')
      ]),
      transition('open => close', [
        animate('0.10s ease-out',
          style({ height: '0', opacity: 0 })
        )
      ])
    ])
  ]

})
export class DialogComponent {


  dialogAnimation: 'open' | 'close' = 'close';



  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<DialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit() {
    this.startAnimation();
    JSON.stringify(this.data);
  }


  startAnimation() {
    setTimeout(() => {
      this.dialogAnimation = 'open';
    }, 10);
  }

  openProfilDialog() {
    this.dialog.open(ProfilDialogComponent, {
      data: this.data
    })
    this.closeDialog();
  }

  closeDialog() {
    this.dialogAnimation = 'close';
    this.dialogRef.close(DialogComponent);
  }
}
