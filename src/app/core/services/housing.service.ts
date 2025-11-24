import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { EnvironmentConfig } from '../config/environment.config';
import {
  HouseRequest,
  House,
  HouseListItem,
} from '../models/housing.models';

/**
 * Housing service
 * Handles all housing-related API calls including listing, retrieving,
 * creating, updating, and deleting houses.
 * 
 * All methods require authentication (Bearer token) which is automatically
 * added by the tokenInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class HousingService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = EnvironmentConfig.apiBaseUrl;

  /**
   * Retrieves a list of all houses
   * 
   * For authenticated users: Returns houses with saved/favorited status
   * For anonymous users: Returns all houses without saved status
   * 
   * @returns Observable that emits an array of house list items
   */
  getHouses(): Observable<HouseListItem[]> {
    return this.http
      .get<HouseListItem[]>(`${this.baseUrl}/api/House`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Retrieves a single house by its ID
   * 
   * @param id The house ID
   * @returns Observable that emits the full house details
   */
  getHouseById(id: number): Observable<House> {
    return this.http
      .get<House>(`${this.baseUrl}/api/House/${id}`)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Creates a new house listing
   * 
   * Requires authentication (Bearer token)
   * 
   * @param payload House creation data
   * @returns Observable that emits the created house details
   */
  addHouse(payload: HouseRequest): Observable<House> {
    return this.http
      .post<House>(`${this.baseUrl}/api/House`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Updates an existing house listing
   * 
   * Requires authentication (Bearer token)
   * 
   * @param id The house ID to update
   * @param payload House update data
   * @returns Observable that emits the updated house details
   */
  updateHouse(id: number, payload: HouseRequest): Observable<House> {
    return this.http
      .put<House>(`${this.baseUrl}/api/House/${id}`, payload)
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  /**
   * Deletes a house listing
   * 
   * Requires authentication (Bearer token)
   * Note: The API requires the HouseRequest payload in the body along with the ID in the path
   * 
   * @param id The house ID to delete
   * @param payload House request data (required by API)
   * @returns Observable that completes when deletion is successful
   */
  deleteHouse(id: number, payload: HouseRequest): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/api/House/${id}`, { body: payload })
      .pipe(
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}

