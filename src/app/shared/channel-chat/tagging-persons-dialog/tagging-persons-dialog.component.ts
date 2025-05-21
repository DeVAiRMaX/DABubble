import { CommonModule } from '@angular/common';
import {
  Component,
  Inject,
  OnInit,
  Output,
  EventEmitter,
  inject,
} from '@angular/core';
import { VariablesService } from '../../../variables.service';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialogState,
} from '@angular/material/dialog';
import { FirebaseService } from '../../services/firebase.service';
import { ChannelNameAndKey } from '../../interfaces/channel';
import { User, userData } from '../../interfaces/user';

@Component({
  selector: 'app-tagging-persons-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tagging-persons-dialog.component.html',
  styleUrls: ['./tagging-persons-dialog.component.scss'],
})
export class TaggingPersonsDialogComponent implements OnInit {
  @Output() contactSelected = new EventEmitter<{
    id: string;
    name: string;
    type: 'user' | 'channel';
  }>();

  nametoFilter: string = '';
  modeForTagging: 'user' | 'channel' = 'user';
  triggerChar: '@' | '#' = '@';

  allContactsForDialog: { name: string; img: string; uid: string }[] = [];
  allChannelsForDialog: ChannelNameAndKey[] = [];

  filteredContacts: { name: string; img: string; uid: string }[] = [];
  filteredChannels: ChannelNameAndKey[] = [];

  private firebaseService: FirebaseService = inject(FirebaseService);

  constructor(
    public variableService: VariablesService,
    private dialogRef: MatDialogRef<TaggingPersonsDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      mode: 'user' | 'channel';
      char: '@' | '#';
      initialFilter: string;
    }
  ) {
    this.modeForTagging = data.mode;
    this.triggerChar = data.char;
    this.nametoFilter = data.initialFilter;
  }

  ngOnInit() {
    if (this.modeForTagging === 'user') {
      this.loadUsersForDialog();
    } else {
      this.loadChannelsForDialog();
    }

    const initialFilterTextForList = this.nametoFilter.startsWith(
      this.triggerChar
    )
      ? this.nametoFilter.substring(1)
      : this.nametoFilter === this.triggerChar
      ? ''
      : this.nametoFilter;

    this.variableService.nameToFilter$.subscribe((value: string) => {
      if (this.dialogRef.getState() !== MatDialogState.OPEN) {
        return;
      }

      if (value === '') {
        this.nametoFilter = this.triggerChar;
        if (this.modeForTagging === 'user') {
          this.updateFilteredContactsList('');
        } else {
          this.updateFilteredChannelsList('');
        }
        return;
      }

      if (!value.startsWith(this.triggerChar)) {
        this.closeDiaglog();
        return;
      }

      this.nametoFilter = value;
      const filterText = value.substring(1);
      if (this.modeForTagging === 'user') {
        this.updateFilteredContactsList(filterText);
      } else {
        this.updateFilteredChannelsList(filterText);
      }
    });
  }

  loadUsersForDialog() {
    this.firebaseService.getAllUsers().subscribe((users: userData[]) => {
      this.allContactsForDialog = users.map((user) => ({
        name:
          user.displayName || user.email?.split('@')[0] || 'Unbekannter User',
        img: user.avatar || '/assets/img/character/bsp-avatar.png',
        uid: user.uid,
      }));
      const initialText = this.nametoFilter.startsWith(this.triggerChar)
        ? this.nametoFilter.substring(1)
        : this.nametoFilter;
      this.updateFilteredContactsList(initialText);
    });
  }

  loadChannelsForDialog() {
    this.firebaseService
      .getAllChannelsWithNameAndKey()
      .subscribe((channels: ChannelNameAndKey[]) => {
        this.allChannelsForDialog = channels;
        const initialText = this.nametoFilter.startsWith(this.triggerChar)
          ? this.nametoFilter.substring(1)
          : this.nametoFilter;
        this.updateFilteredChannelsList(initialText);
      });
  }

  updateFilteredContactsList(filterText: string) {
    const lowerFilterText = filterText.toLowerCase();
    this.filteredContacts = this.allContactsForDialog.filter((contact) =>
      contact.name.toLowerCase().includes(lowerFilterText)
    );
  }

  updateFilteredChannelsList(filterText: string) {
    const lowerFilterText = filterText.toLowerCase();
    this.filteredChannels = this.allChannelsForDialog.filter((channel) =>
      channel.channelName.toLowerCase().includes(lowerFilterText)
    );
  }

  selectItem(item: any) {
    if (this.modeForTagging === 'user') {
      this.contactSelected.emit({
        id: item.uid,
        name: item.name,
        type: 'user',
      });
    } else {
      this.contactSelected.emit({
        id: item.key,
        name: item.channelName,
        type: 'channel',
      });
    }
    this.nametoFilter = this.triggerChar;
    if (this.modeForTagging === 'user') {
      this.updateFilteredContactsList('');
    } else {
      this.updateFilteredChannelsList('');
    }
  }

  closeDiaglog() {
    this.dialogRef.close();
  }
}
