import { Component } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-edit-channel',
  standalone: true,
  imports: [],
  templateUrl: './edit-channel.component.html',
  styleUrl: './edit-channel.component.scss',
  animations: [
    trigger('editChannelAnimation', [
      state('open', style({
        transform: 'scale(1)',
        opacity: 1,
      })),
      state('close', style({
        transform: 'scale(0)',
        opacity: 0,
      })),
      transition('close => open', [
        style({ transform: 'scale(0)', opacity: 0 }),
        animate('0.2s ease-out')
      ]),
      transition('open => close', [
        animate('0.2s ease-out',
          style({ transform: 'scale(0)', opacity: 0 })
        )
      ])
    ])
  ]
})
export class EditChannelComponent {

  editChannelAnimation: 'open' | 'close' = 'close';

  constructor(public dialog: MatDialog, public dialogRef: MatDialogRef<EditChannelComponent>) { }


  ngOnInit() {
    setTimeout(() => {
      this.startAnimation();
    }, 10);
  }

  startAnimation() {

    this.editChannelAnimation = 'open';

  }

  closeDialog() {
    this.editChannelAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close();
    }, 150);
  }


}
