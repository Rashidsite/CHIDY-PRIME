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

// ── GET: Check Payment Unlock Endpoint ──
// Used by support page to check if locked user has paid and can be unlocked
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

        return NextResponse.json({
          type: 'verified_order',
          unpaidAttempts: 0, // Reset counter on successful verification
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
        const cardGame = attemptedGameObj ? [{
          id: attemptedGameObj.id,
          title: attemptedGameObj.title,
          category: attemptedGameObj.category,
          price: attemptedGameObj.price || 3000,
          cover_image: attemptedGameObj.image_url || '/placeholder.png',
          description: attemptedGameObj.description,
        }] : undefined;

        // Custom tone depending on attempts as requested by user
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
            { label: '🚌 Nataka Game la Mabasi', query: 'Maleo' },
            { label: '🎮 Tazama Games Kali', query: 'Nataka game' },
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
          { label: '⚽ Michezo ya Mpira', query: 'Mpira' },
          { label: '🔥 Games Zote Kali', query: 'Nataka game' },
        ],
      });
    }

    // ── INTENT 2: Free Games ("game za bure zipo", "za bure", "bure", "free games", "kuna za bure", "free") ──
    const isFreeGameRequest = 
      lowerMsg.includes('bure') ||
      lowerMsg.includes('free') ||
      lowerMsg.includes('bwerere');

    if (isFreeGameRequest) {
      const { data: freePosts } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description')
        .eq('status', 'published')
        .or('price.eq.0,price.is.null,category.ilike.%free%')
        .limit(6);

      if (freePosts && freePosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Ndio kaka! Michezo ya bure (Free Games) ipo kibao bila malipo yoyote! 🎉 Haya hapa baadhi ya magame ya bure kabisa unayoweza kupakua sasa hivi bila hata shilingi 1:`,
          games: freePosts.map(g => ({
            id: g.id,
            title: g.title,
            category: g.category || 'Free Games',
            price: 0,
            cover_image: g.image_url || '/placeholder.png',
            description: g.description,
          })),
          unpaidAttempts,
        });
      }
    }

    // ── INTENT 3: Tutorial / How to Install / Setup ("nielekeze jinsi ya kuset", "jinsi ya ku-install") ──
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

      // Check if any video in the hidden vault matches
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

    // ── INTENT 4: Tanzania Games / Mabasi / Maleo / ETS2 Specific Search ──
    const isTzOrBusOrMaleo = 
      lowerMsg.includes('tanzania') ||
      lowerMsg.includes('bongo') ||
      lowerMsg.includes('maleo') || 
      lowerMsg.includes('ets2') || 
      lowerMsg.includes('ets') || 
      lowerMsg.includes('basi') || 
      lowerMsg.includes('mabasi') || 
      lowerMsg.includes('bus') ||
      lowerMsg.includes('lori') ||
      lowerMsg.includes('malori');

    if (isTzOrBusOrMaleo) {
      const tzFeatured = config.featured_tz_games || [];
      if (tzFeatured.length > 0) {
        let listToShow = [...tzFeatured];
        if (lowerMsg.includes('maleo') || lowerMsg.includes('basi') || lowerMsg.includes('bus') || lowerMsg.includes('ets')) {
          const busMatches = tzFeatured.filter((g: any) => {
            const t = (g.title || '').toLowerCase();
            const c = (g.category || '').toLowerCase();
            return t.includes('bus') || t.includes('maleo') || t.includes('ets') || c.includes('bus') || c.includes('maleo');
          });
          if (busMatches.length > 0) {
            listToShow = [...busMatches, ...tzFeatured.filter((g: any) => !busMatches.includes(g))];
          }
        }

        return NextResponse.json({
          type: 'game_cards',
          message: `Haya hapa michezo mikali zaidi ya Tanzania (Mabasi, Malori & Mods) kaka! Chagua unalolitaka hapa chini, lipia papo hapo na link yako ya kudownload inafunguka mara moja ndani ya chat! 🔥🇹🇿`,
          games: listToShow.slice(0, 6),
          unpaidAttempts,
        });
      }

      // Fallback query database for Tanzania / Maleo / Bus / ETS2
      const { data: busPosts } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description')
        .eq('status', 'published')
        .or('title.ilike.%maleo%,title.ilike.%bus%,title.ilike.%ets%,category.ilike.%maleo%,category.ilike.%bus%,category.ilike.%tanzania%')
        .limit(6);

      if (busPosts && busPosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Haya hapa michezo mikali ya Tanzania na Mabasi (Maleo / ETS2) kaka! Chagua unalolitaka hapa chini, lipia papo hapo na link yako ya kudownload inafunguka mara moja ndani ya chat! 🔥🚌`,
          games: busPosts.map(g => ({
            id: g.id,
            title: g.title,
            category: g.category,
            price: g.price || 3000,
            cover_image: g.image_url || '/placeholder.png',
            description: g.description,
          })),
          unpaidAttempts,
        });
      }
    }

    // ── INTENT 5: General "nataka game" / Priority Games / Hajui game gani ──
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
          .select('id, title, category, price, image_url, description')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(6);
        gamesToShow = (fallbackGames || []).map(g => ({
          id: g.id,
          title: g.title,
          category: g.category,
          price: g.price || 3000,
          cover_image: g.image_url || '/placeholder.png',
          description: g.description,
        }));
      }

      return NextResponse.json({
        type: 'game_cards',
        message: `Hizi hapa games kali za kipaumbele kaka! Chagua unalolipenda hapa chini, lipia papo hapo upate link zako za kudownload mara moja: 🔥🎮`,
        games: gamesToShow.slice(0, 6),
        unpaidAttempts,
      });
    }

    // ── INTENT 6: Smart Game Title & Keyword Search ("GTA unalo", "FIFA", "eFootball", "God of War", etc.) ──
    const searchKeyword = extractGameSearchKeyword(trimmedMsg);

    // Common game title aliases
    const commonAliases: Record<string, string> = {
      'pes': 'efootball',
      'mpira': 'football',
      'football': 'football',
      'gari': 'racing',
      'magari': 'racing',
      'ndege': 'flight',
      'gow': 'god of war',
    };

    const targetTerm = commonAliases[searchKeyword] || searchKeyword;

    if (targetTerm && targetTerm.length >= 2) {
      // 1. First search posts for direct match
      const { data: matchedPosts } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description')
        .eq('status', 'published')
        .or(`title.ilike.%${targetTerm}%,category.ilike.%${targetTerm}%,description.ilike.%${targetTerm}%`)
        .limit(6);

      if (matchedPosts && matchedPosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Ndio kaka, ninalo hapa! Hapa nimekuwekea michezo ya "${targetTerm.toUpperCase()}" iliyopo tayari. Chagua na ulipie papo hapo upate link mara moja: 🔥🎮`,
          games: matchedPosts.map(g => ({
            id: g.id,
            title: g.title,
            category: g.category,
            price: g.price || 3000,
            cover_image: g.image_url || '/placeholder.png',
            description: g.description,
          })),
          unpaidAttempts,
        });
      }

      // If multi-word (e.g. "god of war"), try individual words
      const words = targetTerm.split(' ').filter(w => w.length >= 3);
      if (words.length > 1) {
        const wordFilter = words.map(w => `title.ilike.%${w}%`).join(',');
        const { data: partialMatches } = await supabase
          .from('posts')
          .select('id, title, category, price, image_url, description')
          .eq('status', 'published')
          .or(wordFilter)
          .limit(6);

        if (partialMatches && partialMatches.length > 0) {
          return NextResponse.json({
            type: 'game_cards',
            message: `Nimeona michezo hii inayohusiana na "${targetTerm}" kaka! Chagua unalolitaka hapa chini ulipie upate link sasa hivi: 🔥`,
            games: partialMatches.map(g => ({
              id: g.id,
              title: g.title,
              category: g.category,
              price: g.price || 3000,
              cover_image: g.image_url || '/placeholder.png',
              description: g.description,
            })),
            unpaidAttempts,
          });
        }
      }
    }

    // ── INTENT 7: Street Slang / Greetings ("vp", "oa", "oya", "kaka", "niaje", "mambo", "bro", "mkuu") ──
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
        `Oya kaka! Mambo ni moto sana 🔥 Karibu sana ChidyPrime x ChidyGaming HQ. Niambie leo nikusaidie nini: unatafuta game kali ya mabasi/mpira/GTA, umekwama kwenye malipo au unahitaji link yako?`,
        `Niaje brother! Nipo hewani kukuhudumia kwa 100%. Niambie unahitaji mchongo gani leo kwenye ulimwengu wa games? 🎮`,
        `Kaka salama kabisa! Karibu kijiweni kwa Chidy. Unataka game gani au una changamoto gani nikusaidie papo hapo?`,
        `Mambo safi sana mkuu! Tuko full charge kukupatia games zote kali za simu na PC. Niambie unachohitaji leo tukikamilishe fasta! 🔥`
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

      return NextResponse.json({
        type: 'greeting',
        message: randomGreeting,
        quickActions: [
          { label: '🚀 Nimelipa sijapata game', query: 'Nimelipa sijapata game' },
          { label: '🚌 Mabasi ya Tanzania (Maleo/ETS2)', query: 'Maleo' },
          { label: '⚽ Michezo ya Mpira (eFootball/FIFA)', query: 'Mpira' },
          { label: '🎮 Games za Bure (Free)', query: 'Game za bure zipo' },
          { label: '📺 Nielekeze jinsi ya ku-set game', query: 'Nielekeze jinsi ya kuset game' },
        ],
        unpaidAttempts,
      });
    }

    // ── INTENT 8: Gratitude / Closing ("asante", "shukrani", "nashukuru", "sawa") ──
    if (lowerMsg.includes('asante') || lowerMsg.includes('shukrani') || lowerMsg.includes('nashukuru') || lowerMsg === 'sawa' || lowerMsg === 'poa') {
      return NextResponse.json({
        type: 'conversational',
        message: 'Karibu sana brother! Tuko pamoja sana wakati wote 🤝 Furahia game lako na kama kuna lolote linakwama usisite kuniandikia hapa hapa!',
        quickActions: [
          { label: '🎮 Tazama Games Nyingine', query: 'Nataka game' },
          { label: '📺 Jinsi ya Ku-set', query: 'Nielekeze jinsi ya kuset game' },
        ],
        unpaidAttempts,
      });
    }

    // ── FALLBACK: Intelligent natural response ──
    return NextResponse.json({
      type: 'conversational',
      message: `Nimekuelewa vizuri bro! Nambie kama unatafuta game lolote mahususi (mfano GTA, mabasi ya Tanzania, Maleo, ETS2, FIFA, eFootball, au games za bure), au kama umekwama kwenye malipo nipe namba yako ya simu nikuthibitishie chap. Pia nipo tayari kukuelekeza jinsi ya ku-install game lolote! 🎮🔥`,
      quickActions: [
        { label: '🚀 Kagua Oda Yangu', query: 'Nimelipa sijapata game' },
        { label: '🚌 Mabasi ya Tanzania', query: 'Maleo' },
        { label: '🎮 Nionyeshe Games Kali', query: 'Nataka game' },
        { label: '🆓 Games za Bure', query: 'Game za bure zipo' },
        { label: '📺 Jinsi ya Ku-install', query: 'Nielekeze jinsi ya kuset' },
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
