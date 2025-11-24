import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { EnvironmentConfig } from '../config/environment.config';
import {
  LocationRequest,
  Location,
} from '../models/location.models';

/**
 * Location service
 * Handles all location-related API calls including listing, retrieving,
 * creating, updating, and deleting locations.
 * 
 * All methods require authentication (Bearer token) which is automatically
 * added by the tokenInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  /**
   * Retrieves a list of all locations
   * 
   * @returns Observable that emits an array of locations
   */
  getLocations(): Observable<Location[]> {
    return this.http
      .get<Location[]>(`${this.baseUrl}/api/Locations`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Retrieves a single location by its ID
   * 
   * @param id The location ID
   * @returns Observable that emits the location details
   */
  getLocationById(id: number): Observable<Location> {
    return this.http
      .get<Location>(`${this.baseUrl}/api/Locations/${id}`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Creates a new location
   * 
   * Requires authentication (Bearer token)
   * 
   * @param payload Location creation data
   * @returns Observable that emits the created location details
   */
  addLocation(payload: LocationRequest): Observable<Location> {
    return this.http
      .post<Location>(`${this.baseUrl}/api/Locations`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Updates an existing location
   * 
   * Requires authentication (Bearer token)
   * 
   * @param id The location ID to update
   * @param payload Location update data
   * @returns Observable that emits the updated location details
   */
  updateLocation(id: number, payload: LocationRequest): Observable<Location> {
    return this.http
      .put<Location>(`${this.baseUrl}/api/Locations/${id}`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Deletes a location
   * 
   * Requires authentication (Bearer token)
   * 
   * @param id The location ID to delete
   * @returns Observable that completes when deletion is successful
   */
  deleteLocation(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/api/Locations/${id}`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}

