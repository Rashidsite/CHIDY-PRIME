---
name: Aether Elite
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#494456'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#7b7488'
  outline-variant: '#cbc3d9'
  surface-tint: '#6e25f6'
  primary: '#4700af'
  on-primary: '#ffffff'
  primary-container: '#6200ea'
  on-primary-container: '#cfbcff'
  inverse-primary: '#cfbcff'
  secondary: '#006875'
  on-secondary: '#ffffff'
  secondary-container: '#00e3fd'
  on-secondary-container: '#00616d'
  tertiary: '#3c3b3c'
  on-tertiary: '#ffffff'
  tertiary-container: '#535253'
  on-tertiary-container: '#c8c5c6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#cfbcff'
  on-primary-fixed: '#22005d'
  on-primary-fixed-variant: '#5400cc'
  secondary-fixed: '#9cf0ff'
  secondary-fixed-dim: '#00daf3'
  on-secondary-fixed: '#001f24'
  on-secondary-fixed-variant: '#004f58'
  tertiary-fixed: '#e5e2e3'
  tertiary-fixed-dim: '#c8c6c7'
  on-tertiary-fixed: '#1b1b1c'
  on-tertiary-fixed-variant: '#474647'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1440px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
---

## Brand & Style
This design system establishes a high-fidelity, professional environment for a premium gaming platform. It moves away from the typical dark-mode "gamer" aesthetic in favor of a **Corporate Modern** style that emphasizes precision, authority, and clarity. The aesthetic is defined by its clean, expansive white backgrounds contrasted against rich, highly saturated purple accents.

The design targets a discerning audience that values performance and reliability as much as entertainment. The UI should feel intentional and structural, utilizing ample whitespace to let high-quality game imagery and data-rich interfaces breathe. The emotional response is one of "premium efficiency"—a platform that is as powerful as the hardware it supports.

## Colors
The palette is anchored by a pure white background to ensure maximum contrast and a "pro" feel. 

- **Primary:** A deep, vibrant violet (#6200EA), used for core branding, primary actions, and active states. It must be "zikolee sana" (rich and saturated).
- **Secondary:** A sharp electric cyan (#00E5FF) used sparingly for high-visibility accents, success states, or to highlight "Live" status and performance metrics.
- **Neutral:** A range of architectural grays. #1A1A1B is used for primary text and headers to maintain an authoritative weight, while #F8F9FA serves as a subtle surface tint for secondary containers.
- **Surface:** The primary interface surface is pure white (#FFFFFF).

## Typography
The typographic hierarchy prioritizes readability and structural order. 

- **Headlines:** Uses **Plus Jakarta Sans** for its modern, geometric warmth and excellent legibility at large scales. Bold weights are used to assert authority.
- **Body:** **Hanken Grotesk** provides a clean, neutral, and highly professional feel for long-form content and descriptions.
- **Labels & Data:** **JetBrains Mono** is used for technical metadata, game specs, and status labels to reinforce the "high-fidelity" and technical nature of the gaming platform.

All headlines utilize a slight negative letter-spacing to appear tighter and more "editorial" in high-contrast environments.

## Layout & Spacing
This design system employs a **Fluid Grid** logic within a fixed-width container. The layout is based on a 12-column system for desktop, 8-column for tablet, and 4-column for mobile.

- **Rhythm:** A strict 8px baseline grid ensures vertical consistency.
- **Safe Margins:** Large margins (64px on desktop) are used to isolate content and maintain a premium, uncluttered aesthetic.
- **Density:** High density is allowed within data components (like server lists or inventory), but primary navigation and landing sections should maintain a low-density, airy feel.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Ambient Shadows** rather than heavy borders.

- **Surfaces:** Secondary containers use a very light gray (#F8F9FA) against the white background to create subtle separation.
- **Shadows:** Use extremely diffused, low-opacity shadows with a subtle primary-color tint (e.g., 4% opacity of #6200EA) to make elevated components like cards or modals feel like they are floating in a light-filled space.
- **Blurs:** High-fidelity glassmorphism (backdrop-blur: 20px) is reserved exclusively for navigation bars and overlaying content on game hero imagery.

## Shapes
The shape language is **Rounded**, balancing professional structure with modern softness. 

- **Base Radius:** 0.5rem (8px) for standard components like buttons and input fields.
- **Large Radius:** 1rem (16px) for cards, game posters, and modal containers.
- **Full Radius:** Pill shapes are used exclusively for tags, badges, and status indicators to differentiate them from actionable buttons.

## Components

- **Buttons:** Primary buttons use a solid #6200EA fill with white text. Secondary buttons use a #6200EA 1px outline with a subtle hover state that adds a light purple tint to the background.
- **Cards:** Cards should have no border; instead, use a subtle ambient shadow and a 16px corner radius. Game imagery inside cards should span the full width of the container.
- **Input Fields:** Use a light neutral background (#F8F9FA) with a 1px bottom border that transforms into a 2px primary-colored border on focus.
- **Chips/Badges:** Use JetBrains Mono for text. Badges for "Pro" or "Elite" status should use the secondary electric cyan for high visibility.
- **Lists:** Data lists should use alternating row tints or subtle dividers (1px, #E9ECEF) to maintain structure in high-fidelity data views.
- **Modals:** Centered with a heavy backdrop-blur (12px) on the background content to maintain focus on the premium interface.