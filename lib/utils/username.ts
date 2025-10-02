import { clerkClient } from '@clerk/nextjs/server';

export interface GenerateUsernameOptions {
  name: string;
  phone: string;
  suffix?: string;
}

/**
 * Generates a username by combining sanitized name with last 4 digits of phone number
 * Example: "John Doe" + "9876543210" = "johndoe3210"
 */
export function generateUsername(options: GenerateUsernameOptions): string {
  const { name, phone, suffix } = options;

  // Sanitize name: remove spaces, special characters, convert to lowercase
  const sanitizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .trim();

  // Extract last 4 digits of phone number
  const phoneDigits = phone.replace(/\D/g, ''); // Remove non-digits
  const last4Digits = phoneDigits.slice(-4);

  // Combine sanitized name with last 4 digits
  let username = `${sanitizedName}${last4Digits}`;

  // Add suffix if provided
  if (suffix) {
    username += `_${suffix}`;
  }

  return username;
}

/**
 * Validates username meets Clerk requirements
 * - 3-20 characters
 * - Alphanumeric characters and underscores only
 * - Must start with a letter or number
 */
export function validateUsername(username: string): boolean {
  // Check length (3-20 characters)
  if (username.length < 3 || username.length > 20) {
    return false;
  }

  // Check format: alphanumeric and underscores only, must start with letter or number
  const usernameRegex = /^[a-zA-Z0-9][a-zA-Z0-9_]*$/;
  return usernameRegex.test(username);
}

/**
 * Checks if a username is available in Clerk
 */
export async function checkUsernameAvailability(username: string): Promise<boolean> {
  try {
    // Get the Clerk client instance with proper initialization
    const client = typeof clerkClient === 'function' ? await (clerkClient as any)() : clerkClient;
    
    if (!client || !client.users) {
      console.error('Clerk client not properly initialized');
      return false;
    }

    // Search for users with this username
    const users = await client.users.getUserList({
      username: [username],
      limit: 1
    });

    // Username is available if no users found
    return users.data.length === 0;
  } catch (error) {
    console.error('Error checking username availability:', error);
    // If there's an error, assume username is not available to be safe
    return false;
  }
}

/**
 * Generates a unique username by checking availability and adding suffixes if needed
 * Returns the first available username found
 */
export async function generateUniqueUsername(options: GenerateUsernameOptions): Promise<string> {
  const baseUsername = generateUsername(options);

  // Validate the base username format
  if (!validateUsername(baseUsername)) {
    throw new Error(`Generated username "${baseUsername}" does not meet format requirements`);
  }

  // Check if base username is available
  const isBaseAvailable = await checkUsernameAvailability(baseUsername);
  if (isBaseAvailable) {
    return baseUsername;
  }

  // If base username is taken, try with incremental suffixes
  let suffix = 1;
  let attemptedUsername = '';

  while (suffix <= 999) { // Limit attempts to prevent infinite loop
    attemptedUsername = generateUsername({
      ...options,
      suffix: suffix.toString()
    });

    // Validate the username with suffix
    if (!validateUsername(attemptedUsername)) {
      suffix++;
      continue;
    }

    const isAvailable = await checkUsernameAvailability(attemptedUsername);
    if (isAvailable) {
      return attemptedUsername;
    }

    suffix++;
  }

  // If we couldn't find an available username after 999 attempts, throw an error
  throw new Error(`Could not generate unique username for name "${options.name}" and phone "${options.phone}"`);
}

/**
 * Utility function to extract phone digits and validate minimum length
 */
export function extractPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) {
    throw new Error('Phone number must contain at least 4 digits');
  }
  return digits;
}

/**
 * Utility function to sanitize and validate name
 */
export function sanitizeName(name: string): string {
  const sanitized = name.trim();
  if (!sanitized) {
    throw new Error('Name cannot be empty');
  }

  // Remove extra spaces and ensure we have at least some alphabetic characters
  const cleanName = sanitized.replace(/\s+/g, ' ');
  const hasAlpha = /[a-zA-Z]/.test(cleanName);

  if (!hasAlpha) {
    throw new Error('Name must contain at least one alphabetic character');
  }

  return cleanName;
}

/**
 * Generates a strong password with uppercase, lowercase, numbers, and special characters
 * Format: [Name][Numbers][Special][Random] - e.g., "John1234@Kx9"
 */
export function generateStrongPassword(name: string): string {
  // Get first 3-4 characters of name (capitalized)
  const namePrefix = name.trim().charAt(0).toUpperCase() + 
                    name.trim().slice(1, 4).toLowerCase();
  
  // Generate 4 random numbers
  const numbers = Math.floor(1000 + Math.random() * 9000).toString();
  
  // Special characters pool (safe for most systems)
  const specialChars = '@#$%&*!';
  const specialChar = specialChars[Math.floor(Math.random() * specialChars.length)];
  
  // Generate 2-3 random characters (mix of letters and numbers)
  const randomChars = Math.random().toString(36).substring(2, 5).toUpperCase();
  
  return `${namePrefix}${numbers}${specialChar}${randomChars}`;
}

/**
 * Validates password strength
 * - At least 8 characters
 * - Contains uppercase and lowercase letters
 * - Contains numbers
 * - Contains special characters
 */
export function validatePasswordStrength(password: string): boolean {
  if (password.length < 8) return false;
  
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  
  return hasUpper && hasLower && hasNumber && hasSpecial;
}