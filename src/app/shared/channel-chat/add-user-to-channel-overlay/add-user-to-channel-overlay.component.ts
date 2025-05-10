import { Component, inject, ElementRef, HostListener, ViewChild, Inject } from '@angular/core';
import { VariablesService } from '../../../variables.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { SharedModule } from '../../../shared';
import { User } from '../../interfaces/user';
import { Channel } from '../../interfaces/channel';

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
  formInvalid: boolean = false;

  channelData: Channel[] = [];
  userData: User[] = [];
  selectedUser: any[] = [];
  filteredUserData: User[] = [];

  @ViewChild('userListContainer') userListRef!: ElementRef;
  @ViewChild('userInputRef') userInputRef!: ElementRef;

  private databaseService: FirebaseService = inject(FirebaseService);

  constructor(private variableService: VariablesService, private dialogRef: MatDialogRef<AddUserToChannelOverlayComponent>, @Inject(MAT_DIALOG_DATA) public data: { channelKey: string }) {

  }

  async ngOnInit(): Promise<void> {
    const userData = await this.databaseService.getDatabaseData();

    if (userData.users && typeof userData.users === 'object') {
      this.userData = Object.values(userData.users) as User[];
      this.filteredUserData = this.userData;
    }

    this.databaseService.getChannel(this.data.channelKey).subscribe(channel => {
      const channelDataJson = channel as Channel;
      this.channelData.push(channelDataJson);
    });

    console.log(this.channelData);

  }


  searchForUser(): void {
    this.searchingForUser = true;

    const searchTerm = this.userInput.trim().toLowerCase();

    const currentChannel = this.channelData[0];
    const currentMembers = currentChannel?.members || [];

    this.filteredUserData = this.userData.filter(user => {
      const isNotMember = !currentMembers.includes(user.uid);
      const isNotSelected = !this.selectedUser.some(selected => selected.uid === user.uid);
      const matchesSearch = user.displayName?.toLowerCase().includes(searchTerm);

      return isNotMember && isNotSelected && (searchTerm.length === 0 || matchesSearch);
    });

    if (this.filteredUserData.length === 0) {
      this.searchingForUser = false;
    }
  }

  checkFormInvalid() {
    if (this.userInput === '') {
      this.formInvalid = false;
    } else {
      this.formInvalid = true;
    }
  }

  selectUser(user: any) {
    this.userSelected = true;

    this.selectedUser.push(user);
    this.filteredUserData.splice(this.filteredUserData.indexOf(user), 1);
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

  async addUsersToChannel(): Promise<void> {
    for (const user of this.selectedUser) {
      await this.databaseService.updateChannelMember(this.data.channelKey, user.uid);
    }
    this.closeDialog();
  }


  closeDialog() {
    this.dialogRef.close(AddUserToChannelOverlayComponent);
  }

  hideAddUserToChannelOverlay() {
    this.variableService.toggleAddUserToChannelOverlay();
  }

}
