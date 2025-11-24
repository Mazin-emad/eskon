import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { LocationService } from './location.service';
import { EnvironmentConfig } from '../config/environment.config';
import {
  LocationRequest,
  Location,
} from '../models/location.models';

describe('LocationService', () => {
  let service: LocationService;
  let httpMock: HttpTestingController;
  const baseUrl = EnvironmentConfig.apiBaseUrl;

  const mockLocationRequest: LocationRequest = {
    country: 'Egypt',
    city: 'Cairo',
    postalCode: '12345',
    street: 'Main Street',
    buildingNumber: '10B',
    geoLat: '30.0444',
    geoLng: '31.2357',
  };

  const mockLocation: Location = {
    id: 1,
    ...mockLocationRequest,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [LocationService],
    });
    service = TestBed.inject(LocationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getLocations', () => {
    it('should return an array of locations', () => {
      const mockLocations: Location[] = [mockLocation];

      service.getLocations().subscribe((locations) => {
        expect(locations).toEqual(mockLocations);
        expect(locations.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLocations);
    });

    it('should handle errors', () => {
      service.getLocations().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getLocationById', () => {
    it('should return a single location by ID', () => {
      const locationId = 1;

      service.getLocationById(locationId).subscribe((location) => {
        expect(location).toEqual(mockLocation);
        expect(location.id).toBe(locationId);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations/${locationId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockLocation);
    });

    it('should handle errors', () => {
      const locationId = 999;

      service.getLocationById(locationId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations/${locationId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('addLocation', () => {
    it('should create a new location', () => {
      service.addLocation(mockLocationRequest).subscribe((location) => {
        expect(location).toEqual(mockLocation);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockLocationRequest);
      req.flush(mockLocation);
    });

    it('should handle errors', () => {
      service.addLocation(mockLocationRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('updateLocation', () => {
    it('should update an existing location', () => {
      const locationId = 1;
      const updatedRequest: LocationRequest = {
        ...mockLocationRequest,
        city: 'Alexandria',
      };

      service.updateLocation(locationId, updatedRequest).subscribe((location) => {
        expect(location).toEqual(mockLocation);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations/${locationId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedRequest);
      req.flush(mockLocation);
    });

    it('should handle errors', () => {
      const locationId = 999;

      service.updateLocation(locationId, mockLocationRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations/${locationId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('deleteLocation', () => {
    it('should delete a location', () => {
      const locationId = 1;

      service.deleteLocation(locationId).subscribe(() => {
        // Success - no return value
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations/${locationId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should handle errors', () => {
      const locationId = 999;

      service.deleteLocation(locationId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/Locations/${locationId}`);
      req.error(new ProgressEvent('error'));
    });
  });
});

