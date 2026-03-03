// Generate order number
const generateOrderNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
};

// Format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
};

// Calculate pagination metadata
const getPaginationMetadata = (totalItems, page, limit) => {
    const totalPages = Math.ceil(totalItems / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;
    
    return {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit,
        hasNext,
        hasPrev
    };
};

// Validate email format
const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

// Sanitize object (remove undefined/null values)
const sanitizeObject = (obj) => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v != null)
    );
};

// Parse JSON safely
const safeJSONParse = (str, fallback = {}) => {
    try {
        return JSON.parse(str);
    } catch {
        return fallback;
    }
};

module.exports = {
    generateOrderNumber,
    formatCurrency,
    getPaginationMetadata,
    isValidEmail,
    sanitizeObject,
    safeJSONParse
};
