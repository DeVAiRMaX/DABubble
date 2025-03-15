import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageComponent } from '../../shared/components/message/message.component';
import { ThreadComponent } from '../../shared/components/thread/thread.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, MessageComponent, ThreadComponent]
})
export class MainLayoutComponent {
  currentUser = {
    name: 'Frederik Beck',
    avatar: './assets/img/header_profilicon.png',
    online: true
  };

  users = [
    {
      name: 'Frederik Beck',
      avatar: 'assets/images/avatars/frederik.png',
      online: true,
      status: '(Du)'
    },
    {
      name: 'Sofia Müller',
      avatar: 'assets/images/avatars/sofia.png',
      online: true
    },
    {
      name: 'Noah Braun',
      avatar: 'assets/images/avatars/noah.png',
      online: true
    },
    {
      name: 'Elise Roth',
      avatar: 'assets/images/avatars/elise.png',
      online: false
    },
    {
      name: 'Elias Neumann',
      avatar: 'assets/images/avatars/elias.png',
      online: true
    },
    {
      name: 'Steffen Hoffmann',
      avatar: 'assets/images/avatars/steffen.png',
      online: true
    }
  ];

  messages = [
    {
      id: '1',
      content: 'Welche Version ist aktuell von Angular?',
      timestamp: '14:25 Uhr',
      user: {
        name: 'Noah Braun',
        avatar: 'assets/images/avatars/noah.png'
      }
    },
    {
      id: '2',
      content: 'Ich habe die gleiche Frage. Ich habe gegoogelt und es scheint, dass die aktuelle Version Angular 13 ist. Vielleicht weiß Frederik, ob es wahr ist.',
      timestamp: '14:30 Uhr',
      user: {
        name: 'Sofia Müller',
        avatar: 'assets/images/avatars/sofia.png'
      },
      reactions: [
        {
          emoji: '👍',
          count: 1
        }
      ]
    }
  ];

  selectedThread = {
    title: 'Entwicklerteam',
    parentMessage: this.messages[0],
    replies: [this.messages[1]]
  };

  channelMembers = this.users.slice(0, 3); // First 3 users for the channel
} 