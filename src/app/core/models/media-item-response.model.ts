/**
 * Media item response model
 * Represents a media item (image) associated with a house
 */
export interface MediaItemResponse {
  mediaId: number;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

