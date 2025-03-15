import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Message {
  id: string;
  content: string;
  timestamp: string;
  user: {
    name: string;
    avatar: string;
  };
  reactions?: {
    emoji: string;
    count: number;
  }[];
}

@Component({
  selector: 'app-message',
  templateUrl: './message.component.html',
  styleUrls: ['./message.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class MessageComponent {
  @Input() message!: Message;
} 