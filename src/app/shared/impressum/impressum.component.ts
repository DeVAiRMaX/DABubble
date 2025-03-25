import { Component, signal } from '@angular/core';
import { SharedModule } from './../../shared';

@Component({
  selector: 'app-impressum',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './impressum.component.html',
  styleUrl: './impressum.component.scss'
})
export class ImpressumComponent {
  readonly panelOpenState = signal(false);
}
