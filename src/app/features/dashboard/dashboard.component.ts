import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HousingService } from '../../core/services/housing.service';
import { LocationService } from '../../core/services/location.service';
import { AmenityService } from '../../core/services/amenity.service';
import { SavedListService } from '../../core/services/saved-list.service';
import { AuthService } from '../../auth/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../shared/toast/toast.service';
import { InputFieldComponent } from '../../shared/input-field/input-field.component';
import { RouterLink } from '@angular/router';
import {
  HouseListItem,
  HouseRequest,
  House,
} from '../../core/models/housing.models';
import { HouseSummaryResponse } from '../../core/models/saved-list.models';
import {
  LocationRequest,
  Location,
} from '../../core/models/location.models';
import {
  AmenityRequest,
  Amenity,
} from '../../core/models/amenity.models';
import { MediaItemResponse } from '../../core/models/media-item-response.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isAdmin, getUserId } from '../../core/utils/jwt.util';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { HouseMediaService } from '../../core/services/house-media.service';

/**
 * Dashboard component
 * Displays different views based on user role:
 * - Regular users: Table of their houses with edit/delete actions
 * - Admins: Forms for adding amenities/locations + tables for all houses, amenities, and locations
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent, RouterLink, ImageUploadComponent, ImageGalleryComponent],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly housingService = inject(HousingService);
  private readonly locationService = inject(LocationService);
  private readonly amenityService = inject(AmenityService);
  private readonly savedListService = inject(SavedListService);
  private readonly houseMediaService = inject(HouseMediaService);
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  isAdminUser = signal(false);
  loading = signal(false);

  // User houses
  userHouses = signal<HouseListItem[]>([]);
  loadingHouses = signal(false);

  // Saved listings
  savedHouses = signal<HouseSummaryResponse[]>([]);
  loadingSavedHouses = signal(false);
  removingHouseId = signal<number | null>(null);

  // Admin data
  allHouses = signal<HouseListItem[]>([]);
  allLocations = signal<Location[]>([]);
  allAmenities = signal<Amenity[]>([]);
  loadingAdminData = signal(false);

  // Forms
  amenityForm = this.fb.nonNullable.group({
    amenityName: ['', [Validators.required, Validators.maxLength(50)]],
    category: ['', [Validators.maxLength(50)]],
  });

  locationForm = this.fb.nonNullable.group({
    country: ['', [Validators.required]],
    city: ['', [Validators.required]],
    postalCode: ['', [Validators.required]],
    street: ['', [Validators.required]],
    buildingNumber: ['', [Validators.required]],
    geoLat: ['', [Validators.required]],
    geoLng: ['', [Validators.required]],
  });

  // Edit states
  editingHouseId = signal<number | null>(null);
  editingLocationId = signal<number | null>(null);
  editingAmenityId = signal<number | null>(null);
  selectedAmenityIds = signal<number[]>([]);
  editingHouseImages = signal<MediaItemResponse[]>([]);
  loadingHouseImages = signal(false);
  houseEditForm = this.fb.nonNullable.group({
    Title: ['', [Validators.required, Validators.minLength(3)]],
    Description: ['', [Validators.required, Validators.minLength(10)]],
    LocationId: [0, [Validators.required, Validators.min(1)]],
    Area: [0, [Validators.required, Validators.min(1)]],
    NumberOfRooms: [0, [Validators.required, Validators.min(1)]],
    NumberOfBathrooms: [0, [Validators.required, Validators.min(1)]],
    PricePerMonth: [0, [Validators.required, Validators.min(1)]],
  });

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    // Redirect to login if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Check if user is admin
    const token = this.authService.accessToken;
    this.isAdminUser.set(isAdmin(token));

    if (this.isAdminUser()) {
      this.loadAdminData();
    } else {
      this.loadUserHouses();
      this.loadSavedHouses();
    }
  }

  /**
   * Loads houses for regular users
   * Filters to show only houses owned by the current user
   */
  private loadUserHouses(): void {
    this.loadingHouses.set(true);
    const token = this.authService.accessToken;
    const currentUserId = getUserId(token);

    this.housingService
      .getHouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (houses) => {
          // Filter to show only user's houses based on ownerId
          if (currentUserId) {
            const userHouses = houses.filter(house => house.ownerId === currentUserId);
            this.userHouses.set(userHouses);
          } else {
            // If we can't get user ID, show empty list
            this.userHouses.set([]);
          }
          this.loadingHouses.set(false);
        },
        error: () => {
          this.loadingHouses.set(false);
        },
      });
    
    // Also load amenities for edit form
    this.amenityService
      .getAmenities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (amenities) => {
          this.allAmenities.set(amenities);
        },
        error: () => {
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Loads saved houses for regular users
   */
  private loadSavedHouses(): void {
    this.loadingSavedHouses.set(true);
    this.savedListService
      .getSavedHouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (houses) => {
          this.savedHouses.set(houses);
          this.loadingSavedHouses.set(false);
        },
        error: () => {
          this.loadingSavedHouses.set(false);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Removes a house from saved list
   */
  removeFromSavedList(houseId: number): void {
    if (!confirm('Are you sure you want to remove this listing from your saved list?')) {
      return;
    }

    this.removingHouseId.set(houseId);
    this.savedListService
      .removeFromSavedList(houseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Removed from saved list');
          // Reload saved houses
          this.loadSavedHouses();
          this.removingHouseId.set(null);
        },
        error: () => {
          this.toast.error('Failed to remove from saved list');
          this.removingHouseId.set(null);
        },
      });
  }

  /**
   * Loads all data for admin users
   */
  private loadAdminData(): void {
    this.loadingAdminData.set(true);

    // Load all houses
    this.housingService
      .getHouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (houses) => {
          this.allHouses.set(houses);
        },
        error: () => {},
      });

    // Load all locations
    this.locationService
      .getLocations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations) => {
          this.allLocations.set(locations);
        },
        error: () => {},
      });

    // Load all amenities
    this.amenityService
      .getAmenities()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (amenities) => {
          this.allAmenities.set(amenities);
          this.loadingAdminData.set(false);
        },
        error: () => {
          this.loadingAdminData.set(false);
        },
      });
  }

  /**
   * Handles amenity form submission
   */
  onSubmitAmenity(): void {
    if (this.amenityForm.invalid) {
      this.amenityForm.markAllAsTouched();
      return;
    }

    const payload: AmenityRequest = this.amenityForm.getRawValue();
    const editingId = this.editingAmenityId();

    if (editingId) {
      // Update existing amenity
      this.amenityService
        .updateAmenity(editingId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Amenity updated successfully!');
            this.amenityForm.reset();
            this.editingAmenityId.set(null);
            this.loadAdminData();
          },
        });
    } else {
      // Create new amenity
      this.amenityService
        .addAmenity(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Amenity added successfully!');
            this.amenityForm.reset();
            this.loadAdminData();
          },
        });
    }
  }

  /**
   * Handles location form submission
   */
  onSubmitLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }

    const payload: LocationRequest = this.locationForm.getRawValue();
    const editingId = this.editingLocationId();

    if (editingId) {
      // Update existing location
      this.locationService
        .updateLocation(editingId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Location updated successfully!');
            this.locationForm.reset();
            this.editingLocationId.set(null);
            this.loadAdminData();
          },
        });
    } else {
      // Create new location
      this.locationService
        .addLocation(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('Location added successfully!');
            this.locationForm.reset();
            this.loadAdminData();
          },
        });
    }
  }

  /**
   * Deletes a house
   */
  deleteHouse(house: HouseListItem): void {
    if (!confirm(`Are you sure you want to delete "${house.title}"?`)) {
      return;
    }

    // For delete, we need the full house data - fetch it first
    this.housingService
      .getHouseById(house.houseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fullHouse) => {
          // Extract amenity IDs from amenity objects
          const amenityIds: number[] = [];
          if (fullHouse.amenities && fullHouse.amenities.length > 0) {
            fullHouse.amenities.forEach((amenity) => {
              amenityIds.push(amenity.amenityId);
            });
          }
          
          const payload: HouseRequest = {
            Area: fullHouse.area,
            Title: fullHouse.title,
            LocationId: fullHouse.location.locationId,
            Description: fullHouse.description,
            NumberOfRooms: fullHouse.numberOfRooms,
            PricePerMonth: fullHouse.pricePerMonth,
            NumberOfBathrooms: fullHouse.numberOfBathrooms,
            amenityIds: amenityIds,
          };

          this.housingService
            .deleteHouse(house.houseId, payload)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.toast.success('House deleted successfully!');
                if (this.isAdminUser()) {
                  this.loadAdminData();
                } else {
                  this.loadUserHouses();
                }
              },
            });
        },
      });
  }

  /**
   * Starts editing a house
   */
  editHouse(house: HouseListItem): void {
    this.housingService
      .getHouseById(house.houseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (fullHouse) => {
          this.editingHouseId.set(house.houseId);
          this.houseEditForm.patchValue({
            Title: fullHouse.title,
            Description: fullHouse.description,
            LocationId: fullHouse.location.locationId,
            Area: fullHouse.area,
            NumberOfRooms: fullHouse.numberOfRooms,
            NumberOfBathrooms: fullHouse.numberOfBathrooms,
            PricePerMonth: fullHouse.pricePerMonth,
          });
          // Extract amenity IDs from amenity objects
          const amenityIds: number[] = [];
          if (fullHouse.amenities && fullHouse.amenities.length > 0) {
            fullHouse.amenities.forEach((amenity) => {
              amenityIds.push(amenity.amenityId);
            });
          }
          this.selectedAmenityIds.set(amenityIds);
          
          // Load house images if available
          if (fullHouse.mediaItems && fullHouse.mediaItems.length > 0) {
            this.editingHouseImages.set(fullHouse.mediaItems);
          } else {
            this.editingHouseImages.set([]);
          }
        },
      });
  }

  /**
   * Saves house edits
   */
  saveHouseEdit(): void {
    if (this.houseEditForm.invalid) {
      this.houseEditForm.markAllAsTouched();
      return;
    }

    const houseId = this.editingHouseId();
    if (!houseId) return;

    const formValue = this.houseEditForm.getRawValue();
    const payload: HouseRequest = {
      ...formValue,
      amenityIds: this.selectedAmenityIds(),
    };

    this.housingService
      .updateHouse(houseId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('House updated successfully!');
          this.editingHouseId.set(null);
          this.selectedAmenityIds.set([]);
          this.houseEditForm.reset();
          if (this.isAdminUser()) {
            this.loadAdminData();
          } else {
            this.loadUserHouses();
          }
        },
      });
  }

  /**
   * Cancels house editing
   */
  cancelHouseEdit(): void {
    this.editingHouseId.set(null);
    this.selectedAmenityIds.set([]);
    this.editingHouseImages.set([]);
    this.houseEditForm.reset();
  }

  /**
   * Handles images uploaded event
   */
  onImagesUploaded(responses: MediaItemResponse[]): void {
    // Reload house details to get updated images
    const houseId = this.editingHouseId();
    if (houseId) {
      this.loadHouseImages(houseId);
    }
  }

  /**
   * Handles images changed event (after delete/set cover)
   */
  onImagesChanged(): void {
    // Reload house details to get updated images
    const houseId = this.editingHouseId();
    if (houseId) {
      this.loadHouseImages(houseId);
    }
  }

  /**
   * Loads house images
   */
  private loadHouseImages(houseId: number): void {
    this.loadingHouseImages.set(true);
    this.housingService
      .getHouseById(houseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (house) => {
          if (house.mediaItems && house.mediaItems.length > 0) {
            this.editingHouseImages.set(house.mediaItems);
          } else {
            this.editingHouseImages.set([]);
          }
          this.loadingHouseImages.set(false);
        },
        error: () => {
          this.loadingHouseImages.set(false);
        },
      });
  }

  /**
   * Toggles amenity selection for edit form
   */
  toggleEditAmenity(amenityId: number): void {
    const current = this.selectedAmenityIds();
    if (current.includes(amenityId)) {
      this.selectedAmenityIds.set(current.filter(id => id !== amenityId));
    } else {
      this.selectedAmenityIds.set([...current, amenityId]);
    }
  }

  /**
   * Checks if an amenity is selected in edit form
   */
  isEditAmenitySelected(amenityId: number): boolean {
    return this.selectedAmenityIds().includes(amenityId);
  }

  /**
   * Deletes a location
   */
  deleteLocation(location: Location): void {
    if (!confirm(`Are you sure you want to delete this location?`)) {
      return;
    }

    this.locationService
      .deleteLocation(location.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Location deleted successfully!');
          this.loadAdminData();
        },
      });
  }

  /**
   * Starts editing a location
   */
  editLocation(location: Location): void {
    this.editingLocationId.set(location.id);
    this.locationForm.patchValue({
      country: location.country,
      city: location.city,
      postalCode: location.postalCode,
      street: location.street,
      buildingNumber: location.buildingNumber,
      geoLat: location.geoLat,
      geoLng: location.geoLng,
    });
  }

  /**
   * Cancels location editing
   */
  cancelLocationEdit(): void {
    this.editingLocationId.set(null);
    this.locationForm.reset();
  }

  /**
   * Deletes an amenity
   */
  deleteAmenity(amenity: Amenity): void {
    if (!confirm(`Are you sure you want to delete "${amenity.amenityName}"?`)) {
      return;
    }

    this.amenityService
      .deleteAmenity(amenity.amenityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Amenity deleted successfully!');
          this.loadAdminData();
        },
      });
  }

  /**
   * Starts editing an amenity
   */
  editAmenity(amenity: Amenity): void {
    this.editingAmenityId.set(amenity.amenityId);
    this.amenityForm.patchValue({
      amenityName: amenity.amenityName,
      category: amenity.category || '',
    });
  }

  /**
   * Cancels amenity editing
   */
  cancelAmenityEdit(): void {
    this.editingAmenityId.set(null);
    this.amenityForm.reset();
  }
}

