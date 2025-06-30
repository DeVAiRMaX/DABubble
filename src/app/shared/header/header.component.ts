import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { SharedModule } from './../../shared';
import { DialogComponent } from '../header-dialog-profil/dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../services/auth.service';
import { User } from '../interfaces/user';
import { Observable, filter } from 'rxjs';
import { AsyncPipe, NgIf } from '@angular/common';
import { FirebaseService } from '../services/firebase.service';
import { UserProfilComponent } from './user-profil/user-profil.component';
import { ChannelWithKey } from '../interfaces/channel';
import { VariablesService } from '../../variables.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [SharedModule, AsyncPipe, NgIf],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss', './header-mobile.component.scss'],
})
export class HeaderComponent implements OnInit {
  @ViewChild('searchInputRef') searchInputRef!: ElementRef;
  @ViewChild('searchResultRef') searchResultRef!: ElementRef;

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
  public variableService: VariablesService = inject(VariablesService);
  public isGuestUser: boolean = false;

  user$: Observable<User | null>;
  isMobile$: Observable<boolean>;
  guestUser$ = this.authService.guestUser$;

  constructor(public dialog: MatDialog) {
    this.variableService.checkWindowSize();
    this.user$ = this.authService.user$;
    this.isMobile$ = this.variableService.isMobile$;
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: Event) {
    this.variableService.checkWindowSize();
  }

  ngOnInit(): void {
    this.user$.pipe(filter((user) => user !== null)).subscribe((user) => {
      this.userID = user!.uid;
    const email = user.email ?? ''; 
    const displayName = user.displayName?.toLowerCase().trim() ?? '';
    const isGuest = displayName === 'gast' && email.trim() === '';
    this.isGuestUser = isGuest;
    console.log('Header empfängt User:', user)

    if(this.isGuestUser) {
        this.variableService.setUserIsAGuest(true);
      } else {
        this.variableService.setUserIsAGuest(false);
      }

      console.log(this.variableService.userIsAGuest$);
    
    });
  }

  async onSearchChange(): Promise<void> {
    if (this.searchValue.trim().length > 0) {
      this.searchResultsState = true;
      const lowerSearchTerm = this.searchValue.toLowerCase();
      const data = await this.databaseService.getDatabaseData();

      const channels = data.channels
        ? Object.entries(data.channels as Record<string, any>)
            .filter(
              ([id, channel]) =>
                channel.channelName &&
                channel.channelName.toLowerCase().includes(lowerSearchTerm)
            )
            .map(([id, channel]) => ({
              id: id,
              type: 'Channel',
              data: channel,
            }))
        : [];

      const users = data.users
        ? Object.entries(data.users as Record<string, any>)
            .filter(
              ([id, user]) =>
                user.displayName &&
                user.displayName.toLowerCase().includes(lowerSearchTerm)
            )
            .map(([id, user]) => ({
              id: id,
              type: 'User',
              data: user,
            }))
        : [];

      this.searchResults = [...channels, ...users];
    } else {
      this.searchResultsState = false;
      this.searchResults = [];
    }
  }

  openResult(result: any): void {
    if (result.type === 'Channel') {
      if (
        Array.isArray(result.data.members) &&
        result.data.members.includes(this.userID)
      ) {
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
        this.userSelected.emit(selectedUser);
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
    if (this.searchResultsState) {
      const clickedInsideInput = this.searchInputRef?.nativeElement.contains(
        event.target
      );
      const clickedInsideList = this.searchResultRef?.nativeElement.contains(
        event.target
      );

      if (!clickedInsideInput && !clickedInsideList) {
        this.searchResultsState = false;
      }
    }
  }

  openDialog() {
    if (this.authService.getCurrentUser()) {
      this.dialog.open(DialogComponent, {});
    }
  }

  showSideNavMobile() {
    this.variableService.hidesDmChatView();
    this.variableService.hideChannelChatView();
    this.variableService.showSideNav();
  }
}
