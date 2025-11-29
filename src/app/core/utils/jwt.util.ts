/**
 * JWT utility functions
 */

/**
 * Decodes a JWT token and returns the payload
 * @param token The JWT token string
 * @returns The decoded payload or null if invalid
 */
export function decodeJwtToken(token: string): any | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) {
      return null;
    }
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Gets the user role from a JWT token
 * @param token The JWT token string
 * @returns The user role or null if not found
 */
export function getUserRole(token: string | null): string | null {
  if (!token) {
    return null;
  }
  const payload = decodeJwtToken(token);
  return payload?.role || null;
}

/**
 * Checks if the user is an admin based on their JWT token
 * @param token The JWT token string
 * @returns True if user is an admin, false otherwise
 */
export function isAdmin(token: string | null): boolean {
  const role = getUserRole(token);
  return role === 'Admin' || role === 'admin';
}

/**
 * Gets the user ID from a JWT token
 * @param token The JWT token string
 * @returns The user ID or null if not found
 */
export function getUserId(token: string | null): string | null {
  if (!token) {
    return null;
  }
  const payload = decodeJwtToken(token);
  // Try common JWT claim names for user ID
  return payload?.id || payload?.nameid || payload?.sub || payload?.userId || payload?.user_id || null;
}

