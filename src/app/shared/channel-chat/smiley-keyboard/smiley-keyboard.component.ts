import { Component, CUSTOM_ELEMENTS_SCHEMA , ElementRef, ViewChild, AfterViewInit, Inject} from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-smiley-keyboard',
  standalone: true,
  imports: [],
  templateUrl: './smiley-keyboard.component.html',
  styleUrl: './smiley-keyboard.component.scss',
   schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SmileyKeyboardComponent implements AfterViewInit {
  @ViewChild('picker', { static: true }) picker!: ElementRef;

  constructor(private dialogRef: MatDialogRef<SmileyKeyboardComponent>) {}

  ngAfterViewInit() {
    this.picker.nativeElement.addEventListener('emoji-click', (event: any) => {
      const emoji = event.detail.unicode;
      this.dialogRef.close(emoji); // 👈 hier wird das Emoji an die Hauptkomponente zurückgegeben
    });
  }
}