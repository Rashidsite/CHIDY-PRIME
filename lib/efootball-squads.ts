export interface EFootballSquad {
  id: string;
  title: string;
  price: number;
  description: string;
  cover_image: string;
  rating: number;
  category: string;
  status: 'published' | 'draft' | 'archived';
  is_sold: boolean;
  redirect_url: string;
  button_text: string;
  team_strength: string;
  booster_coaches: string;
  epics_count: string;
  login_type: string;
  platform: string;
  screenshots: string[];
  created_at?: string;
  raw_links?: any[];
}

/**
 * Clean and extract a valid URL from raw user input.
 * Handles inputs like:
 * - "Message chidyprime on WhatsApp. https://wa.me/255655361060"
 * - "https://wa.me/255655361060"
 * - "0655361060" -> converts to wa.me link with prefilled text
 * - "https://mypaymentgateway.com/pay"
 */
export function cleanRedirectUrl(rawUrl?: string, squadTitle?: string, squadPrice?: number): string {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return generateWhatsAppLink('255655361060', squadTitle, squadPrice);
  }

  const trimmed = rawUrl.trim();

  // 1. Extract any http(s) URL inside the text
  const urlMatch = trimmed.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    return urlMatch[0];
  }

  // 2. Check if it's a wa.me link without https://
  if (trimmed.startsWith('wa.me/')) {
    return `https://${trimmed}`;
  }

  // 3. If it looks like a phone number (e.g. 0655361060, 255655361060, +255...)
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length >= 9 && digitsOnly.length <= 13) {
    return generateWhatsAppLink(digitsOnly, squadTitle, squadPrice);
  }

  // Fallback: return as is if valid or default WhatsApp
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  return generateWhatsAppLink('255655361060', squadTitle, squadPrice);
}

/**
 * Generate a clean WhatsApp click-to-chat URL with prefilled text
 */
export function generateWhatsAppLink(phone: string, squadTitle?: string, squadPrice?: number): string {
  const digits = (phone || '255655361060').replace(/\D/g, '');
  const cleanPhone = digits.startsWith('0') ? '255' + digits.slice(1) : (digits.startsWith('255') ? digits : '255' + digits);

  const titlePart = squadTitle ? ` ${squadTitle}` : ' Kikosi cha eFootball';
  const pricePart = squadPrice ? ` kwa TSh ${squadPrice.toLocaleString()}` : '';
  const message = `Habari Chidy Prime, nahitaji kununua${titlePart}${pricePart}. Nielekeze namna ya kulipia na kupokea akaunti hii sasa.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Parse any post item into a rich EFootballSquad structure with safe fallbacks
 */
export function parseSquadData(post: any): EFootballSquad {
  if (!post) {
    return {
      id: '',
      title: 'Kikosi cha eFootball',
      price: 0,
      description: '',
      cover_image: 'https://i.ibb.co/XZzgkBfx/664335.jpg',
      rating: 4.8,
      category: 'VIKOSI VYA EFOOTBALL',
      status: 'published',
      is_sold: false,
      redirect_url: generateWhatsAppLink('255655361060'),
      button_text: '⚡ NUNUA KIKOSI SASA',
      team_strength: '3000+',
      booster_coaches: 'Makocha Wenye Booster',
      epics_count: 'Epics & Showtime',
      login_type: 'Konami ID Safi',
      platform: 'Mobile (Android & iOS)',
      screenshots: [],
    };
  }

  // 1. Check metadata stored inside links[0] or JSON
  const links = Array.isArray(post.links) ? post.links : [];
  const primaryLink = links[0] || {};

  let rawCover = post.image_url || post.cover_image || 'https://i.ibb.co/XZzgkBfx/664335.jpg';
  let rawScreenshots: string[] = [];

  if (typeof rawCover === 'string' && rawCover.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(rawCover);
      rawCover = parsed.image || parsed.cover || rawCover;
      if (Array.isArray(parsed.screenshots)) rawScreenshots = parsed.screenshots;
    } catch {}
  }

  if (Array.isArray(post.screenshots) && post.screenshots.length > 0) {
    rawScreenshots = post.screenshots;
  } else if (Array.isArray(primaryLink.screenshots) && primaryLink.screenshots.length > 0) {
    rawScreenshots = primaryLink.screenshots;
  }

  const rawDesc = post.description || '';
  const rawTitle = post.title || 'Kikosi cha eFootball';
  const price = Number(post.price || 0);

  // 2. Intelligent heuristics from description/title if metadata not explicitly saved
  let strength = primaryLink.team_strength || '';
  if (!strength) {
    const strengthMatch = (rawDesc + ' ' + rawTitle).match(/STRENGTH\s*([0-9+]+)/i) || (rawDesc + ' ' + rawTitle).match(/\b([23][0-9]{3}\+?)\b/);
    if (strengthMatch) {
      strength = strengthMatch[1].endsWith('+') ? strengthMatch[1] : `${strengthMatch[1]}+`;
    } else {
      strength = '3000+';
    }
  }

  let coaches = primaryLink.booster_coaches || '';
  if (!coaches) {
    const coachMatch = (rawDesc + ' ' + rawTitle).match(/(MAKOCHA\s+[^\s,]+(\s+WENYE\s+BUSTER)?)/i);
    if (coachMatch) {
      coaches = coachMatch[0].trim();
    } else {
      coaches = 'Makocha wenye Booster';
    }
  }

  let epics = primaryLink.epics_count || '';
  if (!epics) {
    const epicsMatch = (rawDesc + ' ' + rawTitle).match(/([0-9]+\s*(EPICS?|SHOWTIME|BIG\s*TIME))/i);
    if (epicsMatch) {
      epics = epicsMatch[0].trim();
    } else {
      epics = 'Epics & Booster Squad';
    }
  }

  const loginType = primaryLink.login_type || 'Konami ID Safi (Haijaunganishwa)';
  const platform = primaryLink.platform || 'Mobile (Android & iOS)';
  const isSold = Boolean(
    primaryLink.is_sold === true ||
    post.status === 'archived' ||
    post.status === 'sold_out' ||
    rawTitle.toLowerCase().includes('sold') ||
    rawDesc.toLowerCase().includes('kimeuzwa')
  );

  const rawUrl = primaryLink.url || post.download_url || '';
  const redirectUrl = cleanRedirectUrl(rawUrl, rawTitle, price);
  const buttonText = primaryLink.button_text || (isSold ? 'KIKOSI KIMEKWISHA (SOLD OUT)' : '⚡ NUNUA KIKOSI SASA');

  return {
    id: post.id,
    title: rawTitle,
    price,
    description: rawDesc,
    cover_image: rawCover,
    rating: Number(post.rating || 4.8),
    category: post.category || 'VIKOSI VYA EFOOTBALL',
    status: isSold ? 'archived' : (post.status === 'draft' ? 'draft' : 'published'),
    is_sold: isSold,
    redirect_url: redirectUrl,
    button_text: buttonText,
    team_strength: strength,
    booster_coaches: coaches,
    epics_count: epics,
    login_type: loginType,
    platform,
    screenshots: rawScreenshots,
    created_at: post.created_at,
    raw_links: links,
  };
}
