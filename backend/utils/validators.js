// Input validation helpers
// Intentionally weak for Task 03 - missing XSS and NoSQL injection protection

// Basic email validation
const validateEmail = (email) => {
  const regex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return regex.test(email);
};

// Basic password validation
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  return { valid: true };
};

// Weak input sanitization - doesn't prevent XSS or NoSQL injection
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }
  // Only removes basic HTML tags, doesn't prevent XSS properly
  return input.replace(/<script>/gi, '').replace(/<\/script>/gi, '');
};

// Basic document metadata validation
const validateDocumentMetadata = (metadata) => {
  // Minimal validation
  if (metadata && typeof metadata === 'object') {
    return { valid: true };
  }
  return { valid: false, message: 'Invalid metadata format' };
};

module.exports = {
  validateEmail,
  validatePassword,
  sanitizeInput,
  validateDocumentMetadata
};
