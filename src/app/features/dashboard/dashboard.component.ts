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
import { AuthService } from '../../auth/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../shared/toast/toast.service';
import { InputFieldComponent } from '../../shared/input-field/input-field.component';
import { RouterLink } from '@angular/router';
import {
  HouseListItem,
  HouseRequest,
} from '../../core/models/housing.models';
import {
  LocationRequest,
  Location,
} from '../../core/models/location.models';
import {
  AmenityRequest,
  Amenity,
} from '../../core/models/amenity.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isAdmin } from '../../core/utils/jwt.util';

/**
 * Dashboard component
 * Displays different views based on user role:
 * - Regular users: Table of their houses with edit/delete actions
 * - Admins: Forms for adding amenities/locations + tables for all houses, amenities, and locations
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent, RouterLink],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly housingService = inject(HousingService);
  private readonly locationService = inject(LocationService);
  private readonly amenityService = inject(AmenityService);
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
    }
  }

  /**
   * Loads houses for regular users
   */
  private loadUserHouses(): void {
    this.loadingHouses.set(true);
    this.housingService
      .getHouses()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (houses) => {
          // Filter to show only user's houses (you may need to adjust this based on API response)
          this.userHouses.set(houses);
          this.loadingHouses.set(false);
        },
        error: () => {
          this.loadingHouses.set(false);
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
          const payload: HouseRequest = {
            Area: fullHouse.area,
            Title: fullHouse.title,
            LocationId: fullHouse.location.locationId,
            Description: fullHouse.description,
            NumberOfRooms: fullHouse.numberOfRooms,
            PricePerMonth: fullHouse.pricePerMonth,
            NumberOfBathrooms: fullHouse.numberOfBathrooms,
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

    const payload: HouseRequest = this.houseEditForm.getRawValue();

    this.housingService
      .updateHouse(houseId, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('House updated successfully!');
          this.editingHouseId.set(null);
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
    this.houseEditForm.reset();
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

