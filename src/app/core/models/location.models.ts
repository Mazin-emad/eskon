/**
 * Location related data models
 */

/**
 * Request payload for creating or updating a location
 */
export interface LocationRequest {
  country: string;
  city: string;
  postalCode: string;
  street: string;
  buildingNumber: string;
  geoLat: string;
  geoLng: string;
}

/**
 * Location response structure
 */
export interface Location extends LocationRequest {
  id: number;
}

