import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
  OnDestroy,
} from '@angular/core';
import { SharedModule } from '../../shared';
import { VariablesService } from '../../variables.service';
import { CommonModule } from '@angular/common';
import { ChannelCreateOverlayComponent } from '../channel-create-overlay/channel-create-overlay.component';
import { Observable, of, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { ChannelWithKey } from '../interfaces/channel';
import { User } from '../interfaces/user';
import { FirebaseService } from '../services/firebase.service';
import { AuthService } from '../services/auth.service';
import { SubService } from '../services/sub.service';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [SharedModule, CommonModule, MatDialogModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate(
          '200ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),

      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate(
          '200ms ease-in',
          style({ transform: 'translateX(-100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class SideNavComponent implements OnInit, OnDestroy {
  isChannelListExpanded: boolean = true;
  isMsgListExpanded: boolean = true;
  sideNavIsVisible: boolean = true;
  isMobile: boolean = false;

  public variableService: VariablesService = inject(VariablesService);
  private dialog: MatDialog = inject(MatDialog);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private authService: AuthService = inject(AuthService);
  private subService: SubService = inject(SubService);
  private mobileSubscription: Subscription | undefined;

  @Input() userChannels: ChannelWithKey[] = [];
  @Output() channelSelected = new EventEmitter<ChannelWithKey>();
  @Output() userSelected = new EventEmitter<User>();

  displayableUsers: User[] = [];
  currentUser: User | null = null;
  private readonly SUB_GROUP_NAME = 'sideNavSubs';

  constructor() {}

  ngOnInit() {
    const savedChannelState = localStorage.getItem('channelListExpanded');
    const savedMsgState = localStorage.getItem('msgListExpanded');
    this.isChannelListExpanded = savedChannelState
      ? JSON.parse(savedChannelState)
      : true;
    this.isMsgListExpanded = savedMsgState ? JSON.parse(savedMsgState) : true;

    const sideNavVisSub = this.variableService.sideNavIsVisible$.subscribe(
      (value) => {
        this.sideNavIsVisible = value;
      }
    );
    this.subService.add(sideNavVisSub, this.SUB_GROUP_NAME);

    const userSub = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      if (user) {
        this.loadUsers();
      } else {
        this.displayableUsers = [];
      }
    });
    this.subService.add(userSub, this.SUB_GROUP_NAME);

    this.mobileSubscription = this.variableService.isMobile$.subscribe(
      (isMobile) => {
        this.isMobile = isMobile;
      }
    );
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
    if (this.mobileSubscription) {
      this.mobileSubscription.unsubscribe();
    }
  }

  loadUsers(): void {
    if (!this.currentUser || !this.currentUser.uid) {
      this.displayableUsers = [];
      return;
    }
    const currentUid = this.currentUser.uid;
    this.firebaseService
      .getAllUsers()
      .pipe(map((users) => users.filter((user) => user.uid !== currentUid)))
      .subscribe((filteredUsers) => {
        this.displayableUsers = filteredUsers;
      });
  }

  selectChannel(channel: ChannelWithKey): void {
    console.log('[SideNav] Channel selected:', channel);
    
    this.channelSelected.emit(channel);

    this.variableService.showChannelChatView();
  }

  selectUserForDm(user: User): void {
console.log(user);

    this.userSelected.emit(user);
    this.variableService.showsDmChatView();
  }

  selectSelfChat(): void {
    if (this.currentUser) {
      this.userSelected.emit(this.currentUser);
      this.variableService.showsDmChatView();
    } else {
      console.error('[SideNav] Cannot select self-chat, currentUser is null.');
    }
  }

  openDialog(): void {
    this.dialog.open(ChannelCreateOverlayComponent, {
      maxWidth: 'unset',
      panelClass: 'channelCreateOverlayComponent-dialog',
    });
  }

  toggleChannelNav(): void {
    this.variableService.toggleSideNav();
  }

  toggleChannelList(): void {
    this.isChannelListExpanded = !this.isChannelListExpanded;
    localStorage.setItem(
      'channelListExpanded',
      JSON.stringify(this.isChannelListExpanded)
    );
  }

  toggleMsgList(): void {
    this.isMsgListExpanded = !this.isMsgListExpanded;
    localStorage.setItem(
      'msgListExpanded',
      JSON.stringify(this.isMsgListExpanded)
    );
  }

  createNewMessage() {
    this.variableService.setEmptyMessageTrue();
  }

  showNewMessageOnMobile() {
    this.createNewMessage();
    this.variableService.hideSideNav();
    this.variableService.showsDmChatView();
  }
}
