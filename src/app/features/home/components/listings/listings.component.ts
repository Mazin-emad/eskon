import { ChangeDetectionStrategy, Component, DestroyRef, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HousingService } from '../../../../core/services/housing.service';
import { SavedListService } from '../../../../core/services/saved-list.service';
import { AuthService } from '../../../../auth/services/auth.service';
import { ToastService } from '../../../../shared/toast/toast.service';
import { HouseListItem } from '../../../../core/models/housing.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnvironmentConfig } from '../../../../core/config/environment.config';

/**
 * Listing display interface for home page
 */
interface ListingDisplay {
  id: number;
  title: string;
  price: number;
  location: string;
  city: string;
  type: string;
  image: string;
  rooms: number;
  bathrooms: number;
  area: number;
  isSaved: boolean;
}

@Component({
  selector: 'app-listings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './listings.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ListingsComponent implements OnInit {
  private readonly housingService = inject(HousingService);
  private readonly savedListService = inject(SavedListService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() city = '';
  @Input() type = '';
  @Input() minPrice = 0;
  @Input() maxPrice = 5000;
  @Input() limit: number = 8; // Limit for home page (first 8 listings)

  search = '';
  priceUpperBound = 5000;
  selectedCity = '';
  selectedType = '';
  showSavedOnly = false;

  houses = signal<HouseListItem[]>([]);
  loading = signal(false);
  savingHouseIds = signal<Set<number>>(new Set());

  /**
   * Initializes the component and loads houses
   */
  ngOnInit(): void {
    this.loadHouses();
  }

  /**
   * Loads houses from API
   */
  private loadHouses(): void {
    this.loading.set(true);
    this.housingService
      .getHouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (houses) => {
          this.houses.set(houses);
          // Calculate max price for filter
          if (houses.length > 0) {
            const maxPrice = Math.max(...houses.map(h => h.pricePerMonth));
            this.priceUpperBound = Math.ceil(maxPrice / 1000) * 1000; // Round up to nearest 1000
          }
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Converts HouseListItem to ListingDisplay format
   */
  private toListingDisplay(house: HouseListItem): ListingDisplay {
    // Extract city from formattedLocation (e.g., "Cairo, Main Street" -> "Cairo")
    const locationParts = house.formattedLocation.split(',');
    const city = locationParts[0]?.trim() || '';
    
    // Determine type based on number of rooms
    let type = 'Apartment';
    if (house.numberOfRooms >= 4) {
      type = 'House';
    } else if (house.numberOfRooms === 1) {
      type = 'Studio';
    }

    return {
      id: house.houseId,
      title: house.title,
      price: house.pricePerMonth,
      location: house.formattedLocation,
      city: city,
      type: type,
      image: house.coverImageUrl
        ? this.getFullImageUrl(house.coverImageUrl)
        : 'https://images.unsplash.com/photo-1560185008-b033106af2fb?q=80&w=1600&auto=format&fit=crop',
      rooms: house.numberOfRooms,
      bathrooms: house.numberOfBathrooms,
      area: house.area,
      isSaved: house.isSavedByCurrentUser || false,
    };
  }

  /**
   * Checks if user is authenticated
   */
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Toggles save status for a house
   */
  toggleSave(event: Event, houseId: number, currentStatus: boolean): void {
    event.stopPropagation();
    event.preventDefault();

    if (!this.isAuthenticated) {
      this.toast.error('Please login to save listings');
      return;
    }

    const savingIds = this.savingHouseIds();
    if (savingIds.has(houseId)) {
      return; // Already processing
    }

    this.savingHouseIds.update(ids => new Set(ids).add(houseId));

    const operation = currentStatus
      ? this.savedListService.removeFromSavedList(houseId)
      : this.savedListService.addToSavedList(houseId);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        // Update the house's saved status in the houses signal
        this.houses.update(houses =>
          houses.map(h =>
            h.houseId === houseId
              ? { ...h, isSavedByCurrentUser: !currentStatus }
              : h
          )
        );
        this.toast.success(currentStatus ? 'Removed from saved list' : 'Added to saved list');
        this.savingHouseIds.update(ids => {
          const newSet = new Set(ids);
          newSet.delete(houseId);
          return newSet;
        });
      },
      error: () => {
        this.toast.error('Failed to update saved list');
        this.savingHouseIds.update(ids => {
          const newSet = new Set(ids);
          newSet.delete(houseId);
          return newSet;
        });
      },
    });
  }

  /**
   * Checks if a house is currently being saved/unsaved
   */
  isSaving(houseId: number): boolean {
    return this.savingHouseIds().has(houseId);
  }

  /**
   * Gets filtered and limited listings
   */
  get filtered(): ListingDisplay[] {
    const allListings = this.houses().map(h => this.toListingDisplay(h));
    const city = (this.city || this.selectedCity).toLowerCase();
    const type = (this.type || this.selectedType).toLowerCase();
    const min = this.minPrice || 0;
    const max = this.maxPrice || this.priceUpperBound || 9999999;
    const q = (this.search || '').toLowerCase();
    
    const filtered = allListings.filter(l => {
      const matchesCity = !city || l.city.toLowerCase().includes(city);
      const matchesType = !type || l.type.toLowerCase() === type;
      const matchesPrice = l.price >= min && l.price <= max;
      const matchesQ = !q || l.title.toLowerCase().includes(q) || l.location.toLowerCase().includes(q);
      const matchesSaved = !this.showSavedOnly || l.isSaved;
      return matchesCity && matchesType && matchesPrice && matchesQ && matchesSaved;
    });

    // Limit to first N items for home page
    return this.limit > 0 ? filtered.slice(0, this.limit) : filtered;
  }

  /**
   * Gets unique cities from houses
   */
  get cities(): string[] {
    const allHouses = this.houses();
    const citySet = new Set<string>();
    allHouses.forEach(house => {
      const locationParts = house.formattedLocation.split(',');
      const city = locationParts[0]?.trim();
      if (city) {
        citySet.add(city);
      }
    });
    return Array.from(citySet).sort();
  }

  /**
   * Prepends the API base URL to relative image URLs
   * @param url The image URL (may be relative or absolute)
   * @returns The full URL with base URL prepended if it was relative
   */
  private getFullImageUrl(url: string): string {
    if (!url) {
      return '';
    }
    // If URL is already absolute (starts with http:// or https://), return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // If URL is relative (starts with /), prepend the API base URL
    if (url.startsWith('/')) {
      return `${EnvironmentConfig.apiBaseUrl}${url}`;
    }
    // Otherwise, assume it's relative and prepend base URL with /
    return `${EnvironmentConfig.apiBaseUrl}/${url}`;
  }
}


