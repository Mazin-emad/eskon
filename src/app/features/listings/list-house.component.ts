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
import { HouseRequest, House } from '../../core/models/housing.models';
import { Location, LocationRequest } from '../../core/models/location.models';
import { Amenity } from '../../core/models/amenity.models';
import { MediaItemResponse } from '../../core/models/media-item-response.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';

/**
 * List House page component
 * Allows authenticated users to add new house listings
 */
@Component({
  selector: 'app-list-house',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputFieldComponent, RouterLink, ImageUploadComponent],
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
  creatingLocation = signal(false);
  selectedAmenityIds = signal<number[]>([]);
  useNewLocation = signal(false);
  createdHouseId = signal<number | null>(null);
  showImageUpload = signal(false);

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
            // Simple validation - just ensure it's an array
            if (!Array.isArray(locations)) {
              this.locations.set([]);
              this.loadingLocations.set(false);
              return;
            }

            // Filter out null/undefined and ensure id exists, normalize id to number
            const validLocations = locations
              .filter((loc) => loc != null && typeof loc === 'object' && (loc.id != null || (loc as any).locationId != null))
              .map((loc) => {
                const id = loc.id ?? (loc as any).locationId;
                return {
                  ...loc,
                  id: Number(id)
                } as Location;
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
   * Creates a new location and adds it to the locations list
   * Then switches back to existing location mode and selects the new location
   */
  addLocation(): void {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }

    this.creatingLocation.set(true);
    const payload: LocationRequest = this.locationForm.getRawValue();

    this.locationService
      .addLocation(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (newLocation) => {
          // Add the new location to the locations list
          const currentLocations = this.locations();
          this.locations.set([...currentLocations, newLocation]);

          // Switch back to existing location mode
          this.useNewLocation.set(false);

          // Select the newly created location
          this.houseForm.patchValue({ LocationId: newLocation.id });

          // Clear the location form
          this.locationForm.reset();

          this.toast.success('Location added successfully!');
          this.creatingLocation.set(false);
        },
        error: () => {
          // Error handling is done by error interceptor
          this.creatingLocation.set(false);
        },
      });
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
   * Handles images uploaded event
   */
  onImagesUploaded(responses: MediaItemResponse[]): void {
    this.toast.success(`Successfully uploaded ${responses.length} image(s)`);
    // Optionally navigate after images are uploaded
    // this.router.navigate(['/dashboard']);
  }

  /**
   * Skips image upload and navigates to dashboard
   */
  skipImageUpload(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Resets the form to create another house
   */
  createAnotherHouse(): void {
    this.showImageUpload.set(false);
    this.createdHouseId.set(null);
    this.houseForm.reset();
    this.locationForm.reset();
    this.selectedAmenityIds.set([]);
    this.useNewLocation.set(false);
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
          next: (house: House) => {
            this.toast.success('House listed successfully! You can now upload images.');
            this.createdHouseId.set(house.houseId);
            this.showImageUpload.set(true);
            // Don't navigate yet - let user upload images first
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
          next: (house: House) => {
            this.toast.success('House listed successfully! You can now upload images.');
            this.createdHouseId.set(house.houseId);
            this.showImageUpload.set(true);
            // Don't navigate yet - let user upload images first
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
