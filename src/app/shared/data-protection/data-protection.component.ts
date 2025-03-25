import { Component, signal } from '@angular/core';
import { SharedModule } from './../../shared';


@Component({
  selector: 'app-data-protection',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './data-protection.component.html',
  styleUrl: './data-protection.component.scss'
})
export class DataProtectionComponent {
  readonly panelOpenState = signal(false);
}
