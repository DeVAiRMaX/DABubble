import { Component, inject, ElementRef, HostListener, ViewChild } from '@angular/core';
import { VariablesService } from '../../../variables.service';
import { MatDialogRef } from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { SharedModule } from '../../../shared';
import { User } from '../../interfaces/user';

@Component({
  selector: 'app-add-user-to-channel-overlay',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './add-user-to-channel-overlay.component.html',
  styleUrl: './add-user-to-channel-overlay.component.scss'
})
export class AddUserToChannelOverlayComponent {
  searchingForUser: boolean = false;
  userSelected: boolean = false;
  userInput: string = '';

  userData: User[] = [];
  selectedUser: any[] = [];
  filteredUserData: User[] = [];

  @ViewChild('userListContainer') userListRef!: ElementRef;
  @ViewChild('userInputRef') userInputRef!: ElementRef;

  private databaseService: FirebaseService = inject(FirebaseService);


  constructor(private variableService: VariablesService, private dialogRef: MatDialogRef<AddUserToChannelOverlayComponent>) {

  }

  async ngOnInit(): Promise<void> {
    const data = await this.databaseService.getDatabaseData();

    if (data.users && typeof data.users === 'object') {
      this.userData = Object.values(data.users) as User[];
      this.filteredUserData = this.userData;  
    }
  }


  searchForUser(): void {
    this.searchingForUser = true;
  
    const searchTerm = this.userInput.trim().toLowerCase();
  
    if (searchTerm.length === 0) {
      this.filteredUserData = this.userData; // Alle anzeigen, wenn nichts eingegeben
      return;
    }
  
    this.filteredUserData = this.userData.filter(user =>
      user.displayName?.toLowerCase().includes(searchTerm)
    );
  }
  

  selectUser(user: any) {
    this.userSelected = true;

    this.selectedUser.push(user);
    this.filteredUserData.splice(this.filteredUserData.indexOf(user), 1);

    // muss noch überprüfen ob der user bereits im channel vorhanden ist.

  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const clickedInsideInput = this.userInputRef?.nativeElement.contains(event.target);
    const clickedInsideList = this.userListRef?.nativeElement.contains(event.target);

    if (!clickedInsideInput && !clickedInsideList) {
      this.searchingForUser = false;
    }
  }

  removeUser(removedUser: any) {
    this.selectedUser.splice(this.selectedUser.indexOf(removedUser), 1);
    this.filteredUserData.push(removedUser);
  }

  closeDialog() {


    this.dialogRef.close(AddUserToChannelOverlayComponent);

  }

  hideAddUserToChannelOverlay() {
    this.variableService.toggleAddUserToChannelOverlay();
  }

}
