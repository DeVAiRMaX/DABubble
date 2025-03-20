import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialogRef } from '@angular/material/dialog';
import { SharedModule } from '../../shared';

@Component({
  selector: 'app-channel-create-overlay',
  standalone: true,
  imports: [CommonModule, MatDialogModule, SharedModule],
  templateUrl: './channel-create-overlay.component.html',
  styleUrl: './channel-create-overlay.component.scss',
  animations: [
    trigger('channelCreateOverlayAnimation', [
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
export class ChannelCreateOverlayComponent {

  channelCreateOverlayAnimation: 'open' | 'close' = 'close';

  constructor(private variableService: VariablesService, private dialogRef: MatDialogRef<ChannelCreateOverlayComponent>){
  }

  ngOnInit() {
    setTimeout(() => {
      this.startAnimation();
    }, 10);
  }

  startAnimation() {
    this.channelCreateOverlayAnimation = 'open';
  }

  closeDialog(){
    this.channelCreateOverlayAnimation = 'close';
    setTimeout(() => {
      this.dialogRef.close(ChannelCreateOverlayComponent);
    }, 100);
  }

  closeAddChannelOverlay(){
    this.variableService.toggleAddChannelOverlay();
  }

}
