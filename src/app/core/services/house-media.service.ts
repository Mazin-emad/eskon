import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, throwError } from 'rxjs';
import { EnvironmentConfig } from '../config/environment.config';
import { MediaItemResponse } from '../models/media-item-response.model';

/**
 * House media service
 * Handles all house image/media-related API calls including uploading,
 * deleting, and setting cover images.
 * 
 * All methods require authentication (Bearer token) which is automatically
 * added by the tokenInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class HouseMediaService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  /**
   * Uploads a single house image
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID
   * @param file The image file to upload
   * @returns Observable that emits the uploaded media item response
   */
  uploadHouseImage(houseId: number, file: File): Observable<MediaItemResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post<MediaItemResponse>(
        `${this.baseUrl}/api/House/${houseId}/images`,
        formData
      )
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Uploads multiple house images sequentially
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID
   * @param files Array of image files to upload
   * @returns Observable that emits an array of uploaded media item responses
   */
  uploadMultipleHouseImages(
    houseId: number,
    files: File[]
  ): Observable<MediaItemResponse[]> {
    if (!files || files.length === 0) {
      return new Observable<MediaItemResponse[]>((observer) => {
        observer.next([]);
        observer.complete();
      });
    }

    // Upload all files in parallel using forkJoin
    const uploadObservables = files.map((file) =>
      this.uploadHouseImage(houseId, file)
    );

    return forkJoin(uploadObservables).pipe(
      catchError((error) => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Deletes a house image
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID
   * @param mediaItemId The media item ID to delete
   * @returns Observable that completes when deletion is successful
   */
  deleteHouseImage(
    houseId: number,
    mediaItemId: number
  ): Observable<void> {
    return this.http
      .delete<void>(
        `${this.baseUrl}/api/House/${houseId}/images/${mediaItemId}`
      )
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Sets an image as the cover image for a house
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID
   * @param mediaItemId The media item ID to set as cover
   * @returns Observable that emits the updated media item response
   */
  setHouseCoverImage(
    houseId: number,
    mediaItemId: number
  ): Observable<MediaItemResponse> {
    return this.http
      .put<MediaItemResponse>(
        `${this.baseUrl}/api/House/${houseId}/images/${mediaItemId}/set-cover`,
        {}
      )
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}

