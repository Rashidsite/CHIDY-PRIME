import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyNewUserRegistration, notifyCriticalSystemError } from '@/lib/telegram';
import { cleanPhoneNumber } from '@/lib/payment-gateway';

export async function POST(req: NextRequest) {
  try {
    const { name, phone, password, pin } = await req.json();

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = cleanPhoneNumber(phone);
    const cleanName = (name || '').trim() || `User-${cleanPhone}`;
    const userPin = (password || pin || '').trim();

    // Upsert into profiles table with phone, name, and optional pin metadata
    try {
      const profileData: any = {
        full_name: cleanName,
        phone_number: cleanPhone,
        status: 'active',
        last_sign_in_at: new Date().toISOString(),
      };

      if (userPin) {
        profileData.role = 'user';
        // Note: Can store pin or hashed credential if custom column exists
      }

      await supabaseAdmin.from('profiles').upsert(profileData);
    } catch (dbErr) {
      console.warn('Profile upsert warning:', dbErr);
    }

    // Trigger Telegram Alert for New User Registration
    try {
      await notifyNewUserRegistration(cleanName, cleanPhone);
    } catch (tErr) {
      console.warn('Telegram alert warning:', tErr);
    }

    return NextResponse.json({
      success: true,
      name: cleanName,
      phone: cleanPhone,
      has_pin: Boolean(userPin),
    });
  } catch (err: any) {
    notifyCriticalSystemError('User Registration API (/api/register)', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
