import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageComponent } from '../message/message.component';

@Component({
  selector: 'app-thread',
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss'],
  standalone: true,
  imports: [CommonModule, MessageComponent]
})
export class ThreadComponent {
  @Input() threadTitle: string = '';
  @Input() parentMessage: any;
  @Input() replies: any[] = [];
} 