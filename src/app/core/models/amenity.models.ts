/**
 * Amenity related data models
 */

/**
 * Request payload for creating or updating an amenity
 */
export interface AmenityRequest {
  amenityName: string; // required, max 50 chars
  category?: string; // optional, max 50 chars
}

/**
 * Amenity response structure
 */
export interface Amenity extends AmenityRequest {
  amenityId: number;
}

