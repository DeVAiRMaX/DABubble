import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { HeaderComponent } from '../shared/header/header.component';
import { SideNavComponent } from '../shared/side-nav/side-nav.component';
import { ChannelChatComponent } from '../shared/channel-chat/channel-chat.component';
import { ThreadComponent } from '../shared/thread/thread.component';
import { DirectMessageComponent } from '../shared/direct-message/direct-message.component';
import { CommonModule } from '@angular/common';
import { VariablesService } from '../variables.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { FirebaseService } from '../shared/services/firebase.service';
import { AuthService } from '../shared/services/auth.service';
import { SubService } from '../shared/services/sub.service';
import { ChannelWithKey } from '../shared/interfaces/channel';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { userData, User } from '../../app/shared/interfaces/user';

@Component({
  selector: 'app-main-component',
  standalone: true,
  imports: [
    HeaderComponent,
    SideNavComponent,
    ChannelChatComponent,
    ThreadComponent,
    DirectMessageComponent,
    CommonModule,
    // RouterLink,
  ],
  templateUrl: './main-component.component.html',
  styleUrl: './main-component.component.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate(
          '200ms ease-out',
          style({ transform: 'translateX(0)', opacity: 1 })
        ),
      ]),

      transition(':leave', [
        style({ transform: 'translateX(0)', opacity: 1 }),
        animate(
          '200ms ease-in',
          style({ transform: 'translateX(100%)', opacity: 0 })
        ),
      ]),
    ]),
  ],
})
export class MainComponentComponent implements OnInit, OnDestroy {
  sideNavIsVisible: boolean = true;
  threadIsVisible: boolean = false;
  uid: string | null = '';
  channelKeys: string[] = [];
  userChannels: ChannelWithKey[] = [];
  selectedChannel: ChannelWithKey | undefined = undefined;
  selectedOtherUser: User | null = null;
  userIdFromUrl: any;
  userData: userData | null = null;

  private subService: SubService = inject(SubService);
  private authService: AuthService = inject(AuthService);
  private firebaseService: FirebaseService = inject(FirebaseService);
  private variableService: VariablesService = inject(VariablesService);
  private readonly route = inject(ActivatedRoute);
  private cdRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  private readonly GRP_UI_STATE = 'uiState';
  private readonly GRP_AUTH = 'auth';
  private readonly GRP_CHANNEL_CREATED = 'channelCreatedListener';
  private readonly GRP_DATA_KEYS = 'dataLoadKeys';
  private readonly GRP_DATA_CHANNELS = 'dataLoadChannels';
  private readonly GRP_USER_DATA = 'mainUserData';
  constructor() {}

