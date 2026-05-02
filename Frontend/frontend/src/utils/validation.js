/**
 * Validation Utility module
 * Centralized logic to secure and validate all frontend inputs
 * Prevents basic injection strings and strictly enforces formatting.
 */

// Email regex conforming to standard format
export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required.";
    if (!re.test(email)) return "Invalid email format.";
    if (email.length > 255) return "Email is too long.";
    return null; // Null means valid
};

// Password pattern: at least 8 chars, 1 letter, 1 number
export const validatePassword = (password) => {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (!/\d/.test(password)) return "Password must contain at least one number.";
    if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter.";
    return null; // Null means valid
};

// SKU format: PRE-xxxx (Supports SKU-1234, DC-1234, NOV-1234)
export const validateSKU = (sku) => {
    const re = /^[A-Z0-9]+-\d+$/i; // E.g. SKU-1234, DC-4821, NOV-001
    if (!sku) return "SKU is required.";
    if (!re.test(sku)) return "SKU must follow the format 'PREFIX-0000'.";
    return null;
};

// Numeric boundary checks (No negative prices or stocks, or crazy large numbers)
export const validateNumericLimit = (value, name, min = 0, max = 999999) => {
    if (value === undefined || value === null || value === "") return `${name} is required.`;
    const num = Number(value);
    if (isNaN(num)) return `${name} must be a number.`;
    if (num < min) return `${name} cannot be less than ${min}.`;
    if (num > max) return `${name} cannot exceed ${max}.`;
    return null;
};

// Protect against basic XSS or NoSQL injection payloads in string inputs
export const sanitizeString = (str, name) => {
    if (!str) return `${name} is required.`;
    // Reject common payload patterns
    const maliciousPatterns = /[<>{}\$]/g; 
    if (maliciousPatterns.test(str)) {
        return `Special characters < > { } $ are not allowed in ${name}.`;
    }
    return null;
};
