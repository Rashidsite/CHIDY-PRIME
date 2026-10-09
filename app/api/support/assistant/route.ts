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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      message = '', 
      phone: providedPhone = '', 
      sessionId = '', 
      unpaidAttempts = 0,
      recentGameId = null 
    } = body;

    const trimmedMsg = (message || '').trim();
    const lowerMsg = trimmedMsg.toLowerCase();
    const extractedPhone = extractPhoneFromText(trimmedMsg);
    const activePhone = providedPhone || extractedPhone || '';
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

    // Check if user is already locked out
    if (unpaidAttempts >= maxAttempts) {
      return NextResponse.json({
        type: 'lockout',
        isLocked: true,
        lockoutMinutes,
        message: `⛔ Umejaribu zaidi ya mara ${maxAttempts} bila uthibitisho wa malipo. Dawati la msaada limefungwa kwa muda kwa akaunti hii kwa ajili ya usalama. Tafadhali jaribu tena baada ya saa 1 ukiwa na namba sahihi au fanya malipo ya game lako.`,
        unpaidAttempts,
      });
    }

    // ── INTENT 1: Payment Check / Phone Number Submission / "Nimelipa sijapata" ──
    const cleanedDigitsOnly = trimmedMsg.replace(/\D/g, '');
    const isPurePhoneInput = cleanedDigitsOnly.length >= 9 && cleanedDigitsOnly.length <= 13;
    const isExplicitPaymentCheck = 
      lowerMsg.includes('nimelipa') ||
      lowerMsg.includes('sijapata') ||
      lowerMsg.includes('nimekatwa') ||
      lowerMsg.includes('kulipia') ||
      lowerMsg.includes('nimetuma') ||
      lowerMsg.includes('muamala') ||
      lowerMsg.includes('order') ||
      lowerMsg.includes('oda') ||
      lowerMsg.includes('stk');

    const isPaymentCheck = 
      isPurePhoneInput || 
      isExplicitPaymentCheck || 
      (phoneDigits.length >= 9 && !lowerMsg.includes('nataka') && !lowerMsg.includes('jinsi') && !lowerMsg.includes('vp') && !lowerMsg.includes('mambo') && !lowerMsg.includes('maleo') && !lowerMsg.includes('ets'));

    if (isPaymentCheck) {
      if (!phoneDigits || phoneDigits.length < 9) {
        return NextResponse.json({
          type: 'need_phone',
          message: 'Pole sana bro kwa usumbufu! Usijali kabisa hela yako ipo salama. Naomba namba yako ya simu (mfano 07xxxxxxxx au 06xxxxxxxx) uliyotumia kufanya malipo nikuthibitishie hapa hapa fasta.',
          unpaidAttempts,
        });
      }

      // Check both payment_orders and orders in database
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

      // Check for approved/completed order
      const approvedOrder = orders.find(o => 
        o.status === 'approved' || o.status === 'completed' || o.status === 'success'
      );

      if (approvedOrder) {
        const game = (approvedOrder as any).posts;
        const links = game?.links || [];
        const validLinks = Array.isArray(links) ? links : [];

        return NextResponse.json({
          type: 'verified_order',
          unpaidAttempts: 0, // Reset on successful verification
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

      // Check if there was an order attempt (pending or failed)
      const pendingOrFailedOrder = orders.find(o => 
        o.status === 'pending' || o.status === 'failed' || o.status === 'cancelled'
      );

      const nextAttempts = unpaidAttempts + 1;

      if (nextAttempts >= maxAttempts) {
        return NextResponse.json({
          type: 'lockout',
          isLocked: true,
          lockoutMinutes,
          message: `⛔ Umejaribu zaidi ya mara ${maxAttempts} bila uthibitisho wa malipo halisi. Sehemu hii imefungwa kwa muda kwa akaunti hii. Tafadhali jaribu tena baada ya saa 1.`,
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

        return NextResponse.json({
          type: 'unpaid_attempt',
          unpaidAttempts: nextAttempts,
          userPhone: activePhone,
          message: `Nimeikagua namba yako (${activePhone}), nimeona ulijaribu kulipia game la "${attemptedGameTitle}", lakini muamala wako bado haujakamilika kwenye mtandao kaka (status: ${pendingOrFailedOrder.status || 'pending'}).\n\nHapa chini nimekuwekea kadi ya game hilo ulipie tena sasa hivi hapa hapa upate link mara moja:`,
          games: cardGame,
          quickActions: [
            { label: '🚌 Nataka Game la Mabasi', query: 'Maleo' },
            { label: '🎮 Tazama Games Kali', query: 'Nataka game' },
          ],
        });
      }

      // No record found at all for this phone: ask which game they were trying to buy!
      return NextResponse.json({
        type: 'unpaid_ask_game',
        unpaidAttempts: nextAttempts,
        userPhone: activePhone,
        message: `Kaka nimeikagua namba yako (${activePhone}) kwenye mfumo lakini sijaona muamala wowote uliokamilika kwa sasa.\n\nJe, ulikuwa unajaribu kulipia game gani kaka (mfano: Maleo Bus, ETS2 Tanzania, au game lingine)? Niambie hapa hapa nikutumie uweze kulipia na kupata link mara moja! 🔥`,
        quickActions: [
          { label: '🚌 Maleo Bus Mod TZ', query: 'Maleo' },
          { label: '🚛 ETS2 Tanzania', query: 'ETS2' },
          { label: '⚽ Michezo ya Mpira', query: 'Mpira' },
          { label: '🔥 Games Zote Kali', query: 'Nataka game' },
        ],
      });
    }

    // ── INTENT 2: Tutorial / How to Install / Setup ("nielekeze jinsi ya kuset", "jinsi ya ku-install") ──
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

      // Check if any video in the hidden vault matches the query keywords
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

    // ── INTENT 3: Tanzania Games / Mabasi / Maleo / ETS2 Specific Search ──
    const isTzOrBusOrMaleo = 
      lowerMsg.includes('tanzania') ||
      lowerMsg.includes('bongo') ||
      lowerMsg.includes('maleo') || 
      lowerMsg.includes('ets2') || 
      lowerMsg.includes('ets') || 
      lowerMsg.includes('basi') || 
      lowerMsg.includes('mabasi') || 
      lowerMsg.includes('bus');

    if (isTzOrBusOrMaleo) {
      // 1. Check if admin configured featured Tanzania games
      const tzFeatured = config.featured_tz_games || [];
      if (tzFeatured.length > 0) {
        // If user specifically asked for Maleo/bus, prioritize matching items first
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

    // ── INTENT 4: General "nataka game" / Priority Games / Hajui game gani ──
    const isGeneralGameRequest = 
      lowerMsg === 'nataka game' ||
      lowerMsg === 'nataka games' ||
      lowerMsg === 'mna games gani' ||
      lowerMsg === 'games' ||
      lowerMsg === 'mchezo' ||
      lowerMsg.includes('games kali') ||
      lowerMsg.includes('nionyeshe games') ||
      lowerMsg.includes('sijui game') ||
      lowerMsg.includes('pendekeza') ||
      lowerMsg.includes('tazama games');

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

    // ── INTENT 5: Specific Game Keyword Search (GTA, FIFA, eFootball, GOW, etc.) ──
    const searchTerms = ['gta', 'fifa', 'efootball', 'pes', 'truck', 'racing', 'ppsspp', 'mod', 'simba', 'yanga', 'god of war', 'car', 'football'];
    const matchedTerm = searchTerms.find(term => lowerMsg.includes(term));

    const cleanKeyword = lowerMsg
      .replace(/nataka/g, '')
      .replace(/games?/g, '')
      .replace(/mchezo/g, '')
      .replace(/la/g, '')
      .replace(/za/g, '')
      .replace(/ya/g, '')
      .trim();

    if (matchedTerm || cleanKeyword.length >= 2) {
      const queryTerm = cleanKeyword.length >= 2 ? cleanKeyword : (matchedTerm || '');

      const { data: matchedPosts } = await supabase
        .from('posts')
        .select('id, title, category, price, image_url, description')
        .eq('status', 'published')
        .or(`title.ilike.%${queryTerm}%,category.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
        .limit(6);

      if (matchedPosts && matchedPosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Nimekupata safi sana kaka! Hapa nimekuwekea michezo ya "${queryTerm.toUpperCase()}" inayofaa kabisa. Unaweza kuchagua na kulipia papo hapo ili upate link mara moja 🔥:`,
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
    }

    // ── INTENT 6: Street Slang / Salutations ("vp", "oa", "oya", "kaka", "niaje", "mambo", "bro", "mkuu") ──
    const isGreeting = 
      lowerMsg === 'vp' ||
      lowerMsg === 'vipi' ||
      lowerMsg === 'oa' ||
      lowerMsg === 'oya' ||
      lowerMsg === 'mambo' ||
      lowerMsg === 'niaje' ||
      lowerMsg === 'kaka' ||
      lowerMsg === 'bro' ||
      lowerMsg === 'mkuu' ||
      lowerMsg === 'habari' ||
      lowerMsg === 'shwari' ||
      lowerMsg === 'mzuka' ||
      lowerMsg === 'hello' ||
      lowerMsg === 'hi';

    if (isGreeting) {
      const greetings = [
        `Oya kaka! Mambo ni moto kabisa 🔥 Karibu sana ChidyPrime x ChidyGaming HQ. Niambie leo nikusaidie nini: unatafuta game kali ya mabasi/mpira, umekwama kwenye malipo au unahitaji link yako?`,
        `Niaje brother! Nipo hewani kukuhudumia. Niambie unahitaji mchongo gani leo kwenye ulimwengu wa games? 🎮`,
        `Kaka salama kabisa! Karibu kijiweni kwa Chidy. Unataka game gani au una changamoto gani ya malipo nikusaidie papo hapo?`,
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

      return NextResponse.json({
        type: 'greeting',
        message: randomGreeting,
        quickActions: [
          { label: '🚀 Nimelipa sijapata game', query: 'Nimelipa sijapata game' },
          { label: '🚌 Mabasi ya Tanzania (Maleo/ETS2)', query: 'Maleo' },
          { label: '⚽ Michezo ya Mpira (eFootball/FIFA)', query: 'Mpira' },
          { label: '📺 Nielekeze jinsi ya ku-set game', query: 'Nielekeze jinsi ya kuset game' },
        ],
        unpaidAttempts,
      });
    }

    // ── FALLBACK ──
    return NextResponse.json({
      type: 'conversational',
      message: `Nimekuelewa vizuri bro! Nambie kama unatafuta game lolote mahususi (mfano mabasi ya Tanzania, Maleo, ETS2, FIFA, GTA), au kama umekwama kwenye malipo nipe namba yako ya simu nikuthibitishie chap. Pia nipo tayari kukuelekeza jinsi ya ku-install game lolote! 🎮🔥`,
      quickActions: [
        { label: '🚀 Kagua Oda Yangu', query: 'Nimelipa sijapata game' },
        { label: '🚌 Mabasi ya Tanzania', query: 'Maleo' },
        { label: '🎮 Nionyeshe Games Kali', query: 'Nataka game' },
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
