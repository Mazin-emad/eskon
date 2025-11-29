/**
 * Housing related data models
 */

/**
 * Request payload for creating or updating a house
 */
export interface HouseRequest {
  Area: number;
  Title: string;
  LocationId: number;
  Description: string;
  NumberOfRooms: number;
  PricePerMonth: number;
  NumberOfBathrooms: number;
  amenityIds: number[];
}

/**
 * Owner information in house response
 */
export interface HouseOwner {
  userId: string | null;
  fullName: string | null;
  email: string | null;
}

/**
 * Location information in house response
 */
export interface HouseLocation {
  locationId: number;
  country: string;
  city: string;
  postalCode: string;
  street: string;
  buildingNumber: string;
  geoLat: string;
  geoLng: string;
}

/**
 * Full house details returned from GET /api/House/:id
 */
export interface House {
  houseId: number;
  title: string;
  description: string;
  pricePerMonth: number;
  numberOfRooms: number;
  numberOfBathrooms: number;
  area: number;
  owner: HouseOwner;
  location: HouseLocation;
  imageUrls: string[];
  amenities: string[];
  isSavedByCurrrentUser: boolean; // Note: API uses typo "CurrrentUser"
}

/**
 * Simplified house information returned from GET /api/House (list)
 */
export interface HouseListItem {
  houseId: number;
  title: string;
  pricePerMonth: number;
  numberOfRooms: number;
  numberOfBathrooms: number;
  area: number;
  coverImageUrl: string;
  formattedLocation: string;
  isSavedByCurrentUser: boolean; // Note: API uses correct spelling here
  ownerId: string | null; // Owner's user ID
}

