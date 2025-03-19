import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-channel-create-overlay',
  standalone: true,
  imports: [],
  templateUrl: './channel-create-overlay.component.html',
  styleUrl: './channel-create-overlay.component.scss',
  animations: [
    trigger('fadeSlideIn', [
     
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))]) ,

     
      transition(':leave', [
        style({opacity: 1}),
        animate('300ms ease-in', style({ opacity: 0 })) 
      ])
    ])
  ]
})
export class ChannelCreateOverlayComponent {

  constructor(private variableService: VariablesService){
  }

  closeAddChannelOverlay(){
    this.variableService.toggleAddChannelOverlay();
  }

}
