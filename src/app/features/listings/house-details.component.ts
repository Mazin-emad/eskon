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
import { MediaItemResponse } from '../../core/models/media-item-response.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ImageUploadComponent } from '../../shared/image-upload/image-upload.component';
import { ImageGalleryComponent } from '../../shared/image-gallery/image-gallery.component';
import { HouseMediaService } from '../../core/services/house-media.service';
import { getUserId } from '../../core/utils/jwt.util';
import { EnvironmentConfig } from '../../core/config/environment.config';

/**
 * House details page component
 * Displays full details of a single house listing
 */
@Component({
  selector: 'app-house-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ImageUploadComponent,
    ImageGalleryComponent,
  ],
  templateUrl: './house-details.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HouseDetailsComponent implements OnInit {
  private readonly housingService = inject(HousingService);
  private readonly savedListService = inject(SavedListService);
  private readonly houseMediaService = inject(HouseMediaService);
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
  isOwner = signal(false);
  houseImages = signal<MediaItemResponse[]>([]);

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

          // Check if current user is the owner
          const token = this.authService.accessToken;
          const currentUserId = getUserId(token);
          this.isOwner.set(house.owner.userId === currentUserId);

          // Set images from mediaItems (backend always returns mediaItems with real mediaIds)
          if (house.mediaItems && house.mediaItems.length > 0) {
            // URLs from backend are already full URLs, but ensure they're properly formatted
            const mediaItemsWithUrls = house.mediaItems.map((item) => ({
              ...item,
              url: this.getFullImageUrl(item.url), // Handles both full and relative URLs
            }));
            this.houseImages.set(mediaItemsWithUrls);
          } else {
            this.houseImages.set([]);
          }

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
    const images = this.houseImages();
    if (images.length === 0) return;
    const maxIndex = images.length - 1;
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
    const images = this.houseImages();
    if (images.length === 0) return;
    const maxIndex = images.length - 1;
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
    const images = this.houseImages();
    if (images.length > 0) {
      const currentImage = images[this.currentImageIndex()];
      return currentImage?.url || '';
    }
    return 'https://images.unsplash.com/photo-1560185008-b033106af2fb?q=80&w=1600&auto=format&fit=crop';
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

  /**
   * Gets all image URLs for display
   */
  getImageUrls(): string[] {
    const images = this.houseImages();
    return images.map((img) => img.url);
  }

  /**
   * Handles images uploaded event
   */
  onImagesUploaded(responses: MediaItemResponse[]): void {
    this.loadHouseDetails(this.house()!.houseId);
  }

  /**
   * Handles images changed event (after delete/set cover)
   */
  onImagesChanged(): void {
    this.loadHouseDetails(this.house()!.houseId);
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
        this.house.update((h) =>
          h ? { ...h, isSavedByCurrrentUser: !currentStatus } : null
        );
        this.toast.success(
          currentStatus ? 'Removed from saved list' : 'Added to saved list'
        );
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
    const mailtoLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${house.owner.email}&subject=${subject}&body=${body}`;

    window.location.href = mailtoLink;
  }
}
