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
