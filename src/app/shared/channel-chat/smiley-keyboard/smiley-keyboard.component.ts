import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, ViewChild, AfterViewInit, Output, EventEmitter } from '@angular/core';

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

  // Emit the selected emoji to the parent component
  @Output() emojiSelected = new EventEmitter<string>();

  ngAfterViewInit() {
    this.picker.nativeElement.addEventListener('emoji-click', (event: any) => {
      const emoji = event.detail.unicode;
      this.emojiSelected.emit(emoji); // Emit the emoji instead of closing the dialog
    });
  }
}