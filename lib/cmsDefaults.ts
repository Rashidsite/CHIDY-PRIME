export interface BottomNavItem {
  id: string;
  label: string;
  icon: string;
  url: string;
  is_live: boolean;
  badge?: string;
}

export type BottomNavStyle = 'glassmorphism' | 'obsidian' | 'pill' | 'docked';
export type ButtonPreset = 'royal_blue' | 'solid_emerald' | 'cyan_cyberpunk' | 'minimalist_border';
export type CornerRadius = 'rounded-xl' | 'rounded-2xl' | 'rounded-full' | 'rounded-none';

export interface CMSBottomNavConfig {
  style: BottomNavStyle;
  show_badge: boolean;
  is_active: boolean;
  items: BottomNavItem[];
}

export interface CMSAnimationConfig {
  glowing_radar: boolean;
  shimmer_loading: boolean;
  card_hover_scale: boolean;
  floating_support_pulse: boolean;
}

export interface CMSThemePresetConfig {
  button_preset: ButtonPreset;
  corner_radius: CornerRadius;
  accent_color: string;
  glow_intensity: 'low' | 'medium' | 'high';
}

export interface CMSConfigData {
  bottom_nav: CMSBottomNavConfig;
  animations: CMSAnimationConfig;
  theme_presets: CMSThemePresetConfig;
}

export const DEFAULT_BOTTOM_NAV: CMSBottomNavConfig = {
  style: 'glassmorphism',
  show_badge: true,
  is_active: true,
  items: [
    { id: 'nav-store', label: 'Store', icon: 'Gamepad2', url: '/front', is_live: true, badge: '' },
    { id: 'nav-categories', label: 'Kategoria', icon: 'Sparkles', url: '/front#category-vault-section', is_live: true, badge: 'HOT' },
    { id: 'nav-orders', label: 'Orders', icon: 'PackageCheck', url: '/orders', is_live: true, badge: '' },
    { id: 'nav-profile', label: 'Akaunti', icon: 'User', url: '/profile', is_live: true, badge: '' },
    { id: 'nav-chat', label: 'Msaada', icon: 'MessageCircle', url: 'https://wa.me/255655361060', is_live: true, badge: 'LIVE' },
  ],
};

export const DEFAULT_ANIMATIONS: CMSAnimationConfig = {
  glowing_radar: true,
  shimmer_loading: true,
  card_hover_scale: true,
  floating_support_pulse: true,
};

export const DEFAULT_THEME_PRESETS: CMSThemePresetConfig = {
  button_preset: 'royal_blue',
  corner_radius: 'rounded-2xl',
  accent_color: '#2563EB',
  glow_intensity: 'high',
};

export const DEFAULT_CMS_CONFIG: CMSConfigData = {
  bottom_nav: DEFAULT_BOTTOM_NAV,
  animations: DEFAULT_ANIMATIONS,
  theme_presets: DEFAULT_THEME_PRESETS,
};
