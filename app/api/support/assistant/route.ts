import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Helper to normalize phone number to last 9 digits for matching
function normalizeDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '').slice(-9);
}

// Helper to extract phone number mentioned inside text
function extractPhoneFromText(text: string): string | null {
  const match = text.match(/(?:255|0|\+255)?[67]\d{8}/);
  return match ? match[0] : null;
}

// Clean Swahili stop words to extract pure game search keyword
function extractGameSearchKeyword(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"()]/g, ' ')
    .replace(/\b(unalo|unayo|unazo|una|mna|mnalo|mnayo|mnazo|kuna|kunaloo|lipo|zipo|ipo|zile|lile|hilo|hizo|huyu|huyo)\b/g, ' ')
    .replace(/\b(nataka|nahitaji|naomba|tafadhali|nionyeshe|lete|nipatie|nipe|ninataka)\b/g, ' ')
    .replace(/\b(games|game|gemu|magame|mchezo|michezo)\b/g, ' ')
    .replace(/\b(la|za|ya|wa|cha|vya|na|kwa|je|bana|eti|hivi|kwani)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Known official categories metadata for instant fallback & context
const OFFICIAL_CATEGORIES_METADATA = [
  { name: 'TANZANIA GAMES', label: '🇹🇿 TANZANIA GAMES', icon: '🇹🇿', desc: 'Michezo ya nyumbani Tanzania na mods zake' },
  { name: 'MALEO BUS MODE TZ', label: '🚌 MALEO BUS MODE TZ', icon: '🚌', desc: 'Mods za mabasi ya Tanzania (Shabiby, BM, Ally’s, n.k.)' },
  { name: 'MALEO MAP MODE TZ', label: '🗺️ MALEO MAP MODE TZ', icon: '🗺️', desc: 'Ramani za barabara za Tanzania (Dar es Salaam, Arusha, Mbeya)' },
  { name: 'FOOTBALL GAMES', label: '⚽ FOOTBALL GAMES', icon: '⚽', desc: 'Michezo ya mpira: FIFA, eFootball, PES' },
  { name: 'PREMIUM GAMES.', label: '💎 PREMIUM GAMES', icon: '💎', desc: 'Michezo mikubwa na mizito ya hadhi ya juu' },
  { name: 'VIKOSI VYA EFOOTBALL', label: '👥 VIKOSI VYA EFOOTBALL', icon: '👥', desc: 'Vikosi na patches za Simba SC, Yanga SC, Taifa Stars' },
  { name: 'FREE GAMES.', label: '🆓 FREE GAMES (BURE)', icon: '🆓', desc: 'Michezo ya bure kabisa bila kulipia hata shilingi 1' },
  { name: 'FAVORITE GAMES', label: '⭐ FAVORITE GAMES', icon: '⭐', desc: 'Michezo inayopendwa na kuchezwa zaidi' },
  { name: 'WORLD GAMES', label: '🌍 WORLD GAMES', icon: '🌍', desc: 'GTA San Andreas, GTA Vice City, God of War na miziki yote ya kimataifa' },
  { name: 'PS2 GAMES KWENYE SIMU', label: '🎮 PS2 GAMES KWENYE SIMU', icon: '🎮', desc: 'Michezo ya PlayStation 2 inayochezeka simuni bila chenga' },
  { name: 'PC/COMPUTER GAMES', label: '💻 PC/COMPUTER GAMES', icon: '💻', desc: 'Michezo ya kompyuta na laptops' },
  { name: 'GAMES TOOLS', label: '🛠️ GAMES TOOLS', icon: '🛠️', desc: 'Programu za kuchezea: ZArchiver Pro, PPSSPP Gold, n.k.' },
  { name: 'MALEO BUS SKIN', label: '🎨 MALEO BUS SKIN', icon: '🎨', desc: 'Muonekano (liveries/skins) wa mabasi ya Tanzania' },
];

// Helper to format post objects into consistent game cards
function formatGameCard(p: any) {
  const links = Array.isArray(p.links) ? p.links : [];
  const primaryDownload = links[0]?.url || p.download_url || '';

  return {
    id: p.id,
    title: p.title || 'Game',
    category: p.category || 'Mchezo',
    price: Number(p.price || 0),
    cover_image: p.image_url || '/placeholder.png',
    description: p.description || '',
    download_url: primaryDownload,
    links: links,
  };
}

// Helper to fetch Maleo Base Game from database
async function getMaleoBaseGame(supabase: any) {
  try {
    const { data } = await supabase
      .from('posts')
      .select('id, title, category, price, image_url, description, links')
      .eq('status', 'published')
      .or('title.ilike.%MALEO BUS SIMULATOR INDONESIA V4.3%,title.ilike.%MALEO ETS2 FULL MODE TZ%,title.ilike.%MALEO BUS SIMULATOR INDONESIA (BASE%')
      .limit(1)
      .maybeSingle();

    if (data) return formatGameCard(data);
  } catch {}
  return null;
}

// ── GET: Check Payment Unlock Endpoint ──
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || '';
    const phoneDigits = normalizeDigits(rawPhone);

    if (!phoneDigits || phoneDigits.length < 9) {
      return NextResponse.json({ unlocked: false, message: 'Namba haijakamilika' });
    }

    const supabase = createAdminClient();

    const [pRes, oRes] = await Promise.all([
      supabase
        .from('payment_orders')
        .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, image_url, links, youtube_url, description)')
        .ilike('phone_number', `%${phoneDigits}%`)
        .in('status', ['approved', 'completed', 'success'])
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('orders')
        .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, image_url, links, youtube_url, description)')
        .ilike('phone_number', `%${phoneDigits}%`)
        .in('status', ['approved', 'completed', 'success'])
        .order('created_at', { ascending: false })
        .limit(1)
    ]);

    const approved = (pRes.data && pRes.data[0]) || (oRes.data && oRes.data[0]);

    if (approved) {
      const game = (approved as any).posts;
      const links = game?.links || [];
      const validLinks = Array.isArray(links) ? links : [];

      return NextResponse.json({
        unlocked: true,
        type: 'verified_order',
        unpaidAttempts: 0,
        userPhone: rawPhone,
        message: `🎉 Hongera kaka! Malipo yako ya game la "${game?.title || 'Game'}" yamethibitishwa rasmi ✅. Dawati la msaada limefunguliwa mara moja! Hapa chini kuna link yako ya kudownload:`,
        order: {
          id: approved.id,
          gameTitle: game?.title || 'Game',
          coverImage: game?.image_url || null,
          amount: approved.amount,
          downloadLinks: validLinks,
          installGuide: game?.description || 'Pakua files, extract kwa kutumia app ya ZArchiver, kisha fuata maelekezo ya kuweka OBB/Data au install APK.',
          videoUrl: game?.youtube_url || null,
        },
      });
    }

    return NextResponse.json({ unlocked: false, message: 'Malipo bado hayajathibitishwa' });
  } catch (error: any) {
    console.error('GET unlock check error:', error);
    return NextResponse.json({ unlocked: false, error: error.message }, { status: 500 });
  }
}

