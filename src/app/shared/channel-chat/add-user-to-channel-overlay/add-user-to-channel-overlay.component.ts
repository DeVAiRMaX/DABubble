import { Component } from '@angular/core';
import { VariablesService } from '../../../variables.service';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-add-user-to-channel-overlay',
  standalone: true,
  imports: [MatDialogModule],
  templateUrl: './add-user-to-channel-overlay.component.html',
  styleUrl: './add-user-to-channel-overlay.component.scss'
})
export class AddUserToChannelOverlayComponent {

  constructor(private variableService: VariablesService,  private dialogRef: MatDialogRef<AddUserToChannelOverlayComponent>){

  }

  closeDialog() {
  
  
      this.dialogRef.close(AddUserToChannelOverlayComponent);
  
  }

  hideAddUserToChannelOverlay(){
    this.variableService.toggleAddUserToChannelOverlay();
  }

}
