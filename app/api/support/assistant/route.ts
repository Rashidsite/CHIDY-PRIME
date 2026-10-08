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
        message: `⛔ Umejaribu zaidi ya mara ${maxAttempts} bila uthibitisho wa malipo. Dawati la msaada limefungwa kwa muda kwa akaunti hii kwa ajili ya usalama. Tafadhali jaribu tena baada ya saa 1, au wasiliana na Admin WhatsApp ukiwa na meseji ya muamala.`,
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
      (phoneDigits.length >= 9 && !lowerMsg.includes('nataka') && !lowerMsg.includes('jinsi') && !lowerMsg.includes('vp') && !lowerMsg.includes('mambo'));

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
          .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, cover_image, download_links, links, video_url, install_guide)')
          .ilike('phone_number', `%${phoneDigits}%`)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('orders')
          .select('id, phone_number, amount, status, created_at, post_id, posts(id, title, category, price, cover_image, download_links, links, video_url, install_guide)')
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
        const links = game?.download_links || game?.links || [];
        const validLinks = Array.isArray(links) ? links : [];

        return NextResponse.json({
          type: 'verified_order',
          unpaidAttempts: 0, // Reset on successful verification
          userPhone: activePhone,
          message: `Nimeiona oda yako ya namba ${activePhone} kaka! Malipo ya game la "${game?.title || 'Game'}" yamethibitishwa safi kabisa ✅. Link yako ya kudownload ipo hapa chini. Kumbuka link hii inafanya kazi ndani ya masaa 24 kuanzia sasa!`,
          order: {
            id: approvedOrder.id,
            gameTitle: game?.title || 'Game',
            coverImage: game?.cover_image || null,
            amount: approvedOrder.amount,
            downloadLinks: validLinks,
            installGuide: game?.install_guide || 'Pakua files, extract kwa kutumia app ya ZArchiver, kisha fuata maelekezo ya kuweka OBB/Data au install APK.',
            videoUrl: game?.video_url || null,
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
          message: `⛔ Umejaribu zaidi ya mara ${maxAttempts} bila uthibitisho wa malipo halisi. Sehemu ya msaada imefungwa kwa muda kwa akaunti hii. Tafadhali jaribu tena baada ya saa 1, au wasiliana na Admin WhatsApp ukiwa na ushahidi wa muamala.`,
          unpaidAttempts: nextAttempts,
          userPhone: activePhone,
        });
      }

      if (nextAttempts >= 3) {
        return NextResponse.json({
          type: 'unpaid_warning',
          unpaidAttempts: nextAttempts,
          userPhone: activePhone,
          message: `Kaka malipo ya namba yako (${activePhone}) bado hayajakamilika kwenye mfumo wa mtandao wa simu. Tafadhali lipia tena ili upate link mara moja, au kama umekatwa nitumie SMS ya muamala hapa tuangalie.`,
        });
      }

      if (pendingOrFailedOrder) {
        const attemptedGame = (pendingOrFailedOrder as any).posts?.title || 'ulilochagua';
        return NextResponse.json({
          type: 'unpaid_attempt',
          unpaidAttempts: nextAttempts,
          userPhone: activePhone,
          message: `Nimeikagua namba yako (${activePhone}), nimeona ulijaribu kulipia game la "${attemptedGame}", lakini muamala wako bado haujakamilika kwenye mtandao kaka (status: ${pendingOrFailedOrder.status || 'pending'}), hivyo tafadhali lipia tena ili upate link mara moja.`,
        });
      }

      // No record found at all for this phone
      return NextResponse.json({
        type: 'not_found',
        unpaidAttempts: nextAttempts,
        userPhone: activePhone,
        message: `Kaka nimeikagua namba yako (${activePhone}) kwenye mfumo lakini sijaona kumbukumbu yoyote ya malipo yaliyokamilika ndani ya masaa 24 yaliyopita.\n\nKama umekatwa hela na mtandao wa simu, tafadhali gusa kitufe cha WhatsApp chini ukiwa na SMS ya muamala tukuhudumie papo hapo, au kama bado hujalipia, lipia game ulilolipenda ili link ifunguke mara moja.`,
        quickActions: [
          { label: '💬 Wasiliana na WhatsApp (Tuma Risiti)', query: 'whatsapp' },
          { label: '🎮 Tazama Games Kali za Kulipia', query: 'Nataka game' },
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

      // Check if recent game or mentioned game has a video_url in database
      let gameWithVideo = null;
      if (recentGameId) {
        const { data: g } = await supabase
          .from('posts')
          .select('id, title, video_url, install_guide')
          .eq('id', recentGameId)
          .maybeSingle();
        if (g?.video_url) gameWithVideo = g;
      }

      if (!gameWithVideo) {
        // Search by words in posts
        const { data: matchedGames } = await supabase
          .from('posts')
          .select('id, title, video_url, install_guide')
          .eq('status', 'published')
          .not('video_url', 'is', null)
          .limit(10);

        gameWithVideo = (matchedGames || []).find(g => {
          const words = g.title.toLowerCase().split(' ');
          return words.some((w: string) => w.length > 3 && lowerMsg.includes(w));
        });
      }

      if (gameWithVideo && gameWithVideo.video_url) {
        return NextResponse.json({
          type: 'tutorial_video',
          message: `Kaka video ya jinsi ya ku-set "${gameWithVideo.title}" ipo tayari! Bonyeza hapa chini utazame video kamili kutoka YouTube uone hatua kwa hatua:`,
          tutorial: {
            title: `Jinsi ya Ku-set: ${gameWithVideo.title}`,
            videoUrl: gameWithVideo.video_url,
            instructions: gameWithVideo.install_guide || 'Fuata hatua kwenye video, fungua ZArchiver kuhamisha folda la OBB/Data kisha install APK.',
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

    // ── INTENT 3: Specific Game Search (e.g. "nataka game la tanzania la mabasi", "nataka gta", "fifa") ──
    const searchTerms = ['mabasi', 'bus', 'tanzania', 'bongo', 'maleo', 'gta', 'fifa', 'efootball', 'pes', 'truck', 'racing', 'ppsspp', 'mod', 'simba', 'yanga'];
    const matchedTerm = searchTerms.find(term => lowerMsg.includes(term));

    if (matchedTerm || (lowerMsg.includes('nataka') && lowerMsg.replace('nataka', '').trim().length > 2)) {
      // Clean query
      const cleanKeyword = lowerMsg
        .replace(/nataka/g, '')
        .replace(/game/g, '')
        .replace(/la/g, '')
        .replace(/za/g, '')
        .replace(/ya/g, '')
        .trim();

      const queryTerm = cleanKeyword.length >= 2 ? cleanKeyword : (matchedTerm || 'tanzania');

      const { data: matchedPosts } = await supabase
        .from('posts')
        .select('id, title, category, price, cover_image, description')
        .eq('status', 'published')
        .or(`title.ilike.%${queryTerm}%,category.ilike.%${queryTerm}%,description.ilike.%${queryTerm}%`)
        .limit(4);

      if (matchedPosts && matchedPosts.length > 0) {
        return NextResponse.json({
          type: 'game_cards',
          message: `Nimekupata safi sana kaka! Hapa nimekuwekea michezo ya "${queryTerm.toUpperCase()}" inayofaa kabisa. Unaweza kuchagua na kulipia papo hapo ili upate link mara moja 🔥:`,
          games: matchedPosts.map(g => ({
            id: g.id,
            title: g.title,
            category: g.category,
            price: g.price || 3000,
            cover_image: g.cover_image,
            description: g.description,
          })),
          unpaidAttempts,
        });
      }
    }

    // ── INTENT 4: General "nataka game" / "Games gani kali zipo?" / Hajui game gani ──
    const isGeneralGameRequest = 
      lowerMsg === 'nataka game' ||
      lowerMsg === 'mna games gani' ||
      lowerMsg === 'games' ||
      lowerMsg === 'mchezo' ||
      lowerMsg.includes('games kali') ||
      lowerMsg.includes('nionyeshe games') ||
      lowerMsg.includes('sijui game') ||
      lowerMsg.includes('pendekeza');

    if (isGeneralGameRequest) {
      const tzGames = config.featured_tz_games || [];
      const intlGames = config.featured_intl_games || [];

      // If admin has set up featured games, use them!
      let gamesToShow = [...tzGames, ...intlGames];

      // If empty, fetch top 4 games from database automatically
      if (gamesToShow.length === 0) {
        const { data: fallbackGames } = await supabase
          .from('posts')
          .select('id, title, category, price, cover_image, description')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(4);
        gamesToShow = fallbackGames || [];
      }

      return NextResponse.json({
        type: 'recommendations',
        message: `Unataka game gani kaka? Au unapendelea mashabiki wa aina gani (mfano mpira wa miguu, mabasi/malori ya Tanzania, vita, au racing)?\n\nHapa chini nimekuwekea michezo mikali zaidi yenye kipaumbele hivi sasa, unaweza kuchagua na kulipia papo hapo:`,
        tzGames: tzGames.length ? tzGames : gamesToShow.filter(g => (g.category || '').toLowerCase().includes('tz') || (g.title || '').toLowerCase().includes('tanzania')),
        intlGames: intlGames.length ? intlGames : gamesToShow.filter(g => !(g.category || '').toLowerCase().includes('tz') && !(g.title || '').toLowerCase().includes('tanzania')),
        allFeatured: gamesToShow.slice(0, 6),
        unpaidAttempts,
      });
    }

    // ── INTENT 5: Street Slang / Salutations ("vp", "oa", "oya", "kaka", "niaje", "mambo", "bro", "mkuu") ──
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
        `Oya kaka! Mambo ni moto kabisa 🔥 Karibu sana ChidyPrime x ChidyGaming HQ. Niambie leo nikusaidie nini: unatafuta game kali, umekwama kwenye malipo au unahitaji link yako?`,
        `Niaje brother! Nipo hewani kukuhudumia. Niambie unahitaji mchongo gani leo kwenye ulimwengu wa games? 🎮`,
        `Kaka salama kabisa! Karibu kijiweni kwa Chidy. Unataka game gani au una changamoto gani ya malipo nikusaidie papo hapo?`,
      ];
      const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];

      return NextResponse.json({
        type: 'greeting',
        message: randomGreeting,
        quickActions: [
          { label: '🚀 Nimelipa sijapata game', query: 'Nimelipa sijapata game' },
          { label: '🇹🇿 Games za Mabasi ya Tanzania', query: 'Nataka game la mabasi ya Tanzania' },
          { label: '⚽ Michezo ya Mpira (eFootball/FIFA)', query: 'Nataka game la mpira' },
          { label: '📺 Nielekeze jinsi ya ku-set game', query: 'Nielekeze jinsi ya kuset game' },
        ],
        unpaidAttempts,
      });
    }

    // ── FALLBACK / CHAT BOT CONVERSATIONAL RESPONSE ──
    return NextResponse.json({
      type: 'conversational',
      message: `Nimekuelewa vizuri bro! Nambie kama unatafuta game lolote mahususi (mfano mabasi ya Tanzania, FIFA, GTA), au kama umekwama kwenye malipo nipe namba yako ya simu nikuthibitishie chap. Pia nipo tayari kukuelekeza jinsi ya ku-install game lolote! 🎮🔥`,
      quickActions: [
        { label: '🚀 Kagua Oda Yangu', query: 'Nimelipa sijapata game' },
        { label: '🎮 Nionyeshe Games Kali', query: 'Nataka game' },
        { label: '📺 Jinsi ya Ku-install', query: 'Nielekeze jinsi ya kuset' },
        { label: '💬 Ongea WhatsApp', query: 'whatsapp' },
      ],
      unpaidAttempts,
    });

  } catch (error: any) {
    console.error('Assistant API Error:', error);
    return NextResponse.json({
      type: 'error',
      message: 'Samahani kaka, mtandao umegonga kidogo. Naomba uandike tena ujumbe wako au kama umekwama gusa hapa chini tuwasiliane WhatsApp.',
    }, { status: 500 });
  }
}
