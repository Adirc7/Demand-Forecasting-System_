import { describe, it, expect } from 'vitest';
import {
    validateEmail,
    validatePassword,
    validateSKU,
    validateNumericLimit,
    sanitizeString
} from '../utils/validation';

describe('Validation Utility Tests (Unit/Security)', () => {
    describe('validateEmail', () => {
        it('should return null for valid emails', () => {
            expect(validateEmail('test@system.com')).toBeNull();
            expect(validateEmail('admin.123@dropex.ai')).toBeNull();
        });

        it('should reject invalid formatting or empty cases', () => {
            expect(validateEmail('')).toBe('Email is required.');
            expect(validateEmail('testsystem.com')).toBe('Invalid email format.');
            expect(validateEmail('test@system')).toBe('Invalid email format.');
        });
    });

    describe('validatePassword', () => {
        it('should return null for secure passwords', () => {
            expect(validatePassword('SecurePass123')).toBeNull();
        });

        it('should block weak passwords lacking length or mixture', () => {
            expect(validatePassword('small1')).toBe('Password must be at least 8 characters.');
            expect(validatePassword('noNumbersHere')).toBe('Password must contain at least one number.');
            expect(validatePassword('123456789')).toBe('Password must contain at least one letter.');
        });
    });

    describe('validateSKU', () => {
        it('should accept valid SKU formats with various prefixes', () => {
            expect(validateSKU('SKU-123')).toBeNull();
            expect(validateSKU('sku-9999')).toBeNull();
            expect(validateSKU('DC-4821')).toBeNull();
            expect(validateSKU('NOV-05')).toBeNull();
        });

        it('should reject arbitrary malicious values or wrong formats', () => {
            expect(validateSKU('DROP-TABLE-123')).toBe("SKU must follow the format 'PREFIX-0000'.");
            expect(validateSKU('<script>alert()</script>')).toBe("SKU must follow the format 'PREFIX-0000'.");
        });
    });

    describe('validateNumericLimit', () => {
        it('should validate acceptable bounds', () => {
            expect(validateNumericLimit(50, 'Price')).toBeNull();
            expect(validateNumericLimit(0, 'Stock')).toBeNull();
        });

        it('should strictly throw errors on negative inputs or letters', () => {
            expect(validateNumericLimit(-10, 'Price')).toBe('Price cannot be less than 0.');
            expect(validateNumericLimit('text', 'Stock')).toBe('Stock must be a number.');
        });
    });

    describe('sanitizeString (Anti-Injection)', () => {
        it('should allow normal text', () => {
            expect(sanitizeString('Samsung TV 55', 'Product')).toBeNull();
        });

        it('should catch potential basic XSS characters / injection paths', () => {
            expect(sanitizeString('Title<script>alert(1)</script>', 'Name')).toContain('Special characters');
            expect(sanitizeString('{role: admin}', 'Input')).toContain('Special characters');
            expect(sanitizeString('$where', 'Input')).toContain('Special characters');
        });
    });
});
