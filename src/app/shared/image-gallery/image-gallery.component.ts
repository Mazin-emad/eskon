import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HouseMediaService } from '../../core/services/house-media.service';
import { ToastService } from '../toast/toast.service';
import { MediaItemResponse } from '../../core/models/media-item-response.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Image gallery component
 * Displays and manages house images (delete, set cover)
 */
@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-gallery.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageGalleryComponent {
  private readonly houseMediaService = inject(HouseMediaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() houseId!: number;
  @Input() images: MediaItemResponse[] = [];
  @Input() canManage = false; // Whether user can manage images (owner/admin)
  @Output() imagesChanged = new EventEmitter<void>();

  deletingIds = signal<Set<number>>(new Set());
  settingCoverId = signal<number | null>(null);

  /**
   * Deletes an image
   */
  deleteImage(mediaItemId: number): void {
    // Check if this is a valid mediaId (must be positive)
    if (mediaItemId <= 0) {
      this.toast.error('Invalid image ID. Cannot delete this image.');
      return;
    }

    if (!confirm('Are you sure you want to delete this image?')) {
      return;
    }

    if (!this.houseId) {
      this.toast.error('House ID is required');
      return;
    }

    this.deletingIds.update((ids) => new Set(ids).add(mediaItemId));

    this.houseMediaService
      .deleteHouseImage(this.houseId, mediaItemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Image deleted successfully');
          this.imagesChanged.emit();
          this.deletingIds.update((ids) => {
            const newSet = new Set(ids);
            newSet.delete(mediaItemId);
            return newSet;
          });
        },
        error: () => {
          this.deletingIds.update((ids) => {
            const newSet = new Set(ids);
            newSet.delete(mediaItemId);
            return newSet;
          });
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Sets an image as cover
   */
  setCoverImage(mediaItemId: number): void {
    // Check if this is a valid mediaId (must be positive)
    if (mediaItemId <= 0) {
      this.toast.error('Invalid image ID. Cannot set cover for this image.');
      return;
    }

    if (!this.houseId) {
      this.toast.error('House ID is required');
      return;
    }

    this.settingCoverId.set(mediaItemId);

    this.houseMediaService
      .setHouseCoverImage(this.houseId, mediaItemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success('Cover image updated');
          this.imagesChanged.emit();
          this.settingCoverId.set(null);
        },
        error: () => {
          this.settingCoverId.set(null);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Checks if an image is being deleted
   */
  isDeleting(mediaItemId: number): boolean {
    return this.deletingIds().has(mediaItemId);
  }

  /**
   * Checks if an image is being set as cover
   */
  isSettingCover(mediaItemId: number): boolean {
    return this.settingCoverId() === mediaItemId;
  }

  /**
   * Checks if an image has a valid mediaId for management
   */
  canManageImage(mediaItemId: number): boolean {
    return mediaItemId > 0;
  }
}

