'use client';

import { useEffect, useState } from 'react';

interface Message {
  text: string;
  isUser: boolean;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('company_id');
    setCompanyId(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Ajouter le message de l'utilisateur
    const userMessage: Message = { text: input, isUser: true };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question: input,company_id: companyId}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Ajouter la réponse du bot
      const botMessage: Message = { text: data.answer, isUser: false };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Erreur lors de la communication avec le backend:', error);
      const errorMessage: Message = { 
        text: "Désolé, une erreur s'est produite lors de la communication avec le serveur.", 
        isUser: false 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`p-3 rounded-2xl max-w-[80%] ${
                message.isUser
                  ? 'bg-[#0084FF] text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-tl-none max-w-[80%]">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrivez votre message..."
          className="flex-1 p-3 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-[#0084FF] focus:border-transparent"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-[#0084FF] text-white p-3 rounded-full hover:bg-[#0073E6] disabled:bg-[#0084FF]/50 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
} 