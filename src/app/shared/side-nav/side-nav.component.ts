import { Component } from '@angular/core';
import { SharedModule } from '../../shared';

@Component({
  selector: 'app-side-nav',
  standalone: true,
  imports: [SharedModule],
  templateUrl: './side-nav.component.html',
  styleUrl: './side-nav.component.scss'
})
export class SideNavComponent {
 
}
