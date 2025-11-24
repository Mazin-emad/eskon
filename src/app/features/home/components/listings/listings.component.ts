import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HomeService, Listing } from '../../home.service';

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './listings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListingsComponent {
  private readonly home = inject(HomeService);

  @Input() city = '';
  @Input() type = '';
  @Input() minPrice = 0;
  @Input() maxPrice = 5000;

  search = '';
  priceUpperBound = 5000;
  selectedCity = '';
  selectedType = '';

  protected readonly all = this.home.listings;

  get filtered(): Listing[] {
    const city = (this.city || this.selectedCity).toLowerCase();
    const type = (this.type || this.selectedType).toLowerCase();
    const min = this.minPrice || 0;
    const max = this.maxPrice || this.priceUpperBound || 9999999;
    const q = (this.search || '').toLowerCase();
    return this.all.filter(l => {
      const matchesCity = !city || l.city.toLowerCase().includes(city);
      const matchesType = !type || l.type.toLowerCase() === type;
      const matchesPrice = l.price >= min && l.price <= max;
      const matchesQ = !q || l.title.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
      return matchesCity && matchesType && matchesPrice && matchesQ;
    });
  }

  get cities(): string[] {
    const unique = new Set(this.all.map(a => a.city));
    return Array.from(unique);
  }
}


