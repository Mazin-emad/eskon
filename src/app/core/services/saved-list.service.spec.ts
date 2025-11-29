import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { SavedListService } from './saved-list.service';
import { EnvironmentConfig } from '../config/environment.config';
import { HouseSummaryResponse } from '../models/saved-list.models';

describe('SavedListService', () => {
  let service: SavedListService;
  let httpMock: HttpTestingController;
  const baseUrl = EnvironmentConfig.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SavedListService],
    });
    service = TestBed.inject(SavedListService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('addToSavedList', () => {
    it('should add a house to saved list', (done) => {
      const houseId = 1;
      const mockResponse = { success: true };

      service.addToSavedList(houseId).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle errors when adding to saved list', (done) => {
      const houseId = 1;
      const mockError = { status: 400, message: 'Bad Request' };

      service.addToSavedList(houseId).subscribe({
        next: () => done.fail('should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      req.flush(null, mockError);
    });
  });

  describe('removeFromSavedList', () => {
    it('should remove a house from saved list', (done) => {
      const houseId = 1;
      const mockResponse = { success: true };

      service.removeFromSavedList(houseId).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      expect(req.request.method).toBe('DELETE');
      req.flush(mockResponse);
    });

    it('should handle errors when removing from saved list', (done) => {
      const houseId = 1;
      const mockError = { status: 404, message: 'Not Found' };

      service.removeFromSavedList(houseId).subscribe({
        next: () => done.fail('should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      req.flush(null, mockError);
    });
  });

  describe('isHouseSaved', () => {
    it('should return true if house is saved', (done) => {
      const houseId = 1;

      service.isHouseSaved(houseId).subscribe({
        next: (isSaved) => {
          expect(isSaved).toBe(true);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      expect(req.request.method).toBe('GET');
      req.flush(true);
    });

    it('should return false if house is not saved (404)', (done) => {
      const houseId = 1;

      service.isHouseSaved(houseId).subscribe({
        next: (isSaved) => {
          expect(isSaved).toBe(false);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      req.flush(null, { status: 404, statusText: 'Not Found' });
    });

    it('should handle other errors', (done) => {
      const houseId = 1;
      const mockError = { status: 500, message: 'Internal Server Error' };

      service.isHouseSaved(houseId).subscribe({
        next: () => done.fail('should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList/${houseId}`);
      req.flush(null, mockError);
    });
  });

  describe('getSavedHouses', () => {
    it('should retrieve all saved houses', (done) => {
      const mockResponse: HouseSummaryResponse[] = [
        {
          houseId: 1,
          title: 'Test House 1',
          pricePerMonth: 5000,
          numberOfRooms: 3,
          numberOfBathrooms: 2,
          area: 120,
          coverImageUrl: 'https://example.com/image1.jpg',
          formattedLocation: 'Cairo, Main Street',
          isSavedByCurrentUser: true,
        },
        {
          houseId: 2,
          title: 'Test House 2',
          pricePerMonth: 7000,
          numberOfRooms: 4,
          numberOfBathrooms: 3,
          area: 150,
          coverImageUrl: 'https://example.com/image2.jpg',
          formattedLocation: 'Alexandria, Beach Road',
          isSavedByCurrentUser: true,
        },
      ];

      service.getSavedHouses().subscribe({
        next: (houses) => {
          expect(houses).toEqual(mockResponse);
          expect(houses.length).toBe(2);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList`);
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should return empty array if no houses are saved', (done) => {
      const mockResponse: HouseSummaryResponse[] = [];

      service.getSavedHouses().subscribe({
        next: (houses) => {
          expect(houses).toEqual(mockResponse);
          expect(houses.length).toBe(0);
          done();
        },
        error: done.fail,
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList`);
      req.flush(mockResponse);
    });

    it('should handle errors when retrieving saved houses', (done) => {
      const mockError = { status: 401, message: 'Unauthorized' };

      service.getSavedHouses().subscribe({
        next: () => done.fail('should have failed'),
        error: (error) => {
          expect(error).toBeDefined();
          done();
        },
      });

      const req = httpMock.expectOne(`${baseUrl}/api/SavedList`);
      req.flush(null, mockError);
    });
  });
});

