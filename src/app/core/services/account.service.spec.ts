import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AccountService } from './account.service';
import { AuthService } from '../../auth/services/auth.service';
import { EnvironmentConfig } from '../config/environment.config';
import { Profile, ChangePasswordRequest } from '../models/auth.models';

describe('AccountService', () => {
  let service: AccountService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  let authService: jasmine.SpyObj<AuthService>;

  const mockProfile: Profile = {
    email: 'test@example.com',
    userName: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['clearTokens']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AccountService,
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(AccountService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getProfile', () => {
    it('should fetch profile from API and cache it', (done) => {
      service.getProfile().subscribe({
        next: (profile) => {
          expect(profile).toEqual(mockProfile);
          expect(service.profile).toEqual(mockProfile);
          done();
        }
      });

      const req = httpMock.expectOne(`${EnvironmentConfig.apiBaseUrl}/Account/profile`);
      expect(req.request.method).toBe('GET');
      req.flush(mockProfile);
    });

    it('should return cached profile on subsequent calls', (done) => {
      // First call - fetch from API
      service.getProfile().subscribe({
        next: (profile) => {
          expect(profile).toEqual(mockProfile);
          
          // Second call - should return cached value
          service.getProfile().subscribe({
            next: (cachedProfile) => {
              expect(cachedProfile).toEqual(mockProfile);
              done();
            }
          });
        }
      });

      const req = httpMock.expectOne(`${EnvironmentConfig.apiBaseUrl}/Account/profile`);
      req.flush(mockProfile);
    });

    it('should clear tokens and redirect on 401 error', (done) => {
      service.getProfile().subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(authService.clearTokens).toHaveBeenCalled();
          expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
          expect(service.profile).toBeNull();
          done();
        }
      });

      const req = httpMock.expectOne(`${EnvironmentConfig.apiBaseUrl}/Account/profile`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('changePassword', () => {
    it('should send PUT request with password data', (done) => {
      const payload: ChangePasswordRequest = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      service.changePassword(payload).subscribe({
        next: () => {
          done();
        }
      });

      const req = httpMock.expectOne(`${EnvironmentConfig.apiBaseUrl}/Account/change-password`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush(null);
    });

    it('should clear tokens and redirect on 401 error', (done) => {
      const payload: ChangePasswordRequest = {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123'
      };

      service.changePassword(payload).subscribe({
        next: () => fail('should have failed'),
        error: () => {
          expect(authService.clearTokens).toHaveBeenCalled();
          expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
          done();
        }
      });

      const req = httpMock.expectOne(`${EnvironmentConfig.apiBaseUrl}/Account/change-password`);
      req.flush(null, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('clearProfile', () => {
    it('should clear cached profile', () => {
      // First cache a profile
      service.getProfile().subscribe();
      const req = httpMock.expectOne(`${EnvironmentConfig.apiBaseUrl}/Account/profile`);
      req.flush(mockProfile);

      expect(service.profile).toEqual(mockProfile);

      // Clear profile
      service.clearProfile();
      expect(service.profile).toBeNull();
    });
  });
});