  ngOnInit(): void {
    // this.threadIsVisible = this.variableService.threadOpenSubject.getValue();

    const sideNavSub = this.variableService.sideNavIsVisible$.subscribe(
      (isVisibleValue) => {
        if (this.sideNavIsVisible !== isVisibleValue) {
          this.sideNavIsVisible = isVisibleValue;
          this.cdRef.markForCheck();
        }
      }
    );

    const threadSub = this.variableService.threadIsClosed$.subscribe(
      (isClosedValue) => {
        const newVisibility = !isClosedValue;
        if (this.threadIsVisible !== newVisibility) {
          this.threadIsVisible = newVisibility;
          this.cdRef.markForCheck();
        }
      }
    );
    this.subService.add(sideNavSub, this.GRP_UI_STATE);
    this.subService.add(threadSub, this.GRP_UI_STATE);

    const authSub = this.authService.user$.subscribe((user) => {
      if (user) {
        if (this.uid !== user.uid) {
          this.uid = user.uid;
          this.subService.unsubscribeGroup(this.GRP_DATA_KEYS);
          this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);
          this.loadUserSpecificData(this.uid);
        } else {
        }
      } else {
        this.uid = null;
        this.channelKeys = [];
        this.userChannels = [];
        this.selectedChannel = undefined;
        this.subService.unsubscribeGroup(this.GRP_DATA_KEYS);
        this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);
        this.subService.unsubscribeGroup(this.GRP_USER_DATA);
        this.userData = null;
      }
    });
    this.subService.add(authSub, this.GRP_AUTH);

    // const channelCreatedSub = this.variableService.channelCreated$.subscribe(
    //   () => {
    //     if (this.uid) {
    //       this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);
    //       this.loadChannels(this.uid);
    //     } else {
    //       // keine uid
    //     }
    //   }
    // );
    // this.subService.add(channelCreatedSub, this.GRP_CHANNEL_CREATED);

    const threadVisibilitySub = this.variableService.threadIsOpen$.subscribe(
      (isOpenValue) => {
        if (this.threadIsVisible !== isOpenValue) {
          this.threadIsVisible = isOpenValue;
          console.log(
            '[MainComponent] Thread Visible State Updated:',
            this.threadIsVisible
          );
          this.cdRef.markForCheck();
        }
      }
    );
    this.subService.add(threadVisibilitySub, this.GRP_UI_STATE);

    const channelCreatedSub = this.variableService.channelCreated$.subscribe(
      () => {
        if (this.uid) {
          console.log(
            '[MainComponent] Channel-Erstellung bemerkt, lade Kanäle neu...'
          );
          // Rufe die Methode auf, die getChannelsForUser aufruft
          this.loadChannels(this.uid);
          // Oder wenn die Keys neu geladen werden müssen: this.loadUserSpecificData(this.uid);
        } else {
          console.warn(
            '[MainComponent] Channel erstellt, aber keine UID vorhanden zum Neuladen.'
          );
        }
      }
    );
    this.subService.add(channelCreatedSub, this.GRP_CHANNEL_CREATED);
  }

  loadUserSpecificData(uid: string): void {
    const keysSub = this.firebaseService.getUserChannelKeys(uid).subscribe({
      next: (keys) => {
        this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);
        this.loadChannels(uid);
      },
      error: (err) => {
        /*...*/
      },
    });
    this.subService.add(keysSub, this.GRP_DATA_KEYS);
  }

  loadChannels(uid: string): void {
    this.subService.unsubscribeGroup(this.GRP_DATA_CHANNELS);

    const channelSub = this.firebaseService.getChannelsForUser(uid).subscribe({
      next: (channels) => {
        const oldSelectedKey = this.selectedChannel?.key;
        this.userChannels = [...channels];

        if (this.userChannels.length > 0) {
          let newSelectedChannel: ChannelWithKey | undefined = undefined;

          if (oldSelectedKey) {
            newSelectedChannel = this.userChannels.find(
              (c) => c.key === oldSelectedKey
            );
          }

          if (!newSelectedChannel) {
            newSelectedChannel = this.userChannels[0];
          }
          if (newSelectedChannel && newSelectedChannel.key) {
            if (
              !this.selectedChannel ||
              this.selectedChannel.key !== newSelectedChannel.key
            ) {
              this.selectedChannel = { ...newSelectedChannel };
            } else {
              // myb trotzdem laden
            }
          } else {
            this.selectedChannel = undefined;
          }
        } else {
          this.selectedChannel = undefined;
        }
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.userChannels = [];
        this.selectedChannel = undefined;
        this.cdRef.detectChanges();
      },
    });
    this.subService.add(channelSub, this.GRP_DATA_CHANNELS);
  }

  onChannelSelected(channel: ChannelWithKey): void {
    console.log('Channel selected:', channel);
    this.selectedChannel = { ...channel };
    this.selectedOtherUser = null;
    this.cdRef.markForCheck();
  }

  onUserSelected(user: User): void {
    console.log('User selected for DM:', user);
    if (user) {
      this.selectedOtherUser = { ...user };
      this.selectedChannel = undefined;
      this.cdRef.markForCheck();
    } else {
      console.warn('onUserSelected received null or undefined user');
      this.selectedOtherUser = null;
      this.selectedChannel = undefined;
      this.cdRef.markForCheck();
    }
  }

  toggleSideNav(): void {
    this.variableService.toggleSideNav();
  }

  toggleThread(): void {
    this.variableService.toggleThread();
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeAll();
  }
}
