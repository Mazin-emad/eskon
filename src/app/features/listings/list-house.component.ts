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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HousingService } from '../../core/services/housing.service';
import { LocationService } from '../../core/services/location.service';
import { AmenityService } from '../../core/services/amenity.service';
import { AuthService } from '../../auth/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../shared/toast/toast.service';
import { InputFieldComponent } from '../../shared/input-field/input-field.component';
import { RouterLink } from '@angular/router';
import { HouseRequest } from '../../core/models/housing.models';
import { Location, LocationRequest } from '../../core/models/location.models';
import { Amenity } from '../../core/models/amenity.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

/**
 * List House page component
 * Allows authenticated users to add new house listings
 */
@Component({
  selector: 'app-list-house',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent, RouterLink],
  templateUrl: './list-house.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListHouseComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly housingService = inject(HousingService);
  private readonly locationService = inject(LocationService);
  private readonly amenityService = inject(AmenityService);
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);
  submitting = signal(false);
  locations = signal<Location[]>([]);
  amenities = signal<Amenity[]>([]);
  loadingLocations = signal(false);
  loadingAmenities = signal(false);
  selectedAmenityIds = signal<number[]>([]);
  useNewLocation = signal(false);

  houseForm = this.fb.nonNullable.group({
    Title: ['', [Validators.required, Validators.minLength(3)]],
    Description: ['', [Validators.required, Validators.minLength(10)]],
    LocationId: [0, [Validators.required, Validators.min(1)]],
    Area: [0, [Validators.required, Validators.min(1)]],
    NumberOfRooms: [0, [Validators.required, Validators.min(1)]],
    NumberOfBathrooms: [0, [Validators.required, Validators.min(1)]],
    PricePerMonth: [0, [Validators.required, Validators.min(1)]],
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

  /**
   * Initializes the component
   */
  ngOnInit(): void {
    // Redirect to login if not authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Load locations and amenities for dropdowns
    this.loadLocations();
    this.loadAmenities();
  }

  /**
   * Loads available locations
   */
  private loadLocations(): void {
    this.loadingLocations.set(true);
    this.locationService
      .getLocations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (locations) => {
          try {
            // Filter out any invalid locations and ensure all required fields exist
            // Handle both 'id' and 'locationId' property names
            const validLocations = (Array.isArray(locations) ? locations : [])
              .filter((loc) => {
                // Strict validation: must be an object with a valid id
                if (!loc || typeof loc !== 'object' || Array.isArray(loc)) return false;
                const id = loc.id ?? loc.locationId;
                if (id == null || id === undefined) return false;
                const numId = Number(id);
                if (isNaN(numId) || numId <= 0) return false;
                return true;
              })
              .map((loc) => {
                // Normalize the location object to ensure it has 'id' property
                const normalizedLoc = { ...loc };
                if (!normalizedLoc.id && normalizedLoc.locationId) {
                  normalizedLoc.id = normalizedLoc.locationId;
                }
                // Ensure id is a number
                normalizedLoc.id = Number(normalizedLoc.id);
                return normalizedLoc;
              });
            this.locations.set(validLocations);
          } catch (error) {
            console.error('Error processing locations:', error);
            this.locations.set([]);
          }
          this.loadingLocations.set(false);
        },
        error: (error) => {
          console.error('Error loading locations:', error);
          this.locations.set([]);
          this.loadingLocations.set(false);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Loads available amenities
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
   * Toggles amenity selection
   */
  toggleAmenity(amenityId: number): void {
    const current = this.selectedAmenityIds();
    if (current.includes(amenityId)) {
      this.selectedAmenityIds.set(current.filter((id) => id !== amenityId));
    } else {
      this.selectedAmenityIds.set([...current, amenityId]);
    }
  }

  /**
   * Checks if an amenity is selected
   */
  isAmenitySelected(amenityId: number): boolean {
    return this.selectedAmenityIds().includes(amenityId);
  }

  /**
   * Toggles between using existing location or creating new location
   */
  toggleLocationMode(): void {
    const newMode = !this.useNewLocation();
    this.useNewLocation.set(newMode);

    if (newMode) {
      // Clear LocationId when switching to new location mode
      this.houseForm.patchValue({ LocationId: 0 });
    } else {
      // Clear location form when switching to existing location mode
      this.locationForm.reset();
    }
  }

  /**
   * Checks if LocationId is invalid (0, null, undefined, or empty)
   * Helper method for template validation
   */
  isLocationIdInvalid(): boolean {
    const value = this.houseForm.controls.LocationId.value;
    if (!value) return true;
    const numValue = Number(value);
    return isNaN(numValue) || numValue === 0;
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    // Validate appropriate form based on mode
    if (this.useNewLocation()) {
      if (this.locationForm.invalid) {
        this.locationForm.markAllAsTouched();
        return;
      }
    } else {
      const locationIdValue = this.houseForm.controls.LocationId.value;
      const locationIdNum = Number(locationIdValue);
      if (
        !locationIdValue ||
        locationIdValue === 0 ||
        locationIdValue === '0' ||
        isNaN(locationIdNum) ||
        locationIdNum === 0
      ) {
        this.houseForm.controls.LocationId.markAsTouched();
        this.toast.error('Please select a location or add a new one');
        return;
      }
    }

    if (this.houseForm.invalid) {
      this.houseForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const formValue = this.houseForm.getRawValue();

    // If using new location, create it first
    if (this.useNewLocation()) {
      const locationPayload: LocationRequest = this.locationForm.getRawValue();

      this.locationService
        .addLocation(locationPayload)
        .pipe(
          switchMap((locationResponse) => {
            // Handle both 'locationId' and 'id' response formats
            const locationId =
              (locationResponse as any).locationId || locationResponse.id;

            const payload: HouseRequest = {
              ...formValue,
              LocationId: locationId,
              amenityIds: this.selectedAmenityIds(),
            };

            return this.housingService.addHouse(payload);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: () => {
            this.toast.success('House listed successfully!');
            this.houseForm.reset();
            this.locationForm.reset();
            this.selectedAmenityIds.set([]);
            this.useNewLocation.set(false);
            this.router.navigate(['/listings']);
          },
          error: () => {
            this.submitting.set(false);
            // Error handling is done by error interceptor
          },
          complete: () => {
            this.submitting.set(false);
          },
        });
    } else {
      // Use existing location
      // Convert LocationId to number (HTML select returns string)
      const locationId = Number(formValue.LocationId);
      if (isNaN(locationId) || locationId === 0) {
        this.toast.error('Please select a valid location');
        this.submitting.set(false);
        return;
      }

      const payload: HouseRequest = {
        ...formValue,
        LocationId: locationId,
        amenityIds: this.selectedAmenityIds(),
      };

      this.housingService
        .addHouse(payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.toast.success('House listed successfully!');
            this.houseForm.reset();
            this.selectedAmenityIds.set([]);
            this.router.navigate(['/dashboard']);
          },
          error: () => {
            this.submitting.set(false);
            // Error handling is done by error interceptor
          },
          complete: () => {
            this.submitting.set(false);
          },
        });
    }
  }
}
