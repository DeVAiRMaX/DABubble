import { Component } from '@angular/core';
import { VariablesService } from '../../../variables.service';

@Component({
  selector: 'app-add-user-to-channel-overlay',
  standalone: true,
  imports: [],
  templateUrl: './add-user-to-channel-overlay.component.html',
  styleUrl: './add-user-to-channel-overlay.component.scss'
})
export class AddUserToChannelOverlayComponent {

  constructor(private variableService: VariablesService){

  }

  hideAddUserToChannelOverlay(){
    this.variableService.toggleAddUserToChannelOverlay();
  }

}
