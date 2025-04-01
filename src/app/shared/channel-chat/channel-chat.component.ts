import {
  Component,
  inject,
  Input,
  OnChanges,
  OnInit,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { VariablesService } from '../../variables.service';

import { SharedModule } from '../../shared';
import { EditChannelComponent } from './edit-channel/edit-channel.component';
import { AddUserToChannelOverlayComponent } from './add-user-to-channel-overlay/add-user-to-channel-overlay.component';
import { CommonModule } from '@angular/common';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogModule,
} from '@angular/material/dialog';
import { ChannelMembersOverlayComponent } from './channel-members-overlay/channel-members-overlay.component';
import { ChannelWithKey } from '../interfaces/channel';
import { TaggingPersonsDialogComponent } from './tagging-persons-dialog/tagging-persons-dialog.component';
import { SubService } from '../services/sub.service';

@Component({
  selector: 'app-channel-chat',
  standalone: true,
  imports: [
    AddUserToChannelOverlayComponent,
    CommonModule,
    MatDialogModule,
    SharedModule,
  ],
  templateUrl: './channel-chat.component.html',
  styleUrl: './channel-chat.component.scss',
})
export class ChannelChatComponent implements OnInit, OnChanges, OnDestroy {
  addUserToChannelOverlayIsVisible: boolean = false;
  @Input() channel!: ChannelWithKey;
  private variableService: VariablesService = inject(VariablesService);
  private subService: SubService = inject(SubService);
  private dialog: MatDialog = inject(MatDialog);
  private readonly SUB_GROUP_NAME = 'channelChatSubs';

  constructor() {
    this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
      (value) => {
        this.addUserToChannelOverlayIsVisible = value;
      }
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['channel'] && changes['channel'].currentValue) {
      const currentChannel = changes['channel'].currentValue as ChannelWithKey;
      console.log(
        'ChannelChatComponent ngOnChanges - Channel erhalten:',
        currentChannel.channelName,
        'mit Key:',
        currentChannel.key
      );
    } else if (
      changes['channel'] &&
      !changes['channel'].currentValue &&
      !changes['channel'].firstChange
    ) {
      console.warn(
        'ChannelChatComponent ngOnChanges - Channel wurde entfernt oder ist undefined.'
      );
    }
  }

  ngOnInit(): void {
    if (this.channel) {
      console.log(
        'ChannelChatComponent ngOnInit - Channel war bereits verfügbar:',
        this.channel.channelName,
        'mit Key:',
        this.channel.key
      );
    } else {
      console.warn(
        'ChannelChatComponent ngOnInit - Channel war bei ngOnInit noch nicht verfügbar.'
      );
    }

    const overlayVisibilitySub =
      this.variableService.addUserToChannelOverlayIsVisible$.subscribe(
        (value) => {
          this.addUserToChannelOverlayIsVisible = value;
        }
      );

    this.subService.add(overlayVisibilitySub, this.SUB_GROUP_NAME);
  }

  ngOnDestroy(): void {
    this.subService.unsubscribeGroup(this.SUB_GROUP_NAME);
  }

  toggleAddUserToChannelOverlay() {
    this.variableService.toggleAddUserToChannelOverlay();
    console.log(this.addUserToChannelOverlayIsVisible);
  }

  toggleThread() {
    if (this.variableService['isClosedSubject']?.value) {
      this.variableService.toggleThread();
    }
  }

  openEditChannelDialog() {
    const dialogRef = this.dialog.open(EditChannelComponent, {
      maxWidth: 'none',
      panelClass: 'custom-dialog-container',
      data: { channelKey: this.channel?.key },
    });
  }

  openAddUserToChannelDialog() {
    const targetElement = document.querySelector('.add_btn_user');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(AddUserToChannelOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: 'custom-dialog',
        data: { channelKey: this.channel?.key },
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();
          const newLeft = rect.right - dialogRect.width + window.scrollX;
          dialogElement.style.left = `${newLeft}px`;
          dialogElement.style.position = 'absolute';
          dialogElement.style.maxWidth = '515px';
          dialogElement.style.maxHeight = '295px';
        }
      }, 0);
    }
  }

  openChannelMembersDialog() {
    const targetElement = document.querySelector(
      '.channel-chat-header-right-user-container'
    );
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(ChannelMembersOverlayComponent, {
        position: { top: `${rect.bottom + 20 + window.scrollY}px` },
        panelClass: ['custom-dialog', 'memberOverlay'],
        data: { channelKey: this.channel?.key },
      });
      const childEventSub = dialogRef.componentInstance.childEvent.subscribe(
        () => {
          this.openAddUserToChannelDialog();
        }
      );

      this.subService.add(childEventSub, this.SUB_GROUP_NAME);

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();
          const newLeft = rect.right - dialogRect.width + window.scrollX;
          dialogElement.style.left = `${newLeft}px`;
          dialogElement.style.position = 'absolute';
          dialogElement.style.maxWidth = '415px';
          dialogElement.style.height = '700px';
        }
      }, 20);
    }
  }

  openTagPeopleDialog() {
    const targetElement = document.querySelector('.input-container-wrapper');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const dialogRef = this.dialog.open(TaggingPersonsDialogComponent, {
        position: {
          bottom: `${window.innerHeight - rect.top + 20}px`,
          left: `${rect.left + 20 + window.scrollX}px`,
        },
        panelClass: ['tagging-dialog', 'transparentBackdrop'],
        data: { channelKey: this.channel?.key },
      });

      setTimeout(() => {
        const dialogElement = document.querySelector(
          'mat-dialog-container'
        ) as HTMLElement;
        if (dialogElement) {
          const dialogRect = dialogElement.getBoundingClientRect();

          dialogElement.style.position = 'absolute';
          dialogElement.style.width = '350px';

          dialogElement.style.borderBottomLeftRadius = '0px';
        }
      }, 10);
    }
  }
}
