import { Component, Output, EventEmitter } from '@angular/core';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'app-channel-members-overlay',
  standalone: true,
  imports: [],
  templateUrl: './channel-members-overlay.component.html',
  styleUrl: './channel-members-overlay.component.scss'
})
export class ChannelMembersOverlayComponent {

  @Output() childEvent = new EventEmitter<void>();

  constructor( private dialogRef: MatDialogRef<ChannelMembersOverlayComponent>){}


  async closeDialog(){

    this.dialogRef.close(ChannelMembersOverlayComponent);

  }

  async openAddUserToChannelDialog(){
    await this.closeDialog();
    setTimeout(() => {
       this.childEvent.emit();
    }, 200);
   
  }
}
