import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { EnvironmentConfig } from '../config/environment.config';
import { HouseSummaryResponse } from '../models/saved-list.models';

/**
 * Saved list service
 * Handles all saved list-related API calls including adding, removing,
 * checking, and retrieving saved houses.
 * 
 * All methods require authentication (Bearer token) which is automatically
 * added by the tokenInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class SavedListService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  /**
   * Adds a house to the user's saved list
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID to add to saved list
   * @returns Observable that completes when the house is successfully added
   */
  addToSavedList(houseId: number): Observable<any> {
    return this.http
      .post<any>(`${this.baseUrl}/api/SavedList/${houseId}`, {})
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Removes a house from the user's saved list
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID to remove from saved list
   * @returns Observable that completes when the house is successfully removed
   */
  removeFromSavedList(houseId: number): Observable<any> {
    return this.http
      .delete<any>(`${this.baseUrl}/api/SavedList/${houseId}`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Checks if a house is saved by the current user
   * 
   * Requires authentication (Bearer token)
   * 
   * @param houseId The house ID to check
   * @returns Observable that emits true if the house is saved, false otherwise
   */
  isHouseSaved(houseId: number): Observable<boolean> {
    return this.http
      .get<boolean>(`${this.baseUrl}/api/SavedList/${houseId}`)
      .pipe(
        catchError((error) => {
          // If the house is not saved, the API might return 404
          // In that case, return false instead of throwing an error
          if (error.status === 404) {
            return new Observable<boolean>((observer) => {
              observer.next(false);
              observer.complete();
            });
          }
          return throwError(() => error);
        })
      );
  }

  /**
   * Retrieves all houses in the user's saved list
   * 
   * Requires authentication (Bearer token)
   * 
   * @returns Observable that emits an array of saved house summaries
   */
  getSavedHouses(): Observable<HouseSummaryResponse[]> {
    return this.http
      .get<HouseSummaryResponse[]>(`${this.baseUrl}/api/SavedList`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}

