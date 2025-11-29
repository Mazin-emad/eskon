import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HousingService } from './housing.service';
import { EnvironmentConfig } from '../config/environment.config';
import {
  HouseRequest,
  House,
  HouseListItem,
} from '../models/housing.models';

describe('HousingService', () => {
  let service: HousingService;
  let httpMock: HttpTestingController;
  const baseUrl = EnvironmentConfig.apiBaseUrl;

  const mockHouseRequest: HouseRequest = {
    Area: 120,
    Title: 'Modern Apartment in Downtown',
    LocationId: 1,
    Description: 'A spacious and modern apartment',
    NumberOfRooms: 3,
    PricePerMonth: 7500,
    NumberOfBathrooms: 2,
    amenityIds: [0, 8, 3],
  };

  const mockHouse: House = {
    houseId: 1,
    title: 'Modern Apartment in Downtown',
    description: 'A spacious and modern apartment',
    pricePerMonth: 7500,
    numberOfRooms: 3,
    numberOfBathrooms: 2,
    area: 120,
    owner: {
      userId: '123',
      fullName: 'John Doe',
    },
    location: {
      locationId: 1,
      country: 'United States',
      city: 'New York',
      postalCode: '10001',
      street: '5th Avenue',
      buildingNumber: '350',
      geoLat: '40.7484',
      geoLng: '-73.9857',
    },
    imageUrls: [],
    amenities: [],
    isSavedByCurrrentUser: false,
  };

  const mockHouseListItem: HouseListItem = {
    houseId: 1,
    title: 'Modern Apartment in Downtown',
    pricePerMonth: 7500,
    numberOfRooms: 3,
    numberOfBathrooms: 2,
    area: 120,
    coverImageUrl: '',
    formattedLocation: 'New York, 5th Avenue',
    isSavedByCurrentUser: false,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [HousingService],
    });
    service = TestBed.inject(HousingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getHouses', () => {
    it('should return an array of house list items', () => {
      const mockHouses: HouseListItem[] = [mockHouseListItem];

      service.getHouses().subscribe((houses) => {
        expect(houses).toEqual(mockHouses);
        expect(houses.length).toBe(1);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHouses);
    });

    it('should handle errors', () => {
      service.getHouses().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('getHouseById', () => {
    it('should return a single house by ID', () => {
      const houseId = 1;

      service.getHouseById(houseId).subscribe((house) => {
        expect(house).toEqual(mockHouse);
        expect(house.houseId).toBe(houseId);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House/${houseId}`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHouse);
    });

    it('should handle errors', () => {
      const houseId = 999;

      service.getHouseById(houseId).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House/${houseId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('addHouse', () => {
    it('should create a new house', () => {
      service.addHouse(mockHouseRequest).subscribe((house) => {
        expect(house).toEqual(mockHouse);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockHouseRequest);
      req.flush(mockHouse);
    });

    it('should handle errors', () => {
      service.addHouse(mockHouseRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('updateHouse', () => {
    it('should update an existing house', () => {
      const houseId = 1;
      const updatedRequest: HouseRequest = {
        ...mockHouseRequest,
        Title: 'Updated Title',
      };

      service.updateHouse(houseId, updatedRequest).subscribe((house) => {
        expect(house).toEqual(mockHouse);
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House/${houseId}`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(updatedRequest);
      req.flush(mockHouse);
    });

    it('should handle errors', () => {
      const houseId = 999;

      service.updateHouse(houseId, mockHouseRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House/${houseId}`);
      req.error(new ProgressEvent('error'));
    });
  });

  describe('deleteHouse', () => {
    it('should delete a house', () => {
      const houseId = 1;

      service.deleteHouse(houseId, mockHouseRequest).subscribe(() => {
        // Success - no return value
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House/${houseId}`);
      expect(req.request.method).toBe('DELETE');
      expect(req.request.body).toEqual(mockHouseRequest);
      req.flush(null);
    });

    it('should handle errors', () => {
      const houseId = 999;

      service.deleteHouse(houseId, mockHouseRequest).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error).toBeTruthy();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/House/${houseId}`);
      req.error(new ProgressEvent('error'));
    });
  });
});

