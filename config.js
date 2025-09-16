// Configuration file for environment variables
// This file handles loading environment variables from .env file

// Default configuration
const config = {
    // API Selection (switch between 'openai' and 'gemini')
    USE_API: 'openai', // 'openai' oder 'gemini'
    
    // OpenAI Configuration
    OPENAI_API_KEY: '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',
    OPENAI_MODEL: 'gpt-4o-mini',
    
    // Google Gemini Configuration (Alternative)
    GEMINI_API_KEY: 'AIzaSyBu0m2qhFdv-qWrnM0YbmO2Lg6lIJ66l6o',
    GEMINI_MODEL: 'gemini-2.5-flash',
    OPENAI_MAX_TOKENS: 1500,
    OPENAI_TEMPERATURE: 0.7,
    
    // Application Configuration
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10 MB
    SUPPORTED_FILE_TYPES: ['.json'],
    
    // Chart Configuration
    CHART_HEIGHT: 400,
    CHART_HEIGHT_MOBILE: 300,
    
    // Feratel Corporate Colors
    COLORS: {
        FERATEL_BLUE: '#0575BC',
        FERATEL_YELLOW: '#FBE603',
        FERATEL_DARK_BLUE: '#003E7E',
        FERATEL_LIGHT_GRAY: '#F5F5F5',
        FERATEL_ANTHRACITE: '#272727',
        FERATEL_WHITE: '#FFFFFF'
    }
};

// Export configuration
window.appConfig = config;
