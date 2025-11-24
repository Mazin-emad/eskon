import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { EnvironmentConfig } from '../config/environment.config';
import {
  AmenityRequest,
  Amenity,
} from '../models/amenity.models';

/**
 * Amenity service
 * Handles all amenity-related API calls including listing, retrieving,
 * creating, updating, and deleting amenities.
 * 
 * All methods require authentication (Bearer token) which is automatically
 * added by the tokenInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class AmenityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  /**
   * Retrieves a list of all amenities
   * 
   * @returns Observable that emits an array of amenities
   */
  getAmenities(): Observable<Amenity[]> {
    return this.http
      .get<Amenity[]>(`${this.baseUrl}/api/Amenities`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Retrieves a single amenity by its ID
   * 
   * @param id The amenity ID
   * @returns Observable that emits the amenity details
   */
  getAmenityById(id: number): Observable<Amenity> {
    return this.http
      .get<Amenity>(`${this.baseUrl}/api/Amenities/${id}`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Creates a new amenity
   * 
   * Requires authentication (Bearer token)
   * 
   * @param payload Amenity creation data
   * @returns Observable that emits the created amenity details
   */
  addAmenity(payload: AmenityRequest): Observable<Amenity> {
    return this.http
      .post<Amenity>(`${this.baseUrl}/api/Amenities`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Updates an existing amenity
   * 
   * Requires authentication (Bearer token)
   * 
   * @param id The amenity ID to update
   * @param payload Amenity update data
   * @returns Observable that emits the updated amenity details
   */
  updateAmenity(id: number, payload: AmenityRequest): Observable<Amenity> {
    return this.http
      .put<Amenity>(`${this.baseUrl}/api/Amenities/${id}`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Deletes an amenity
   * 
   * Requires authentication (Bearer token)
   * 
   * @param id The amenity ID to delete
   * @returns Observable that completes when deletion is successful
   */
  deleteAmenity(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/api/Amenities/${id}`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}

