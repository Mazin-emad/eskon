import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  signal,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HousingService } from '../../core/services/housing.service';
import { SavedListService } from '../../core/services/saved-list.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { HouseListItem } from '../../core/models/housing.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Listing display interface
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

/**
 * Listings page component
 * Displays all house listings with filters and pagination
 */
@Component({
  selector: 'app-listings-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './listings-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListingsPageComponent implements OnInit {
  private readonly housingService = inject(HousingService);
  private readonly savedListService = inject(SavedListService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  houses = signal<HouseListItem[]>([]);
  loading = signal(false);
  savingHouseIds = signal<Set<number>>(new Set());

  // Filter state
  search = signal('');
  selectedCity = signal('');
  selectedType = signal('');
  minPrice = signal(0);
  maxPrice = signal(0);
  priceUpperBound = signal(5000);
  showSavedOnly = signal(false);

  // Pagination state
  currentPage = signal(1);
  itemsPerPage = signal(12);
  itemsPerPageOptions = [6, 12, 24, 48];

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
            const maxPrice = Math.max(...houses.map((h) => h.pricePerMonth));
            this.priceUpperBound.set(Math.ceil(maxPrice / 1000) * 1000); // Round up to nearest 1000
            this.maxPrice.set(this.priceUpperBound());
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
      image:
        house.coverImageUrl ||
        'https://images.unsplash.com/photo-1560185008-b033106af2fb?q=80&w=1600&auto=format&fit=crop',
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
   * Gets filtered listings
   */
  readonly filteredListings = computed(() => {
    const allListings = this.houses().map((h) => this.toListingDisplay(h));
    const city = this.selectedCity().toLowerCase();
    const type = this.selectedType().toLowerCase();
    const min = this.minPrice() || 0;
    const max = this.maxPrice() || this.priceUpperBound() || 9999999;
    const q = this.search().toLowerCase();
    const savedOnly = this.showSavedOnly();

    return allListings.filter((l) => {
      const matchesCity = !city || l.city.toLowerCase().includes(city);
      const matchesType = !type || l.type.toLowerCase() === type;
      const matchesPrice = l.price >= min && l.price <= max;
      const matchesQ =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q);
      const matchesSaved = !savedOnly || l.isSaved;
      return matchesCity && matchesType && matchesPrice && matchesQ && matchesSaved;
    });
  });

  /**
   * Gets paginated listings
   */
  readonly paginatedListings = computed(() => {
    const filtered = this.filteredListings();
    const startIndex = (this.currentPage() - 1) * this.itemsPerPage();
    const endIndex = startIndex + this.itemsPerPage();
    return filtered.slice(startIndex, endIndex);
  });

  /**
   * Gets total pages
   */
  readonly totalPages = computed(() => {
    return Math.ceil(
      this.filteredListings().length / this.itemsPerPage()
    );
  });

  /**
   * Gets unique cities from houses
   */
  readonly cities = computed(() => {
    const allHouses = this.houses();
    const citySet = new Set<string>();
    allHouses.forEach((house) => {
      const locationParts = house.formattedLocation.split(',');
      const city = locationParts[0]?.trim();
      if (city) {
        citySet.add(city);
      }
    });
    return Array.from(citySet).sort();
  });

  /**
   * Resets filters
   */
  resetFilters(): void {
    this.search.set('');
    this.selectedCity.set('');
    this.selectedType.set('');
    this.minPrice.set(0);
    this.maxPrice.set(this.priceUpperBound());
    this.showSavedOnly.set(false);
    this.currentPage.set(1);
  }

  /**
   * Changes page
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      // Scroll to top of listings
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Gets page numbers for pagination
   */
  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, current page, and pages around current
      pages.push(1);
      if (current > 3) {
        pages.push(-1); // Ellipsis marker
      }
      for (
        let i = Math.max(2, current - 1);
        i <= Math.min(total - 1, current + 1);
        i++
      ) {
        pages.push(i);
      }
      if (current < total - 2) {
        pages.push(-1); // Ellipsis marker
      }
      pages.push(total);
    }

    return pages;
  }

  /**
   * Gets the range of items currently displayed
   */
  readonly displayedRange = computed(() => {
    const filtered = this.filteredListings();
    const total = filtered.length;
    if (total === 0) {
      return { start: 0, end: 0, total: 0 };
    }
    const start = (this.currentPage() - 1) * this.itemsPerPage() + 1;
    const end = Math.min(start + this.itemsPerPage() - 1, total);
    return { start, end, total };
  });

  /**
   * Changes items per page and resets to first page
   */
  changeItemsPerPage(newItemsPerPage: number): void {
    this.itemsPerPage.set(newItemsPerPage);
    this.currentPage.set(1);
  }
}

