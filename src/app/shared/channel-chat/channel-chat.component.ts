import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay/add-user-to-channel-overlay.component';
import { CommonModule } from '@angular/common';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [AddUserToChannelOverlayComponent, CommonModule, MatDialogModule],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss'
})
export class ChannelChatComponent {
  addUserToChannelOverlayIsVisible:boolean = false;

  constructor(private variableService: VariablesService, private dialog: MatDialog){

    this.variableService.addUserToChannelOverlayIsVisible$.subscribe((value) => {
      this.addUserToChannelOverlayIsVisible = value;
    });
  }

  toggleAddUserToChannelOverlay(){
    this.variableService.toggleAddUserToChannelOverlay();
    console.log(this.addUserToChannelOverlayIsVisible);
  }

  toggleThread() {
    if (this.variableService['isClosedSubject'].value) { 
      this.variableService.toggleThread();
    }
  }

  openDialog(){
    this.dialog.open(AddUserToChannelOverlayComponent);
  }
  

}
