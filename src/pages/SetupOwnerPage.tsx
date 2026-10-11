import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header.tsx';
import { Footer } from '../components/Footer.tsx';

export const SetupOwnerPage: React.FC = () => (
  <div className="min-h-screen flex flex-col bg-[#0A0D14] text-[#F3F4F6]">
    <Header />
    <main className="flex-1 max-w-md mx-auto px-4 py-20 text-center">
      <div className="bg-[#111622] rounded-2xl border border-[#1F2637] p-8 shadow-xl">
        <h1 className="font-display font-bold text-2xl text-white mb-3">Create the first administrator</h1>
        <p className="text-xs text-[#9CA3AF] mb-6 leading-relaxed">The first account registered on this site automatically becomes the owner and receives access to the admin panel.</p>
        <Link to="/signup" className="px-5 py-2.5 text-xs font-bold text-black bg-[#FACC15] rounded-xl inline-block">Create first account</Link>
      </div>
    </main>
    <Footer />
  </div>
);
