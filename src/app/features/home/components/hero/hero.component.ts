import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './hero.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeroComponent {
  @Input() city = '';
  @Output() cityChange = new EventEmitter<string>();
  @Input() type = '';
  @Output() typeChange = new EventEmitter<string>();
  @Input() minPrice = 0;
  @Output() minPriceChange = new EventEmitter<number>();
  @Input() maxPrice = 5000;
  @Output() maxPriceChange = new EventEmitter<number>();
}


