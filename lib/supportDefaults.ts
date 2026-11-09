export interface SupportVideoItem {
  id: string;
  title: string;
  youtube_url: string; // YouTube embed URL or watch URL
  description: string;
  is_active: boolean;
  order: number;
}

export interface SupportSocialLink {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'telegram' | 'whatsapp' | 'twitter' | 'other';
  url: string;
  label: string;
  is_active: boolean;
}

export interface SupportFeatureItem {
  id: string;
  icon: string; // Zap, Gamepad2, ShieldCheck, MessageCircle, Headphones, Clock, CheckCircle2, Sparkles, etc.
  title: string;
  description: string;
  is_active: boolean;
}

export interface SupportConfig {
  page_title: string;
  page_subtitle: string;
  welcome_text: string;
  welcome_highlight: string;
  videos: SupportVideoItem[];
  social_links: SupportSocialLink[];
  whatsapp_number: string;
  whatsapp_message: string;
  features: SupportFeatureItem[];
  unpaid_warning_title: string;
  unpaid_warning_message: string;
}

export const DEFAULT_SUPPORT_CONFIG: SupportConfig = {
  page_title: 'DAWATI LA MSAADA',
  page_subtitle: 'ChidyPrime × ChidyGaming • Official Help Desk',
  welcome_text: 'Karibu sana gamer! Naitwa Chidy. Kama umekwama kupakua au ku-set mchezo wako, unahitaji msaada kuhusu malipo, au unataka kuulizia game lolote, wasiliana nami moja kwa moja kupitia WhatsApp.',
  welcome_highlight: '💬 Nitazungumza nawe moja kwa moja WhatsApp kukusaidia papo hapo bila chenga!',
  videos: [
    {
      id: 'vid-1',
      title: 'Namna Ya Kupakua na Ku-set Game Kwenye Simu / PC',
      youtube_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      description: 'Tazama video hii fupi kuelewa hatua zote za kupakua faili na kuliweka kwenye kifaa chako.',
      is_active: true,
      order: 1,
    },
  ],
  social_links: [
    { id: 'soc-yt', platform: 'youtube', label: 'YouTube Channel', url: 'https://youtube.com/@chidyprime', is_active: true },
    { id: 'soc-ig', platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/chidyprime', is_active: true },
    { id: 'soc-tt', platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@chidyprime', is_active: true },
    { id: 'soc-tg', platform: 'telegram', label: 'Telegram Group', url: 'https://t.me/chidyprime', is_active: true },
  ],
  whatsapp_number: '255655361060',
  whatsapp_message: 'Habari Chidy, nahitaji msaada kuhusu huduma za ChidyPrime x ChidyGaming.',
  features: [
    { id: 'f1', icon: 'Zap', title: 'Majibu ya Haraka', description: 'Tunajibu meseji yako moja kwa moja bila foleni.', is_active: true },
    { id: 'f2', icon: 'Gamepad2', title: 'Msaada wa Kuset', description: 'Maelekezo rahisi ya kuweka game kwenye simu au PC.', is_active: true },
    { id: 'f3', icon: 'ShieldCheck', title: 'Uhakiki wa Malipo', description: 'Tuma screenshot ya malipo utatuliwe mara moja.', is_active: true },
  ],
  unpaid_warning_title: '⚠️ Lipia Game Kwanza!',
  unpaid_warning_message: 'Samahani gamer! Ili kupata msaada wa moja kwa moja wa WhatsApp, unahitaji kuwa na angalau oda moja iliyolipwa (mchezo uliokamilisha malipo). Rudi kwenye duka, chagua game unayopenda kisha urudi hapa kwa msaada!',
};

// Helper to convert any YouTube URL (watch, shorts, embed, youtu.be) into an embed URL
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  try {
    // If it's already an embed URL
    if (url.includes('youtube.com/embed/')) return url;
    
    // Check youtu.be shortlinks
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
    if (shortMatch && shortMatch[1]) {
      return `https://www.youtube.com/embed/${shortMatch[1]}`;
    }

    // Check watch?v=
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
    if (watchMatch && watchMatch[1]) {
      return `https://www.youtube.com/embed/${watchMatch[1]}`;
    }

    // Check shorts/
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
    if (shortsMatch && shortsMatch[1]) {
      return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    }

    return url;
  } catch {
    return url;
  }
}
