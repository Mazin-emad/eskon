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
 * Image upload component
 * Handles uploading multiple images for a house
 */
@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './image-upload.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageUploadComponent {
  private readonly houseMediaService = inject(HouseMediaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  @Input() houseId!: number;
  @Output() imagesUploaded = new EventEmitter<MediaItemResponse[]>();

  uploading = signal(false);
  uploadProgress = signal(0);
  selectedFiles = signal<File[]>([]);
  previewUrls = signal<string[]>([]);

  /**
   * Handles file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.selectedFiles.set([...this.selectedFiles(), ...files]);
      this.updatePreviews();
    }
  }

  /**
   * Updates preview URLs for selected files
   */
  private updatePreviews(): void {
    const files = this.selectedFiles();
    const urls: string[] = [];
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          urls.push(e.target.result as string);
          if (urls.length === files.length) {
            this.previewUrls.set(urls);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Removes a file from selection
   */
  removeFile(index: number): void {
    const files = this.selectedFiles();
    const previews = this.previewUrls();
    files.splice(index, 1);
    previews.splice(index, 1);
    this.selectedFiles.set([...files]);
    this.previewUrls.set([...previews]);
  }

  /**
   * Uploads selected images
   */
  uploadImages(): void {
    const files = this.selectedFiles();
    if (!files || files.length === 0) {
      this.toast.error('Please select at least one image');
      return;
    }

    if (!this.houseId) {
      this.toast.error('House ID is required');
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);

    this.houseMediaService
      .uploadMultipleHouseImages(this.houseId, files)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (responses) => {
          this.toast.success(`Successfully uploaded ${responses.length} image(s)`);
          this.imagesUploaded.emit(responses);
          this.selectedFiles.set([]);
          this.previewUrls.set([]);
          this.uploadProgress.set(100);
          this.uploading.set(false);
          
          // Reset file input
          const fileInput = document.getElementById('file-input') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = '';
          }
        },
        error: () => {
          this.uploading.set(false);
          this.uploadProgress.set(0);
          // Error handling is done by error interceptor
        },
      });
  }

  /**
   * Clears all selected files
   */
  clearSelection(): void {
    this.selectedFiles.set([]);
    this.previewUrls.set([]);
    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}

