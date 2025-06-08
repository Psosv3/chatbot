"use client";

import { useState } from "react";
import Chat from "./Chat";
// import Image from "next/image";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#0084FF] hover:bg-[#0073E6] text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center text-2xl focus:outline-none transition-all duration-200 hover:scale-105"
          aria-label="Ouvrir le chat"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </button>
      )}

      {/* Fenêtre de chat flottante */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[95vw] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border border-gray-200">
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b bg-[#0084FF] text-white relative">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0084FF" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <div className="font-semibold text-base">Assistant Virtuel</div>
              <div className="text-xs opacity-90">En ligne</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200 focus:outline-none transition-colors duration-200"
              aria-label="Fermer le chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Message d'accueil */}
          <div className="p-4 bg-gray-50 border-b text-gray-700 text-sm">
            👋 Bonjour ! Je suis votre assistant virtuel. Comment puis-je vous aider  ?
          </div>
          {/* Chat */}
          <div className="flex-1 min-h-[400px] max-h-[500px] overflow-y-auto">
            <Chat />
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </>
  );
} 