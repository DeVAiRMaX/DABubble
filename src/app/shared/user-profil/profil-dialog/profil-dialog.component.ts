import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import {
  trigger,
  state,
  style,
  animate,
  transition,
  AnimationEvent
} from '@angular/animations';

@Component({
  selector: 'app-profil-dialog',
  standalone: true,
  imports: [],
  templateUrl: './profil-dialog.component.html',
  styleUrl: './profil-dialog.component.scss',
  animations: [
    trigger('animationstate', [
      state('open', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      state('close', style({
        transform: 'translateX(100%)',
        opacity: 0
      })),
      transition('close => open', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('0.25s ease-out')
      ]),
      transition('open => close', [
        animate('0.25s ease-out',
          style({ transform: 'translateX(100%)', opacity: 0 })
        )
      ])
    ])
  ]
})
export class ProfilDialogComponent {

  animationstate: 'open' | 'close' = 'close';

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<ProfilDialogComponent>) {
  }

  ngOnInit() {
    this.startAnimation();
  }

  startAnimation() {
    setTimeout(() => {
      this.animationstate = 'open';
    }, 10);
  }

  closeDialog() {
    this.animationstate = 'close';
    setTimeout(() => {
      this.dialogRef.close(ProfilDialogComponent);
    }, 250);
  }
}