// ── POST: Chat Message & Intent Processing ──
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      message = '', 
      phone: providedPhone = '', 
      sessionId = '', 
      unpaidAttempts = 0,
      recentGameId = null,
      action = ''
    } = body;

    const trimmedMsg = (message || '').trim();
    const lowerMsg = trimmedMsg.toLowerCase();
    const extractedPhone = extractPhoneFromText(trimmedMsg);
    const activePhone = extractedPhone || providedPhone || '';
    const phoneDigits = normalizeDigits(activePhone);

    const supabase = createAdminClient();

    // 1. Fetch Assistant configuration
    const { data: settingData } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'assistant_config')
      .maybeSingle();

    const config = settingData?.value || {
      welcome_message: 'Oya gamer! Karibu sana HQ ya ChidyPrime x ChidyGaming 🎮 Naitwa Chidy, nipo hapa kuhakikisha unacheza bila chenga. Niambie kaka, umekwama wapi au unahitaji mchongo gani leo?',
      general_youtube_url: 'https://www.youtube.com/@ChidyGaming',
      max_unpaid_attempts: 5,
      lockout_minutes: 60,
      featured_tz_games: [],
      featured_intl_games: [],
      hidden_video_vault: [],
    };

    const maxAttempts = config.max_unpaid_attempts || 5;
    const lockoutMinutes = config.lockout_minutes || 60;

    // Helper to query approved orders
    const checkApprovedOrder = async (digits: string) => {
      if (!digits || digits.length < 9) return null;
      const [pRes, oRes] = await Promise.all([
        supabase
          .from('payment_orders')
          .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, image_url, links, youtube_url, description)')
          .ilike('phone_number', `%${digits}%`)
          .in('status', ['approved', 'completed', 'success'])
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('orders')
          .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, image_url, links, youtube_url, description)')
          .ilike('phone_number', `%${digits}%`)
          .in('status', ['approved', 'completed', 'success'])
          .order('created_at', { ascending: false })
          .limit(1)
      ]);
      return (pRes.data && pRes.data[0]) || (oRes.data && oRes.data[0]) || null;
    };

    // If explicit action is check_unlock
    if (action === 'check_unlock' && phoneDigits.length >= 9) {
      const approved = await checkApprovedOrder(phoneDigits);
      if (approved) {
        const game = (approved as any).posts;
        const links = game?.links || [];
        return NextResponse.json({
          type: 'verified_order',
          unpaidAttempts: 0,
          userPhone: activePhone,
          message: `🎉 Hongera kaka! Malipo yako ya game la "${game?.title || 'Game'}" yamethibitishwa ✅. Dawati la msaada limefunguliwa mara moja! Hapa chini kuna link yako ya kudownload:`,
          order: {
            id: approved.id,
            gameTitle: game?.title || 'Game',
            coverImage: game?.image_url || null,
            amount: approved.amount,
            downloadLinks: Array.isArray(links) ? links : [],
            installGuide: game?.description || 'Pakua files, extract kwa kutumia app ya ZArchiver, kisha fuata maelekezo ya kuweka OBB/Data au install APK.',
            videoUrl: game?.youtube_url || null,
          },
        });
      }
      return NextResponse.json({
        type: 'still_locked',
        isLocked: true,
        message: 'Malipo bado hayajathibitishwa. Tafadhali hakikisha umekamilisha muamala kwenye simu yako au nunua game dukani.',
        unpaidAttempts,
      });
    }

    // 2. CHECK LOCKOUT: But if user actually paid, UNLOCK immediately!
    if (unpaidAttempts >= maxAttempts) {
      if (phoneDigits.length >= 9) {
        const approved = await checkApprovedOrder(phoneDigits);
        if (approved) {
          const game = (approved as any).posts;
          const links = game?.links || [];
          return NextResponse.json({
            type: 'verified_order',
            unpaidAttempts: 0,
            userPhone: activePhone,
            message: `🎉 Hongera sana kaka! Malipo yako ya game la "${game?.title || 'Game'}" yamethibitishwa rasmi ✅. Dawati la msaada limefunguliwa mara moja! Hapa chini kuna link yako ya kudownload:`,
            order: {
              id: approved.id,
              gameTitle: game?.title || 'Game',
              coverImage: game?.image_url || null,
              amount: approved.amount,
              downloadLinks: Array.isArray(links) ? links : [],
              installGuide: game?.description || 'Pakua files, extract kwa kutumia app ya ZArchiver, kisha fuata maelekezo ya kuweka OBB/Data au install APK.',
              videoUrl: game?.youtube_url || null,
            },
          });
        }
      }

      return NextResponse.json({
        type: 'lockout',
        isLocked: true,
        lockoutMinutes,
        message: `⛔ Umejaribu zaidi ya mara ${maxAttempts} bila uthibitisho wa malipo halisi. Sehemu ya msaada imefungwa kwa akaunti hii kwa muda kwa ajili ya usalama. Unaweza kuendelea kununua game dukani kamakawaida, na ukishalipia dirisha la msaada litafunguka mara moja!`,
        unpaidAttempts,
      });
    }

    // 3. INTENT DETECTION
    const cleanedDigitsOnly = trimmedMsg.replace(/\D/g, '');
    const isPurePhoneInput = cleanedDigitsOnly.length >= 9 && cleanedDigitsOnly.length <= 13;

    // Explicit payment query words
    const explicitPaymentKeywords = [
      'nimelipa', 'sijapata', 'nimekatwa', 'kulipia', 'nimetuma',
      'muamala', 'oda yangu', 'kagua oda', 'status ya oda', 'thibitisha malipo',
      'hela imetoka', 'pesa imetoka', 'nimeingiza pin', 'namba yangu ni',
      'mbona sijapata', 'nimeshalipa', 'stk', 'order'
    ];
    const isExplicitPaymentCheck = explicitPaymentKeywords.some(kw => lowerMsg.includes(kw));

    // A message is ONLY a payment check if it provides a phone number OR explicitly talks about payments/orders
    const isPaymentCheck = isPurePhoneInput || isExplicitPaymentCheck || (extractedPhone !== null);

    // ── INTENT 1: Payment Check & Verification ──
    if (isPaymentCheck) {
      if (!phoneDigits || phoneDigits.length < 9) {
        return NextResponse.json({
          type: 'need_phone',
          message: 'Pole sana bro kwa usumbufu! Usijali kabisa hela yako ipo salama 100%. Naomba namba yako ya simu (mfano 07xxxxxxxx au 06xxxxxxxx) uliyotumia kufanya malipo nikuthibitishie hapa hapa fasta.',
          unpaidAttempts,
        });
      }

      // Check database for approved or pending orders
      const [pRes, oRes] = await Promise.all([
        supabase
          .from('payment_orders')
          .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, image_url, links, youtube_url, description)')
          .ilike('phone_number', `%${phoneDigits}%`)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('orders')
          .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, image_url, links, youtube_url, description)')
          .ilike('phone_number', `%${phoneDigits}%`)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const orders = [...(pRes.data || []), ...(oRes.data || [])];

      // 1. Approved order
      const approvedOrder = orders.find(o => 
        o.status === 'approved' || o.status === 'completed' || o.status === 'success'
      );

      if (approvedOrder) {
        const game = (approvedOrder as any).posts;
        const links = game?.links || [];
        const validLinks = Array.isArray(links) ? links : [];
        const catLower = (game?.category || '').toLowerCase();
        const titleLower = (game?.title || '').toLowerCase();

        // Check if the purchased game is a Maleo Mod, Map Mod, or Skin
        const isMaleoModOrMap = 
          catLower.includes('maleo') ||
          catLower.includes('bus mode') ||
          catLower.includes('map mode') ||
          catLower.includes('bus skin') ||
          titleLower.includes('mod') ||
          titleLower.includes('skin') ||
          titleLower.includes('map mode');

        if (isMaleoModOrMap) {
          const maleoBase = await getMaleoBaseGame(supabase);

          return NextResponse.json({
            type: 'verified_order',
            unpaidAttempts: 0,
            userPhone: activePhone,
            message: `🎉 Hongera sana kaka! Malipo yako ya "${game?.title || 'Mod ya Maleo'}" yamethibitishwa kikamilifu ✅. Link yako ya kudownload ipo hapa chini.\n\n` +
              `⚠️ **ANGALIZO MUHIMU LA KUZINGATIA:**\n` +
              `Kaka, hiki ulichopakua ni **MOD (Nyongeza Maalum ya Basi / Ramani ya Tanzania)**. Hii haichezeki yenyewe kama game linalojitegemea — inafanya kazi kwa kuingizwa **ndani ya Game Mama la Maleo (Bus Simulator Indonesia)**.\n\n` +
              `🚫 **Kwanini usiende PlayStore?**\n` +
              `Game la kawaida la PlayStore halina features za Tanzania, halina traffic ya magari ya bongo, na mara nyingi mods hizi hazikubali au zinaleta weusi (black screen) na kugoma.\n` +
              `Hapa chini nimekuwekea **Game Mama la Maleo (Toleo Maalum la Tanzania lenye OBB kamili)** lililotengenezwa kusoma mods zote za Tanzania kwa graphics kali sana bila kukwama! Lipia sasa hivi hapa hapa upate mchezo kamili!\n\n` +
              `🛠️ **JINSI YA KU-SET MOD HII NDANI YA GAME:**\n` +
              `1. Pakua faili la Mod kwa kitufe kilicho hapa chini ukitumia app ya ZArchiver.\n` +
              `2. Hamisha faili la mod (.bussidmod au .bussidvehicle) kwenda: **Internal Storage ➡️ BUSSID ➡️ Mods**.\n` +
              `3. Fungua Game lako la Maleo uende GARAGE au MOD, utaliona basi/ramani yako tayari kucheza! 🔥`,
            order: {
              id: approvedOrder.id,
              gameTitle: game?.title || 'Game',
              coverImage: game?.image_url || null,
              amount: approvedOrder.amount,
              downloadLinks: validLinks,
              installGuide: 'Hamisha faili la mod kwenda folda la BUSSID/Mods kwenye simu yako kisha ufungue game la Maleo kucheza.',
              videoUrl: 'https://youtube.com/shorts/VIchKJulyS0?si=-LBQ6DWLPk7XDvfW',
            },
            games: maleoBase ? [maleoBase] : undefined,
            tutorial: {
              title: 'Jinsi ya Ku-set Mods za Maleo Kwenye Simu Hatua kwa Hatua',
              videoUrl: 'https://youtube.com/shorts/VIchKJulyS0?si=-LBQ6DWLPk7XDvfW',
              instructions: 'Tazama video hii fupi uone jinsi ya kuhamisha faili la mod kwenda folda la BUSSID/Mods.',
            },
            validHours: 24,
          });
        }

        return NextResponse.json({
          type: 'verified_order',
          unpaidAttempts: 0,
          userPhone: activePhone,
          message: `Nimeiona oda yako ya namba ${activePhone} kaka! Malipo ya game la "${game?.title || 'Game'}" yamethibitishwa safi kabisa ✅. Link yako ya kudownload ipo hapa chini. Kumbuka link hii inafanya kazi ndani ya masaa 24 kuanzia sasa!`,
          order: {
            id: approvedOrder.id,
            gameTitle: game?.title || 'Game',
            coverImage: game?.image_url || null,
            amount: approvedOrder.amount,
            downloadLinks: validLinks,
            installGuide: game?.description || 'Pakua files, extract kwa kutumia app ya ZArchiver, kisha fuata maelekezo ya kuweka OBB/Data au install APK.',
            videoUrl: game?.youtube_url || null,
          },
          validHours: 24,
        });
      }

      // 2. Pending or failed order attempt
      const pendingOrFailedOrder = orders.find(o => 
        o.status === 'pending' || o.status === 'failed' || o.status === 'cancelled'
      );

      const nextAttempts = unpaidAttempts + 1;

      // Lockout threshold reached
      if (nextAttempts >= maxAttempts) {
        return NextResponse.json({
          type: 'lockout',
          isLocked: true,
          lockoutMinutes,
          message: `⛔ Umejaribu zaidi ya mara ${maxAttempts} bila uthibitisho wa malipo halisi. Sehemu ya msaada imefungwa kwa akaunti hii kwa muda kwa ajili ya usalama. Tafadhali jaribu tena baada ya saa 1. Unaweza kuendelea kununua game dukani kamakawaida, na ukishalipia dirisha la msaada litafunguka mara moja!`,
          unpaidAttempts: nextAttempts,
          userPhone: activePhone,
        });
      }

      if (pendingOrFailedOrder) {
        const attemptedGameObj = (pendingOrFailedOrder as any).posts;
        const attemptedGameTitle = attemptedGameObj?.title || 'ulilochagua';
        const cardGame = attemptedGameObj ? [formatGameCard(attemptedGameObj)] : undefined;

        let failureText = '';
        if (nextAttempts >= 3) {
          failureText = `Malipo yako hayajafanikiwa kabisa kaka, mfumo hautambui muamala huu (status: ${pendingOrFailedOrder.status || 'pending'}). Hivyo lipia tena game lako la "${attemptedGameTitle}" hapa chini upate huduma mara moja:`;
        } else {
          failureText = `Nimeona ulijaribu kulipia game la "${attemptedGameTitle}", lakini malipo yako hayajafanyika kwenye mtandao kaka (status: ${pendingOrFailedOrder.status || 'pending'}).\n\nHapa chini nimekuwekea kadi ya game hilo ulipie tena sasa hivi hapa hapa upate link mara moja:`;
        }

        return NextResponse.json({
          type: 'unpaid_attempt',
          unpaidAttempts: nextAttempts,
          userPhone: activePhone,
          message: failureText,
          games: cardGame,
          quickActions: [
            { label: '🚌 Nataka Game la Mabasi', query: 'Maleo Bus Mode' },
            { label: '🎮 Tazama Categories Zote', query: 'Kuna category gani' },
            { label: '🔥 Games Zote Kali', query: 'Nataka game' },
          ],
        });
      }

      // No order record found at all for this phone
      let noRecordText = '';
      if (nextAttempts >= 3) {
        noRecordText = `Kaka hakuna kumbukumbu ya malipo yoyote yaliyofanyika kwa namba hii (${activePhone}). Mfumo haujaona muamala wowote, hivyo lipia tena game unalotaka hapa chini upate link mara moja.`;
      } else {
        noRecordText = `Kaka nimeikagua namba yako (${activePhone}) kwenye mfumo lakini sijaona muamala wowote uliokamilika kwa sasa.\n\nJe, ulikuwa unajaribu kulipia game gani kaka (mfano: Maleo Bus, ETS2 Tanzania, au game lingine)? Niambie hapa hapa nikutumie uweze kulipia na kupata link mara moja! 🔥`;
      }

      return NextResponse.json({
        type: 'unpaid_ask_game',
        unpaidAttempts: nextAttempts,
        userPhone: activePhone,
        message: noRecordText,
        quickActions: [
          { label: '🚌 Maleo Bus Mod TZ', query: 'Maleo' },
          { label: '🚛 ETS2 Tanzania', query: 'ETS2' },
          { label: '⚽ Michezo ya Mpira', query: 'Football Games' },
          { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
          { label: '🔥 Games Zote Kali', query: 'Nataka game' },
        ],
      });
    }

    // ── INTENT 2: Follow-up Questions for Maleo Mods ("Kwaiyo nilipie hili game?", "Sijaelewa", "Nitalipia baadae", "Nirudishie hela") ──

    // 2A: "Kwaiyo nilipie hili game?" / "Nilipie tena?" / "Kwani lazima nilipe?"
    const isWhyPayAgainQuery = 
      lowerMsg.includes('nilipie tena') ||
      lowerMsg.includes('nilipie hili game') ||
      lowerMsg.includes('nilipie na hili') ||
      lowerMsg.includes('kwaiyo nilipie') ||
      lowerMsg.includes('kwa hiyo nilipie') ||
      lowerMsg.includes('kulipa mara mbili') ||
      lowerMsg.includes('kwanini nilipe') ||
      lowerMsg.includes('kwani lazima');

    if (isWhyPayAgainQuery) {
      const maleoBase = await getMaleoBaseGame(supabase);

      return NextResponse.json({
        type: 'game_cards',
        message: `Ndio kaka, unahitaji Game Mama la Maleo kwa sababu mod uliyochukua ni 'basi pekee' au 'ramani pekee' inayowekwa ndani ya hilo game ili uweze kuendesha! 😊\n\n` +
          `⚠️ **Kwanini usiende PlayStore?**\n` +
          `Game la kawaida la PlayStore halina features za barabara za Tanzania, halina sauti za honi za kibongo wala halisupport mods hizi vizuri (mara nyingi linatoa weusi au crash).\n\n` +
          `Toleo letu lililopo hapa limeboreshwa maalum kwa ajili ya mods na ramani zote za Tanzania, lina graphics kali za OBB na linacheza laini sana bila kukwama. Bei yake ni ndogo sana kaka na ukilipia hapa hapa unapata link mara moja uanze kufurahia basi lako sasa hivi bila usumbufu! 🔥`,
        games: maleoBase ? [maleoBase] : undefined,
        quickActions: [
          { label: '📺 Nielekeze jinsi ya ku-set', query: 'Nielekeze jinsi ya kuset game' },
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
        ],
        unpaidAttempts,
      });
    }

    // 2B: "Sijaelewa" / "Bado sijaelewa" / "Sielewi" / "Nieleweshe vizuri"
    const isNotUnderstandQuery =
      lowerMsg === 'sijaelewa' ||
      lowerMsg.includes('bado sijaelewa') ||
      lowerMsg.includes('sielewi') ||
      lowerMsg.includes('nieleweshe vizuri') ||
      lowerMsg.includes('mbona sielewi') ||
      lowerMsg.includes('sijaelewa vizuri');

    if (isNotUnderstandQuery) {
      const maleoBase = await getMaleoBaseGame(supabase);

      return NextResponse.json({
        type: 'game_cards',
        message: `Pole sana kaka, ngoja nikuelezee kwa lugha nyepesi sana ya kijiweni uelewe mara moja! 🤝\n\n` +
          `Bro ni hivi: Ulichonunua ni **'Basi la Kitanzania'** (Mod). Lakini basi haliwezi kutembea hewani bila kuwa na uwanja/barabara (Game Mama la Maleo).\n\n` +
          `Ni sawa na kununua CD ya nyimbo au flash ya muziki — lazima uwe na redio/spika ili muziki uweze kulia! Game la Maleo ndio redio yako, na mod ndio wimbo wako.\n\n` +
          `Usipoteze muda PlayStore maana toleo lile halina mazingira ya Tanzania na litakupa weusi au kugoma. Chukua hili toleo letu maalum la Maleo Base hapa chini ulipie mara moja, liweke kwenye simu kisha uweke basi lako uanze kula raha mwanangu! 🔥`,
        games: maleoBase ? [maleoBase] : undefined,
        tutorial: {
          title: 'Jinsi ya Ku-set Mods za Maleo Hatua kwa Hatua',
          videoUrl: 'https://youtube.com/shorts/VIchKJulyS0?si=-LBQ6DWLPk7XDvfW',
          instructions: 'Tazama video hii uone jinsi ya kuweka mod ndani ya game la Maleo.',
        },
        quickActions: [
          { label: '📺 Video ya Ku-set', query: 'Nielekeze jinsi ya kuset game' },
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
        ],
        unpaidAttempts,
      });
    }

    // 2C: "Nitalipia baadae" / "Sawa nitalipia baadae" / "Sina hela sasa hivi"
    const isPayLaterQuery =
      lowerMsg.includes('nitalipia baadae') ||
      lowerMsg.includes('kulipia baadae') ||
      lowerMsg.includes('baadae nitanunua') ||
      lowerMsg.includes('sina hela') ||
      lowerMsg.includes('baadae kaka') ||
      lowerMsg.includes('hata nitalipa');

    if (isPayLaterQuery) {
      const maleoBase = await getMaleoBaseGame(supabase);

      return NextResponse.json({
        type: 'game_cards',
        message: `Sawa kabisa kaka, hakuna shida! Ujumbe wako na link ya mod uliyolipia vipo salama hapa kwenye chat kwa masaa 24. 🤝\n\n` +
          `Lakini nakushauri ukipata nafasi uchukue hili game mama la Maleo la hapa kwetu mapema ili usikose uhondo wa kuliendesha basi lako leo hii! Kumbuka game la kawaida la PlayStore halitakupa uhalisia wa Tanzania wala halitakubali hizi mods bila kuleta weusi.\n\n` +
          `Ukirudi hapa nipo hewani masaa 24 kukuhudumia chap! Karibu sana brother. 🔥`,
        games: maleoBase ? [maleoBase] : undefined,
        quickActions: [
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
          { label: '📺 Jinsi ya Ku-set', query: 'Nielekeze jinsi ya kuset game' },
        ],
        unpaidAttempts,
      });
    }

    // 2D: "Nirudishie hela" / "Rudisha pesa" / "Silitaki" / "Refund"
    const isRefundQuery =
      lowerMsg.includes('nirudishie hela') ||
      lowerMsg.includes('rudisha hela') ||
      lowerMsg.includes('rudisha pesa') ||
      lowerMsg.includes('nirudishie pesa') ||
      lowerMsg.includes('silitaki') ||
      lowerMsg.includes('rudisheni') ||
      lowerMsg.includes('refund');

    if (isRefundQuery) {
      const maleoBase = await getMaleoBaseGame(supabase);

      return NextResponse.json({
        type: 'game_cards',
        message: `Pole sana kaka kwa changamoto, nimekuelewa vizuri sana. 🤝\n\n` +
          `Kulingana na sera ya bidhaa za mtandaoni (digital downloads), link za faili zikishatolewa kwenye mfumo huwa haziwezi kurudishwa moja kwa moja maana tayari zimeshakuwa mkononi mwako.\n\n` +
          `Lakini usijali kabisa bro, hela yako haijapotea bure hata kidogo! Umenunua mod kali sana ya kipekee ya Tanzania. Ili uweze kuitumia kikamilifu, unahitaji tu game mama la Maleo la Kitanzania (ambalo lipo hapa chini kwa bei ndogo sana).\n\n` +
          `Tuko hapa kuhakikisha unacheza na kufurahia ulicholipia bila kukwama. Lipia game mama hapa chini nikutumie chap uanze kucheza sasa hivi bila tatizo kaka! 🔥`,
        games: maleoBase ? [maleoBase] : undefined,
        quickActions: [
          { label: '📺 Tazama Video ya Ku-set', query: 'Nielekeze jinsi ya kuset game' },
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
        ],
        unpaidAttempts,
      });
    }

    // ── INTENT 3: Free Games Query ("game za bure zipo", "kama game bure zipo", "kuna za bure", "za bure", "free games", "bure") ──
    const isFreeGameRequest = 
      lowerMsg.includes('bure') ||
      lowerMsg.includes('free') ||
      lowerMsg.includes('bwerere');

    if (isFreeGameRequest) {
      const { data: freePosts } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description, links')
        .eq('status', 'published')
        .or('price.eq.0,price.is.null,category.ilike.%free%')
        .not('category', 'ilike', '%LIVE_TV%')
        .limit(8);

      if (freePosts && freePosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Ndio kaka! Michezo ya bure (Free Games) ipo kibao bila malipo yoyote! 🎉\n\nKwenye tovuti yetu tuna category maalum ya "FREE GAMES." na "GAMES TOOLS" yenye zaidi ya michezo na tools 20+ za bure zikiwemo Subway Surfers, Burnout Dominator, Crazy Taxi, Truck Simulator Euro Driver, Hellboy, Juiced 2, ZArchiver Pro, PPSSPP Gold na nyinginezo!\n\nHaya hapa baadhi ya magame ya bure kabisa unaweza kuyapakua sasa hivi bila hata shilingi 1: 🔥🎁`,
          games: freePosts.map(formatGameCard),
          quickActions: [
            { label: '🎮 Categories Zote', query: 'Kuna category gani' },
            { label: '🚌 Mabasi ya Tanzania', query: 'Maleo Bus Mode' },
            { label: '⚽ Michezo ya Mpira', query: 'Football Games' },
          ],
          unpaidAttempts,
        });
      }
    }

    // ── INTENT 4: Category Overview / Discovery ("kuna category gani", "categories zilizopo", "categories zipi", "menu", "aina za games") ──
    const isCategoryOverviewRequest = 
      lowerMsg.includes('category gani') ||
      lowerMsg.includes('categories zipi') ||
      lowerMsg.includes('categories zilizopo') ||
      lowerMsg.includes('categories zenu') ||
      lowerMsg.includes('kuna category') ||
      lowerMsg.includes('kuna categories') ||
      lowerMsg.includes('aina za games') ||
      lowerMsg.includes('makundi ya games') ||
      lowerMsg.includes('orodha ya category') ||
      lowerMsg.includes('vipengele') ||
      lowerMsg === 'categories' ||
      lowerMsg === 'category';

    if (isCategoryOverviewRequest) {
      const { data: catRows } = await supabase
        .from('categories')
        .select('name, display_order')
        .eq('is_visible', true)
        .order('display_order', { ascending: true });

      const categoryNames = catRows && catRows.length > 0
        ? catRows.map(c => c.name)
        : OFFICIAL_CATEGORIES_METADATA.map(c => c.name);

      const overviewList = OFFICIAL_CATEGORIES_METADATA
        .filter(meta => categoryNames.includes(meta.name))
        .map((meta, i) => `${i + 1}. ${meta.icon} **${meta.name}** — ${meta.desc}`)
        .join('\n');

      return NextResponse.json({
        type: 'conversational',
        message: `Kwenye tovuti yetu ya **ChidyGaming** tuna categories (makundi) yafuatayo yaliyopo rasmi kwenye uso wa website kaka:\n\n${overviewList}\n\n👇 Bonyeza kitufe chochote hapa chini kuona michezo ya category unayotaka au andika jina lake nikutumie papo hapo:`,
        quickActions: [
          { label: '🇹🇿 Tanzania Games', query: 'Tanzania Games' },
          { label: '🚌 Maleo Bus Mods', query: 'Maleo Bus Mode' },
          { label: '🗺️ Maleo Map Mods', query: 'Maleo Map Mode' },
          { label: '⚽ Football Games', query: 'Football Games' },
          { label: '🆓 Free Games (Bure)', query: 'Free Games' },
          { label: '🎮 PS2 Games Simuni', query: 'PS2 Games' },
          { label: '🌍 World Games', query: 'World Games' },
          { label: '🛠️ Games Tools', query: 'Games Tools' },
        ],
        unpaidAttempts,
      });
    }

    // ── INTENT 5: Specific Category Selection (e.g. "Maleo Bus Mode", "PS2 Games", "Football Games", etc.) ──
    const categoryMapping: Array<{ matchPhrases: string[]; dbPattern: string; title: string }> = [
      {
        matchPhrases: ['maleo bus mode', 'maleo bus', 'mabasi ya maleo', 'bus mode', 'bus mods tz', 'mabasi ya tz'],
        dbPattern: 'MALEO BUS MODE TZ',
        title: 'MALEO BUS MODE TZ 🚌',
      },
      {
        matchPhrases: ['maleo map mode', 'maleo map', 'map mode', 'ramani za maleo', 'ramani za tanzania', 'map mods'],
        dbPattern: 'MALEO MAP MODE TZ',
        title: 'MALEO MAP MODE TZ 🗺️',
      },
      {
        matchPhrases: ['maleo bus skin', 'bus skin', 'skin za mabasi', 'skin ya basi'],
        dbPattern: 'MALEO BUS SKIN',
        title: 'MALEO BUS SKIN 🎨',
      },
      {
        matchPhrases: ['tanzania games', 'tanzania game', 'michezo ya tanzania', 'game za tanzania'],
        dbPattern: 'TANZANIA GAMES',
        title: 'TANZANIA GAMES 🇹🇿',
      },
      {
        matchPhrases: ['football games', 'football', 'mpira', 'michezo ya mpira', 'fifa', 'pes', 'efootball'],
        dbPattern: 'FOOTBALL GAMES',
        title: 'FOOTBALL GAMES ⚽',
      },
      {
        matchPhrases: ['vikosi vya efootball', 'vikosi', 'kikosi', 'simba', 'yanga', 'azam fc'],
        dbPattern: 'VIKOSI VYA EFOOTBALL',
        title: 'VIKOSI VYA EFOOTBALL 👥',
      },
      {
        matchPhrases: ['ps2 games', 'ps2 kwenye simu', 'playstation 2', 'ps2'],
        dbPattern: 'PS2 GAMES KWENYE SIMU',
        title: 'PS2 GAMES KWENYE SIMU 🎮',
      },
      {
        matchPhrases: ['pc/computer games', 'pc games', 'computer games', 'kompyuta', 'game za pc', 'game za laptop'],
        dbPattern: 'PC/COMPUTER GAMES',
        title: 'PC/COMPUTER GAMES 💻',
      },
      {
        matchPhrases: ['premium games', 'premium'],
        dbPattern: 'PREMIUM GAMES.',
        title: 'PREMIUM GAMES 💎',
      },
      {
        matchPhrases: ['favorite games', 'favorite', 'michezo pendwa'],
        dbPattern: 'FAVORITE GAMES',
        title: 'FAVORITE GAMES ⭐',
      },
      {
        matchPhrases: ['world games'],
        dbPattern: 'WORLD GAMES',
        title: 'WORLD GAMES 🌍',
      },
      {
        matchPhrases: ['games tools', 'tools', 'zarchiver', 'ppsspp gold'],
        dbPattern: 'GAMES TOOLS',
        title: 'GAMES TOOLS 🛠️',
      },
    ];

    const matchedCat = categoryMapping.find(cm => 
      cm.matchPhrases.some(phrase => lowerMsg.includes(phrase))
    );

    if (matchedCat) {
      const { data: catGames } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description, links')
        .eq('status', 'published')
        .ilike('category', `%${matchedCat.dbPattern}%`)
        .limit(8);

      if (catGames && catGames.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Hii hapa michezo mikali iliyopo kwenye category ya **${matchedCat.title}** kaka! Kila game lina picha, maelezo kamili na bei yake (au Bure). Chagua unalolitaka hapa chini ulipie au kupakua mara moja! 🔥🎮`,
          games: catGames.map(formatGameCard),
          quickActions: [
            { label: '📁 Categories Nyingine', query: 'Kuna category gani' },
            { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
            { label: '🔥 Games Zote Kali', query: 'Nataka game' },
          ],
          unpaidAttempts,
        });
      }
    }

    // ── INTENT 6: Tutorial / How to Install / Setup ("nielekeze jinsi ya kuset", "jinsi ya ku-install") ──
    const isTutorialRequest =
      lowerMsg.includes('kuset') ||
      lowerMsg.includes('ku-set') ||
      lowerMsg.includes('set') ||
      lowerMsg.includes('install') ||
      lowerMsg.includes('kuweka') ||
      lowerMsg.includes('extract') ||
      lowerMsg.includes('obb') ||
      lowerMsg.includes('zarchiver') ||
      lowerMsg.includes('jinsi ya');

    if (isTutorialRequest) {
      const hiddenVault = config.hidden_video_vault || [];

      const vaultMatch = hiddenVault.find((v: any) => {
        const keywords = (v.keywords || '').toLowerCase().split(',').map((k: string) => k.trim());
        const titleWords = (v.title || '').toLowerCase().split(' ');
        return keywords.some((k: string) => k && lowerMsg.includes(k)) ||
               titleWords.some((w: string) => w.length > 3 && lowerMsg.includes(w));
      });

      if (vaultMatch) {
        return NextResponse.json({
          type: 'tutorial_video',
          message: `Kaka kuset game hili ni rahisi sana! Nimekuwekea video maalum ya hatua kwa hatua hapa chini itakayokuelekeza mwanzo hadi mwisho jinsi ya ku-install na kucheza bila kukwama:`,
          tutorial: {
            title: vaultMatch.title,
            videoUrl: vaultMatch.youtubeUrl,
            instructions: vaultMatch.instructions || 'Tazama video hii kwa makini na ufuate kila hatua. Kama una swali niambie!',
          },
          unpaidAttempts,
        });
      }

      // Check if recent game or mentioned game has a youtube_url in database
      let gameWithVideo = null;
      if (recentGameId) {
        const { data: g } = await supabase
          .from('posts')
          .select('id, title, youtube_url, description')
          .eq('id', recentGameId)
          .maybeSingle();
        if (g?.youtube_url) gameWithVideo = g;
      }

      if (!gameWithVideo) {
        const { data: matchedGames } = await supabase
          .from('posts')
          .select('id, title, youtube_url, description')
          .eq('status', 'published')
          .not('youtube_url', 'is', null)
          .limit(10);

        gameWithVideo = (matchedGames || []).find(g => {
          const words = g.title.toLowerCase().split(' ');
          return words.some((w: string) => w.length > 3 && lowerMsg.includes(w));
        });
      }

      if (gameWithVideo && gameWithVideo.youtube_url) {
        return NextResponse.json({
          type: 'tutorial_video',
          message: `Kaka video ya jinsi ya ku-set "${gameWithVideo.title}" ipo tayari! Bonyeza hapa chini utazame video kamili kutoka YouTube uone hatua kwa hatua:`,
          tutorial: {
            title: `Jinsi ya Ku-set: ${gameWithVideo.title}`,
            videoUrl: gameWithVideo.youtube_url,
            instructions: gameWithVideo.description || 'Fuata hatua kwenye video, fungua ZArchiver kuhamisha folda la OBB/Data kisha install APK.',
          },
          unpaidAttempts,
        });
      }

      // Fallback: Channel URL
      const channelUrl = config.general_youtube_url || 'https://www.youtube.com/@ChidyGaming';
      return NextResponse.json({
        type: 'general_tutorial',
        message: `Bro, video zote za maelekezo ya jinsi ya ku-extract na ku-set games mbalimbali kwa kutumia ZArchiver nimeweka kwenye channel yetu ya YouTube ya ChidyGaming TZ. Gusa kitufe cha chini utazame video zote!`,
        channelUrl,
        instructions: '1. Download app ya ZArchiver kutoka PlayStore\n2. Extract mafaili ya game (ZIP/RAR)\n3. Hamisha folda la OBB au DATA kwenda Android/obb au Android/data\n4. Install APK kisha uwashe game lako!',
        unpaidAttempts,
      });
    }

    // ── INTENT 7: General "nataka game" / Priority Games / Hajui game gani ──
    const isGeneralGameRequest = 
      lowerMsg === 'nataka game' ||
      lowerMsg === 'nataka games' ||
      lowerMsg === 'mna games gani' ||
      lowerMsg === 'games' ||
      lowerMsg === 'mchezo' ||
      lowerMsg === 'magame' ||
      lowerMsg.includes('games kali') ||
      lowerMsg.includes('nionyeshe games') ||
      lowerMsg.includes('sijui game') ||
      lowerMsg.includes('pendekeza') ||
      lowerMsg.includes('tazama games') ||
      lowerMsg.includes('games zote') ||
      lowerMsg.includes('orodha ya games');

    if (isGeneralGameRequest) {
      const tzGames = config.featured_tz_games || [];
      const intlGames = config.featured_intl_games || [];
      let gamesToShow = [...tzGames, ...intlGames];

      if (gamesToShow.length === 0) {
        const { data: fallbackGames } = await supabase
          .from('posts')
          .select('id, title, category, price, image_url, description, links')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(8);
        gamesToShow = (fallbackGames || []).map(formatGameCard);
      }

      return NextResponse.json({
        type: 'game_cards',
        message: `Hizi hapa games kali za kipaumbele kaka! Chagua unalolipenda hapa chini, lipia papo hapo upate link zako za kudownload mara moja: 🔥🎮`,
        games: gamesToShow.slice(0, 8),
        quickActions: [
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
          { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
          { label: '🚌 Mabasi ya Tanzania', query: 'Maleo Bus Mode' },
          { label: '⚽ Michezo ya Mpira', query: 'Football Games' },
        ],
        unpaidAttempts,
      });
    }

    // ── INTENT 8: Universal Game Title & Keyword Search across ALL 318 Games ──
    const searchKeyword = extractGameSearchKeyword(trimmedMsg);

    const commonAliases: Record<string, string> = {
      'pes': 'efootball',
      'mpira': 'football',
      'football': 'football',
      'gari': 'racing',
      'magari': 'racing',
      'ndege': 'flight',
      'gow': 'god of war',
      'ets': 'ets2',
    };

    const targetTerm = commonAliases[searchKeyword] || searchKeyword;

    if (targetTerm && targetTerm.length >= 2) {
      const { data: matchedPosts } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description, links')
        .eq('status', 'published')
        .or(`title.ilike.%${targetTerm}%,category.ilike.%${targetTerm}%,description.ilike.%${targetTerm}%`)
        .limit(8);

      if (matchedPosts && matchedPosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Nimekupata safi sana kaka! Hii hapa michezo niliyoipata ya "${targetTerm.toUpperCase()}" iliyopo kwenye website yetu. Kila game lina picha, category na bei yake: 🔥🎮`,
          games: matchedPosts.map(formatGameCard),
          quickActions: [
            { label: '📁 Categories Zote', query: 'Kuna category gani' },
            { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
            { label: '🔥 Games Zote Kali', query: 'Nataka game' },
          ],
          unpaidAttempts,
        });
      }

      const words = targetTerm.split(' ').filter(w => w.length >= 3);
      if (words.length > 1) {
        const wordFilter = words.map(w => `title.ilike.%${w}%`).join(',');
        const { data: partialMatches } = await supabase
          .from('posts')
          .select('id, title, category, price, image_url, description, links')
          .eq('status', 'published')
          .or(wordFilter)
          .limit(8);

        if (partialMatches && partialMatches.length > 0) {
          return NextResponse.json({
            type: 'game_cards',
            message: `Nimeona michezo hii inayohusiana na "${targetTerm}" kaka! Chagua unalolitaka hapa chini upate huduma sasa hivi: 🔥`,
            games: partialMatches.map(formatGameCard),
            quickActions: [
              { label: '📁 Categories Zote', query: 'Kuna category gani' },
              { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
            ],
            unpaidAttempts,
          });
        }
      }
    }

    // ── INTENT 9: Street Slang / Greetings ("vp", "oa", "oya", "kaka", "niaje", "mambo", "bro", "mkuu") ──
    const greetingWords = [
      'vp', 'vipi', 'oa', 'oya', 'oyaa', 'mambo', 'niaje', 'kaka', 'bro',
      'mkuu', 'boss', 'wazee', 'habari', 'shwari', 'mzuka', 'hello', 'hi',
      'hey', 'safi', 'freshi', 'fresh', 'poa', 'jomba', 'chidy'
    ];
    const isGreeting = greetingWords.includes(lowerMsg) || 
      lowerMsg.startsWith('mambo ') || 
      lowerMsg.startsWith('habari ') || 
      lowerMsg.startsWith('niaje ') || 
      lowerMsg.startsWith('oya ');

    if (isGreeting) {
      const greetings = [
        `Oya kaka! Mambo ni moto sana 🔥 Karibu sana ChidyPrime x ChidyGaming HQ. Nafahamu categories zote na michezo yote 300+ iliyopo kwenye tovuti yetu (Mabasi ya TZ, Mpira, GTA, PS2, Free Games, n.k.). Niambie leo unatafuta nini nikupatie fasta!`,
        `Niaje brother! Nipo hewani kukuhudumia kwa 100%. Nina taarifa za games zote na categories zote zilizopo kwenye website. Niambie unahitaji mchezo gani leo tukamilishe chap? 🎮`,
        `Kaka salama kabisa! Karibu kijiweni kwa Chidy. Unataka game gani au unahitaji msaada wowote nikusaidie papo hapo?`,
        `Mambo safi sana mkuu! Tuko full charge kukupatia games zote kali za simu na PC. Niambie unachohitaji leo tukikamilishe fasta! 🔥`
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

      return NextResponse.json({
        type: 'greeting',
        message: randomGreeting,
        quickActions: [
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
          { label: '🆓 Games za Bure (Free)', query: 'Game za bure zipo' },
          { label: '🚌 Mabasi ya Tanzania (Maleo)', query: 'Maleo Bus Mode' },
          { label: '⚽ Michezo ya Mpira (FIFA/PES)', query: 'Football Games' },
          { label: '🚀 Nimelipa sijapata game', query: 'Nimelipa sijapata game' },
        ],
        unpaidAttempts,
      });
    }

    // ── INTENT 10: Gratitude / Closing ("asante", "shukrani", "nashukuru", "sawa") ──
    if (lowerMsg.includes('asante') || lowerMsg.includes('shukrani') || lowerMsg.includes('nashukuru') || lowerMsg === 'sawa' || lowerMsg === 'poa') {
      return NextResponse.json({
        type: 'conversational',
        message: 'Karibu sana brother! Tuko pamoja sana wakati wote 🤝 Furahia game lako na kama kuna lolote linakwama au unahitaji game lingine usisite kuniandikia hapa hapa!',
        quickActions: [
          { label: '📁 Categories Zote', query: 'Kuna category gani' },
          { label: '🎮 Tazama Games Nyingine', query: 'Nataka game' },
          { label: '📺 Jinsi ya Ku-set', query: 'Nielekeze jinsi ya kuset game' },
        ],
        unpaidAttempts,
      });
    }

    // ── FALLBACK: Intelligent natural response with category knowledge ──
    return NextResponse.json({
      type: 'conversational',
      message: `Nimekuelewa vizuri bro! Ninaifahamu michezo yote 300+ na categories zote zilizopo kwenye website yetu (Tanzania Games, Maleo Bus, Maleo Map, Football, Premium Games, Free Games, World Games, PS2 Games, PC Games, n.k.).\n\nNiambie unatafuta game lolote mahususi, unataka kuona category gani, au unahitaji kuthibitisha malipo yako? 🎮🔥`,
      quickActions: [
        { label: '📁 Categories Zote', query: 'Kuna category gani' },
        { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
        { label: '🚌 Mabasi ya Tanzania', query: 'Maleo Bus Mode' },
        { label: '⚽ Michezo ya Mpira', query: 'Football Games' },
        { label: '🚀 Kagua Oda Yangu', query: 'Nimelipa sijapata game' },
      ],
      unpaidAttempts,
    });

  } catch (error: any) {
    console.error('Assistant API Error:', error);
    return NextResponse.json({
      type: 'error',
      message: 'Samahani kaka, mtandao umegonga kidogo. Naomba uandike tena ujumbe wako au namba yako ya simu nikuthibitishie mara moja.',
    }, { status: 500 });
  }
}
