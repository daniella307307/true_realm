export const COLORS = {
  // Primary Colors
  primary: {
    blue: {
      50: '#EFF6FF',    
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#00227C',   
      600: '#001A5E',   
      700: '#1E3A8A',
      800: '#1E40AF',
      900: '#1E3A8A',
    },
    orange: {
      50: '#FFF7ED',    
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FB923C',
      500: '#EC7414',   
      600: '#EA580C',   
      700: '#C2410C',
      800: '#9A3412',
      900: '#7C2D12',
    },
  },
  
  // Semantic Colors
  semantic: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  
  // Neutral Colors
  neutral: {
    white: '#FFFFFF',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    black: '#000000',
  },
  
  // Background Colors
  background: {
    light: '#FFFFFF',
    dark: '#F9FAFB',
    blue: {
      light: '#EFF6FF',    
      subtle: '#DBEAFE',
    },
    orange: {
      light: '#FFF7ED',    
      subtle: '#FFEDD5',
    },
  },
  
  // Text Colors
  text: {
    primary: '#1F2937',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
    blue: '#00227C',
    orange: '#EC7414',
  },
  
  // Border Colors
  border: {
    light: '#E5E7EB',
    default: '#D1D5DB',
    dark: '#9CA3AF',
    blue: '#00227C',
    orange: '#EC7414',
  },
  
  // Shadow Colors
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
   // Status Colors
  status: {
    active: '#10B981',
    pending: '#F59E0B',
    inactive: '#6B7280',
    warning: '#F59E0B',
    error: '#EF4444',
    success: '#10B981',
    info: '#3B82F6',
  },
  
  // Gradient Colors
  gradients: {
    blue: ['#00227C', '#001A5E'],
    orange: ['#EC7414', '#EA580C'],
    blueToPurple: ['#00227C', '#3730A3'],
    orangeToRed: ['#EC7414', '#DC2626'],
  },
} as const;

// Type export
export type ColorScheme = keyof typeof COLORS;
export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;