import { Component, ElementRef, EventEmitter, HostListener, Input, Output, ViewChild, inject } from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { User } from '../interfaces/user';
import { Observable, filter } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { UserProfilComponent } from './user-profil/user-profil.component';
import { ChannelWithKey } from '../interfaces/channel';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule, AsyncPipe, NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {

  @ViewChild('searchInputRef') userListRef!: ElementRef;
  @ViewChild('searchResult') userInputRef!: ElementRef;

  @Input() channel!: ChannelWithKey;
  @Output() channelSelected = new EventEmitter<ChannelWithKey>();
  @Output() userSelected = new EventEmitter<User>();

  searchValue: string = '';
  searchResults: any[] = [];
  searchResultsState: boolean = false;
  userID: string = '';
  userNotFoundChannel: boolean = false;

  private authService: AuthService = inject(AuthService);
  private databaseService: FirebaseService = inject(FirebaseService);

  user$: Observable<User | null>;

  constructor(public dialog: MatDialog, ) {
    
    this.user$ = this.authService.user$;          
  }

  ngOnInit(): void {
    this.user$
      .pipe(filter(user => user !== null))
      .subscribe(user => {
        this.userID = user!.uid;
      });
  }
  

  async onSearchChange(): Promise<void> {
    const data = await this.databaseService.getDatabaseData();

    if (this.searchValue.trim().length > 0) {
      this.searchResultsState = true;
      const lowerSearchTerm = this.searchValue.toLowerCase();

      const channels = data.channels
        ? Object.entries(data.channels as Record<string, any>)
          .filter(([id, channel]) =>
            channel.channelName && channel.channelName.toLowerCase().includes(lowerSearchTerm)
          )
          .map(([id, channel]) => ({
            id: id,                
            type: 'Channel',
            data: channel,
          }))
        : [];


      const users = data.users
        ? Object.entries(data.users as Record<string, any>)
          .filter(([id, user]) =>
            user.displayName && user.displayName.toLowerCase().includes(lowerSearchTerm)
          )
          .map(([id, user]) => ({
            id: id,
            type: 'User',
            data: user,
          }))
        : [];

        // const massages = data.direct-messages
        // ? Object.entries(data.direct-messages as Record<string, any>)
        //   .filter(([id, channel]) =>
        //     channel.channelName && channel.channelName.toLowerCase().includes(lowerSearchTerm)
        //   )
        //   .map(([id, channel]) => ({
        //     id: id,                
        //     type: 'Channel',
        //     data: channel,
        //   }))
        // : [];



      this.searchResults = [
        ...channels,
        ...users,
      ];
    } else {
      this.searchResultsState = false;
      this.searchResults = [];
    }
  }

  openResult(result: any): void {
    if (result.type === 'Channel') {
      if (Array.isArray(result.data.members) && result.data.members.includes(this.userID)) {
        this.openResultChannel(result);
      } else {
        result.userNotFoundChannel = true;
      }
    } else if (result.type === 'User') {
      this.openResultUser(result);
    }
  }
  

  openResultUser(data: any) {
    const dialogRef = this.dialog.open(UserProfilComponent, {
      data: data,
      panelClass: 'custom-user-profil-container',
    });
  
    this.searchResultsState = false;
  
    dialogRef.afterClosed().subscribe((selectedUser: User | undefined) => {
      if (selectedUser) {
        console.log('[Header] Got user from dialog:', selectedUser);
        this.userSelected.emit(selectedUser); // 🔥 gibt an MainComponent weiter
      }
    });
  }
  

  openResultChannel(result: any & ChannelWithKey) {
    if (result.type === 'Channel') {

      const channelWithKey = { ...result.data, key: result.id };

      this.channelSelected.emit(channelWithKey);
    }
    this.searchResultsState = false;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const clickedInsideInput = this.userInputRef?.nativeElement.contains(event.target);
    const clickedInsideList = this.userListRef?.nativeElement.contains(event.target);

    if (!clickedInsideInput && !clickedInsideList) {
      this.searchResultsState = false;
    }
  }

  closeDialog(dialog: string) {
    // this.dialogRef.close(EditProfilDialogComponent);

  }

  openDialog() {
    if (this.authService.getCurrentUser()) {
      this.dialog.open(DialogComponent, {});
    } else {
      console.log(
        'Dialog kann nicht geöffnet werden, kein Benutzer eingeloggt.'
      );
    }
  }
}
