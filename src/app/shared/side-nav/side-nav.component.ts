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

  private variableService: VariablesService = inject(VariablesService);
  private dialog: MatDialog = inject(MatDialog);
  private firebaseService: FirebaseService = inject(FirebaseService); // Injiziert
  private authService: AuthService = inject(AuthService); // Injiziert
  private subService: SubService = inject(SubService);

  @Input() userChannels: ChannelWithKey[] = [];
  // @Input() channel!: ChannelWithKey;

  @Output() channelSelected = new EventEmitter<ChannelWithKey>();
  @Output() userSelected = new EventEmitter<User>();

  displayableUsers: User[] = [];
  currentUserUid: string | null = null;
  private readonly SUB_GROUP_NAME = 'sideNavSubs';

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

    const authSub = this.authService.uid$.subscribe((uid) => {
      this.currentUserUid = uid;
      if (uid) {
        this.loadUsers();
      } else {
        this.displayableUsers = [];
      }
    });
    this.subService.add(authSub, this.SUB_GROUP_NAME);
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
  }

  loadUsers(): void {
    this.firebaseService
      .getAllUsers()
      .pipe(
        map((users) => users.filter((user) => user.uid !== this.currentUserUid))
      )
      .subscribe((filteredUsers) => {
        this.displayableUsers = filteredUsers;
        console.log('[SideNav] Displayable Users:', this.displayableUsers);
      });
  }
  constructor() {}

  selectChannel(channel: ChannelWithKey): void {
    this.channelSelected.emit(channel);
  }

  selectUserForDm(user: User): void {
    this.userSelected.emit(user);
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
}
