import { environment } from '../../../environments/environment';

/**
 * Centralized environment configuration service
 * Provides access to environment variables throughout the application
 */
export class EnvironmentConfig {
  /**
   * Base URL for API endpoints
   */
  static readonly apiBaseUrl: string = environment.apiBaseUrl;

  /**
   * Whether the application is running in production mode
   */
  static readonly isProduction: boolean = environment.production;
}
