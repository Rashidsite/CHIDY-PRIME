import { z } from 'zod';

export const GameSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  category: z.string().min(1, 'Category is required'),
  cover_image: z.string().url('Must be a valid cover image URL'),
  screenshots: z.array(z.string().url()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  rating: z.number().min(0).max(5).optional().default(4.8),
  download_url: z.string().url('Must be a valid download URL').optional().or(z.literal('')),
  access_duration: z.string().optional().default('Lifetime'),
  license_duration: z.string().optional(),
  is_featured: z.boolean().optional().default(false),
  is_hero: z.boolean().optional().default(false),
  status: z.enum(['published', 'draft', 'archived']).default('published'),
  system_req_minimum: z.object({
    os: z.string().optional(),
    cpu: z.string().optional(),
    ram: z.string().optional(),
    gpu: z.string().optional(),
    storage: z.string().optional(),
  }).optional(),
  system_req_recommended: z.object({
    os: z.string().optional(),
    cpu: z.string().optional(),
    ram: z.string().optional(),
    gpu: z.string().optional(),
    storage: z.string().optional(),
  }).optional(),
});

export const CheckoutSchema = z.object({
  game_id: z.string().uuid('Invalid Game ID'),
  visitor_phone: z.string().min(8, 'Phone number must be at least 8 digits'),
  payment_gateway: z.enum(['pressopay', 'harakapay', 'mpesa', 'azampay', 'flutterwave']).default('pressopay'),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const SignUpSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const HeroSlideSchema = z.object({
  title: z.string().min(2, 'Slide title is required'),
  subtitle: z.string().optional(),
  image_url: z.string().url('Must be a valid image URL'),
  cta_text: z.string().optional().default('Buy Now'),
  cta_link: z.string().optional().default('/'),
  display_order: z.number().int().optional().default(1),
  is_active: z.boolean().optional().default(true),
});

export const StoreSettingsSchema = z.object({
  custom_background: z.object({
    enabled: z.boolean(),
    image_url: z.string(),
    opacity: z.number().min(0).max(1),
  }).optional(),
  slideshow_speed: z.object({
    interval_ms: z.number().min(1000),
    autoplay: z.boolean(),
  }).optional(),
});

export type GameInput = z.infer<typeof GameSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type SignUpInput = z.infer<typeof SignUpSchema>;
export type HeroSlideInput = z.infer<typeof HeroSlideSchema>;
