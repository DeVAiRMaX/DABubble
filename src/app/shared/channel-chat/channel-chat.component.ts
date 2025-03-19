import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss'
})
export class ChannelChatComponent {

  constructor(private variableService: VariablesService){}

  toggleThread() {
    if (this.variableService['isClosedSubject'].value) { 
      this.variableService.toggleThread();
    }
  }
  

}
