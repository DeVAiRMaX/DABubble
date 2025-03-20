import { Component } from '@angular/core';
import { VariablesService } from '../../variables.service';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from '../../shared';
import { EditChannelComponent } from './edit-channel/edit-channel.component';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss'
})
export class ChannelChatComponent {

  constructor(private variableService: VariablesService, public dialog: MatDialog) { }

  toggleThread() {
    if (this.variableService['isClosedSubject'].value) {
      this.variableService.toggleThread();
    }
  }

  openEditChannelDialog() {
    this.dialog.open(EditChannelComponent, {
      maxWidth: 'none',
      panelClass: 'custom-dialog-container',
    });
  }

}
