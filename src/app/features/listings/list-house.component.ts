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
import { AuthService } from '../../auth/services/auth.service';
import { AccountService } from '../../core/services/account.service';
import { ToastService } from '../../shared/toast/toast.service';
import { InputFieldComponent } from '../../shared/input-field/input-field.component';
import { RouterLink } from '@angular/router';
import { HouseRequest } from '../../core/models/housing.models';
import { Location } from '../../core/models/location.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  loading = signal(false);
  submitting = signal(false);
  locations = signal<Location[]>([]);
  loadingLocations = signal(false);

  houseForm = this.fb.nonNullable.group({
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

    // Load locations for dropdown
    this.loadLocations();
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
          this.locations.set(locations);
          this.loadingLocations.set(false);
        },
        error: () => {
          this.loadingLocations.set(false);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Handles form submission
   */
  onSubmit(): void {
    if (this.houseForm.invalid) {
      this.houseForm.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload: HouseRequest = this.houseForm.getRawValue();

    this.housingService
      .addHouse(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('House listed successfully!');
          this.houseForm.reset();
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

