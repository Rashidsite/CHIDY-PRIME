'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import PhoneFirstAuthCard from '@/components/PhoneFirstAuthCard';

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-8 pb-36">
        <PhoneFirstAuthCard initialMode="login" redirectTo="/orders" />
      </main>
    </>
  );
}
