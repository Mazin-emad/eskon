import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { AmenityService } from './amenity.service';
import { EnvironmentConfig } from '../config/environment.config';
import {
  AmenityRequest,
  Amenity,
} from '../models/amenity.models';

describe('AmenityService', () => {
  let service: AmenityService;
  let httpMock: HttpTestingController;
  const baseUrl = EnvironmentConfig.apiBaseUrl;

  const mockAmenityRequest: AmenityRequest = {
    amenityName: 'Free Parking on Premises',
    category: 'Logistics',
  };

  const mockAmenityRequestWithoutCategory: AmenityRequest = {
    amenityName: 'Wi-Fi',
  };

  const mockAmenity: Amenity = {
    amenityId: 1,
    ...mockAmenityRequest,
  };

  const mockAmenityWithoutCategory: Amenity = {
    amenityId: 2,
    ...mockAmenityRequestWithoutCategory,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AmenityService],
    });
    service = TestBed.inject(AmenityService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getAmenities', () => {
    it('should return an array of amenities', () => {
      const mockAmenities: Amenity[] = [mockAmenity, mockAmenityWithoutCategory];

      service.getAmenities().subscribe((amenities) => {
        expect(amenities).toEqual(mockAmenities);
        expect(amenities.length).toBe(2);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAmenities);
    });

    it('should handle errors', () => {
      service.getAmenities().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getAmenityById', () => {
    it('should return a single amenity by ID', () => {
      const amenityId = 1;

      service.getAmenityById(amenityId).subscribe((amenity) => {
        expect(amenity).toEqual(mockAmenity);
        expect(amenity.amenityId).toBe(amenityId);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities/${amenityId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockAmenity);
    });

    it('should handle errors', () => {
      const amenityId = 999;

      service.getAmenityById(amenityId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities/${amenityId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('addAmenity', () => {
    it('should create a new amenity with category', () => {
      service.addAmenity(mockAmenityRequest).subscribe((amenity) => {
        expect(amenity).toEqual(mockAmenity);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockAmenityRequest);
      req.flush(mockAmenity);
    });

    it('should create a new amenity without category', () => {
      service.addAmenity(mockAmenityRequestWithoutCategory).subscribe((amenity) => {
        expect(amenity).toEqual(mockAmenityWithoutCategory);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockAmenityRequestWithoutCategory);
      req.flush(mockAmenityWithoutCategory);
    });

    it('should handle errors', () => {
      service.addAmenity(mockAmenityRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('updateAmenity', () => {
    it('should update an existing amenity', () => {
      const amenityId = 1;
      const updatedRequest: AmenityRequest = {
        ...mockAmenityRequest,
        amenityName: 'Updated Amenity Name',
      };

      service.updateAmenity(amenityId, updatedRequest).subscribe((amenity) => {
        expect(amenity).toEqual(mockAmenity);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities/${amenityId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedRequest);
      req.flush(mockAmenity);
    });

    it('should handle errors', () => {
      const amenityId = 999;

      service.updateAmenity(amenityId, mockAmenityRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities/${amenityId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('deleteAmenity', () => {
    it('should delete an amenity', () => {
      const amenityId = 1;

      service.deleteAmenity(amenityId).subscribe(() => {
        // Success - no return value
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities/${amenityId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle errors', () => {
      const amenityId = 999;

      service.deleteAmenity(amenityId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Amenities/${amenityId}`);
      req.error(new ProgressEvent('error'));
    });
  });
});

