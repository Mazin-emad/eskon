import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HousingService } from '../../core/services/housing.service';
import { SavedListService } from '../../core/services/saved-list.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { House } from '../../core/models/housing.models';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * House details page component
 * Displays full details of a single house listing
 */
@Component({
  selector: 'app-house-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './house-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseDetailsComponent implements OnInit {
  private readonly housingService = inject(HousingService);
  private readonly savedListService = inject(SavedListService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  house = signal<House | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  currentImageIndex = signal(0);
  isSaving = signal(false);

  /**
   * Initializes the component and loads house details
   */
  ngOnInit(): void {
    const houseId = this.route.snapshot.paramMap.get('id');
    if (!houseId) {
      this.error.set('Invalid house ID');
      this.loading.set(false);
      return;
    }

    const id = parseInt(houseId, 10);
    if (isNaN(id)) {
      this.error.set('Invalid house ID');
      this.loading.set(false);
      return;
    }

    this.loadHouseDetails(id);
  }

  /**
   * Loads house details from API
   */
  private loadHouseDetails(id: number): void {
    this.loading.set(true);
    this.housingService
      .getHouseById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (house) => {
          this.house.set(house);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('House not found');
          this.loading.set(false);
        },
      });
  }

  /**
   * Changes the displayed image
   */
  setImageIndex(index: number): void {
    this.currentImageIndex.set(index);
  }

  /**
   * Navigates to next image
   */
  nextImage(): void {
    const house = this.house();
    if (!house) return;
    const maxIndex = house.imageUrls.length - 1;
    const current = this.currentImageIndex();
    if (current < maxIndex) {
      this.currentImageIndex.set(current + 1);
    } else {
      this.currentImageIndex.set(0);
    }
  }

  /**
   * Navigates to previous image
   */
  previousImage(): void {
    const house = this.house();
    if (!house) return;
    const maxIndex = house.imageUrls.length - 1;
    const current = this.currentImageIndex();
    if (current > 0) {
      this.currentImageIndex.set(current - 1);
    } else {
      this.currentImageIndex.set(maxIndex);
    }
  }

  /**
   * Gets the current image URL or placeholder
   */
  getCurrentImage(): string {
    const house = this.house();
    if (!house) return '';
    if (house.imageUrls.length > 0) {
      return house.imageUrls[this.currentImageIndex()];
    }
    return 'https://images.unsplash.com/photo-1560185008-b033106af2fb?q=80&w=1600&auto=format&fit=crop';
  }

  /**
   * Checks if user is authenticated
   */
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Toggles save status for the current house
   */
  toggleSave(): void {
    const house = this.house();
    if (!house || this.isSaving()) {
      return;
    }

    if (!this.isAuthenticated) {
      this.toast.error('Please login to save listings');
      return;
    }

    this.isSaving.set(true);
    const currentStatus = house.isSavedByCurrrentUser;
    const operation = currentStatus
      ? this.savedListService.removeFromSavedList(house.houseId)
      : this.savedListService.addToSavedList(house.houseId);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        // Update the house's saved status
        this.house.update(h => h ? { ...h, isSavedByCurrrentUser: !currentStatus } : null);
        this.toast.success(currentStatus ? 'Removed from saved list' : 'Added to saved list');
        this.isSaving.set(false);
      },
      error: () => {
        this.toast.error('Failed to update saved list');
        this.isSaving.set(false);
      },
    });
  }

  /**
   * Opens email client to contact the owner
   */
  contactOwner(): void {
    const house = this.house();
    if (!house || !house.owner.email) {
      this.toast.error('Owner email not available');
      return;
    }

    const subject = encodeURIComponent(`Inquiry about ${house.title}`);
    const body = encodeURIComponent(
      `Hello ${house.owner.fullName || 'Owner'},\n\n` +
      `I am interested in your property listing: ${house.title}\n\n` +
      `Please contact me at your earliest convenience.\n\n` +
      `Thank you!`
    );
    const mailtoLink = `mailto:${house.owner.email}?subject=${subject}&body=${body}`;
    
    window.location.href = mailtoLink;
  }
}

