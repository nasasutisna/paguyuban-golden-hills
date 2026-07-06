/**
 * Admin Theme Configuration
 * Elegant green and brown gradient theme for admin interface
 */

/**
 * Primary color palette - Green tones
 */
export const ADMIN_COLORS = {
  // Primary green colors
  primary: {
    50: '#E8F5E9',
    100: '#C8E6C9',
    200: '#A5D6A7',
    300: '#81C784',
    400: '#66BB6A',
    500: '#4CAF50',
    600: '#43A047',
    700: '#388E3C',
    800: '#2E7D32',
    900: '#1B5E20'
  },
  // Secondary brown/earth tones
  secondary: {
    50: '#EFEBE9',
    100: '#D7CCC8',
    200: '#BCAAA4',
    300: '#A1887F',
    400: '#8D6E63',
    500: '#795548',
    600: '#6D4C41',
    700: '#5D4037',
    800: '#4E342E',
    900: '#3E2723'
  },
  // Accent colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  // Neutral colors
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
    900: '#111827'
  }
};

/**
 * Gradient definitions
 */
export const ADMIN_GRADIENTS = {
  // Primary green gradient
  primary: 'linear-gradient(135deg, #43A047 0%, #66BB6A 50%, #81C784 100%)',
  // Brown/earth gradient
  earth: 'linear-gradient(135deg, #6D4C41 0%, #8D6E63 50%, #A1887F 100%)',
  // Green to brown gradient
  nature: 'linear-gradient(135deg, #43A047 0%, #66BB6A 40%, #8D6E63 100%)',
  // Dark gradient
  dark: 'linear-gradient(135deg, #1B5E20 0%, #2E7D32 50%, #3E2723 100%)',
  // Subtle gradient
  subtle: 'linear-gradient(180deg, rgba(67, 160, 71, 0.08) 0%, rgba(109, 76, 65, 0.05) 100%)',
  // Card gradient
  card: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)',
  // Header gradient
  header: 'linear-gradient(90deg, #1B5E20 0%, #2E7D32 50%, #43A047 100%)',
  // Sidebar gradient
  sidebar: 'linear-gradient(180deg, #1F2937 0%, #111827 100%)'
};

/**
 * Shadow definitions
 */
export const ADMIN_SHADOWS = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'
};

/**
 * Border radius definitions
 */
export const ADMIN_RADIUS = {
  none: '0',
  sm: '0.125rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px'
};

/**
 * Spacing definitions
 */
export const ADMIN_SPACING = {
  xs: '0.5rem',
  sm: '0.75rem',
  md: '1rem',
  lg: '1.25rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem'
};

/**
 * Get color value by name and shade
 */
export function getColor(colorName: keyof typeof ADMIN_COLORS, shade: number = 500): string {
  const color = ADMIN_COLORS[colorName];
  if (typeof color === 'object' && shade in color) {
    return color[shade as keyof typeof color];
  }
  return String(color);
}

/**
 * Get gradient by name
 */
export function getGradient(name: keyof typeof ADMIN_GRADIENTS): string {
  return ADMIN_GRADIENTS[name];
}

/**
 * Get shadow by name
 */
export function getShadow(name: keyof typeof ADMIN_SHADOWS): string {
  return ADMIN_SHADOWS[name];
}
