/**
 * Saved list related data models
 */

/**
 * House summary response returned from GET /api/SavedList
 * This represents a saved house in the user's saved list
 */
export interface HouseSummaryResponse {
  houseId: number;
  title: string;
  pricePerMonth: number;
  numberOfRooms: number;
  numberOfBathrooms: number;
  area: number;
  coverImageUrl: string;
  formattedLocation: string;
  isSavedByCurrentUser: boolean;
}

