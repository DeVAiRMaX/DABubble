import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  trigger,
  state,
  style,
  animate,
  transition,
} from '@angular/animations';

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [],
  templateUrl: './profil-dialog.component.html',
  styleUrl: './profil-dialog.component.scss',
  animations: [
    trigger('profilDialogAnimation', [
      state('open', style({
        transform: 'translateX(0)',
        height: 'auto',
        opacity: 1
      })),
      state('close', style({
        transform: 'translateX(100%)',
        height: '0',
        opacity: 0
      })),
      transition('close => open', [
        style({ transform: 'translateX(100%)', height: '0', opacity: 0 }),
        animate('0.25s ease-out')
      ]),
      transition('open => close', [
        animate('0.15s ease-out',
          style({ transform: 'translateX(100%)', height: '0', opacity: 0 })
        )
      ])
    ])
  ]
})
export class ProfilDialogComponent {

  profilDialogAnimation: 'open' | 'close' = 'close';

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<ProfilDialogComponent>) {
  }

  ngOnInit() {
    setTimeout(() => {
      this.startAnimation();
    }, 10);
  }

  startAnimation() {
    this.profilDialogAnimation = 'open';
  }

  closeDialog() {
    this.profilDialogAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close(ProfilDialogComponent);
    }, 100);
  }
}
