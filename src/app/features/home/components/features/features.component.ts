import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturesComponent {
  readonly items = [
    { title: 'Verified Hosts', desc: 'Book with confidence from trusted hosts.', icon: '✅' },
    { title: 'Easy Booking', desc: 'Smooth and fast booking experience.', icon: '⚡' },
    { title: 'Flexible Payments', desc: 'Multiple payment options available.', icon: '💳' },
    { title: 'Trusted by Thousands', desc: 'Loved by renters worldwide.', icon: '🌍' }
  ];
}


