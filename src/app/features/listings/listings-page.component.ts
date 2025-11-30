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
import { AmenityService } from '../../core/services/amenity.service';
import { HouseListItem, House } from '../../core/models/housing.models';
import { Amenity } from '../../core/models/amenity.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EnvironmentConfig } from '../../core/config/environment.config';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

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
  private readonly amenityService = inject(AmenityService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  houses = signal<HouseListItem[]>([]);
  housesWithDetails = signal<Map<number, House>>(new Map()); // Cache for house details with amenities
  loading = signal(false);
  savingHouseIds = signal<Set<number>>(new Set());
  loadingAmenities = signal(false);
  amenities = signal<Amenity[]>([]);

  // Filter state
  search = signal('');
  selectedCity = signal('');
  selectedType = signal('');
  selectedAmenityIds = signal<number[]>([]);
  maxPrice = signal(0);
  priceUpperBound = signal(5000);
  showSavedOnly = signal(false);

  // Pagination state
  currentPage = signal(1);
  itemsPerPage = signal(12);
  itemsPerPageOptions = [6, 12, 24, 48];

  /**
   * Initializes the component and loads houses and amenities
   */
  ngOnInit(): void {
    this.loadHouses();
    this.loadAmenities();
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
          // Clear house details cache when houses are reloaded
          this.housesWithDetails.set(new Map());
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Loads amenities from API
   */
  private loadAmenities(): void {
    this.loadingAmenities.set(true);
    this.amenityService
      .getAmenities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (amenities) => {
          this.amenities.set(amenities);
          this.loadingAmenities.set(false);
        },
        error: () => {
          this.loadingAmenities.set(false);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Toggles an amenity in the filter
   */
  toggleAmenity(amenityId: number): void {
    const current = this.selectedAmenityIds();
    if (current.includes(amenityId)) {
      this.selectedAmenityIds.set(current.filter((id) => id !== amenityId));
    } else {
      this.selectedAmenityIds.set([...current, amenityId]);
    }
    this.currentPage.set(1);
  }

  /**
   * Checks if an amenity is selected
   */
  isAmenitySelected(amenityId: number): boolean {
    return this.selectedAmenityIds().includes(amenityId);
  }

  /**
   * Loads house details for houses that need amenity filtering
   */
  private async loadHouseDetailsForFiltering(houseIds: number[]): Promise<void> {
    const detailsCache = this.housesWithDetails();
    const missingIds = houseIds.filter((id) => !detailsCache.has(id));

    if (missingIds.length === 0) {
      return; // All details already cached
    }

    // Fetch details for missing houses
    const requests = missingIds.map((id) =>
      this.housingService.getHouseById(id).pipe(
        catchError(() => of(null)), // Handle errors gracefully
        map((house) => ({ id, house }))
      )
    );

    forkJoin(requests)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          const newCache = new Map(detailsCache);
          results.forEach(({ id, house }) => {
            if (house) {
              newCache.set(id, house);
            }
          });
          this.housesWithDetails.set(newCache);
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
   * Gets filtered listings
   */
  readonly filteredListings = computed(() => {
    const allListings = this.houses().map((h) => this.toListingDisplay(h));
    const city = this.selectedCity().toLowerCase();
    const type = this.selectedType().toLowerCase();
    const max = this.maxPrice() || this.priceUpperBound() || 9999999;
    const q = this.search().toLowerCase();
    const savedOnly = this.showSavedOnly();
    const selectedAmenityIds = this.selectedAmenityIds();
    const detailsCache = this.housesWithDetails();

    // If amenities are selected, trigger loading of house details
    if (selectedAmenityIds.length > 0) {
      const houseIds = this.houses().map((h) => h.houseId);
      // Load details asynchronously (won't block filtering, but will update when loaded)
      setTimeout(() => {
        this.loadHouseDetailsForFiltering(houseIds);
      }, 0);
    }

    return allListings.filter((l) => {
      const matchesCity = !city || l.city.toLowerCase().includes(city);
      const matchesType = !type || l.type.toLowerCase() === type;
      const matchesPrice = l.price <= max;
      const matchesQ =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.location.toLowerCase().includes(q);
      const matchesSaved = !savedOnly || l.isSaved;

      // Filter by amenities if any are selected
      let matchesAmenities = true;
      if (selectedAmenityIds.length > 0) {
        const houseDetails = detailsCache.get(l.id);
        if (houseDetails && houseDetails.amenities) {
          const houseAmenityIds = houseDetails.amenities.map((a) => a.amenityId);
          // House must have ALL selected amenities
          matchesAmenities = selectedAmenityIds.every((id) =>
            houseAmenityIds.includes(id)
          );
        } else {
          // If details not loaded yet, include it temporarily (will be filtered when details load)
          // This allows the list to show while loading, then refine as details come in
          matchesAmenities = true;
        }
      }

      return (
        matchesCity &&
        matchesType &&
        matchesPrice &&
        matchesQ &&
        matchesSaved &&
        matchesAmenities
      );
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
    this.selectedAmenityIds.set([]);
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

