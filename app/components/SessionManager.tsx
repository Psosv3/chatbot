'use client';

import { useState, useEffect } from 'react';
import { sessionService, type ChatSession } from '../lib/sessionService';

interface SessionManagerProps {
  companyId: string;
  onSessionSelect: (session: ChatSession) => void;
  currentSessionId?: string;
}

export default function SessionManager({ companyId, onSessionSelect, currentSessionId }: SessionManagerProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [companyId]);

  const loadSessions = () => {
    const allSessions = sessionService.getAllSessions();
    const companySessions = allSessions.filter(s => s.companyId === companyId);
    setSessions(companySessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handleNewSession = () => {
    const newSession = sessionService.createNewSession(companyId);
    onSessionSelect(newSession);
    loadSessions();
    setIsOpen(false);
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
      sessionService.deleteSession(sessionId);
      loadSessions();
      
      // Si on supprime la session actuelle, créer une nouvelle
      if (sessionId === currentSessionId) {
        handleNewSession();
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return "Aujourd'hui";
    } else if (diffDays === 2) {
      return "Hier";
    } else if (diffDays <= 7) {
      return `Il y a ${diffDays - 1} jours`;
    } else {
      return date.toLocaleDateString('fr-FR');
    }
  };

  return (
    <div className="relative">
      {/* Bouton pour ouvrir l'historique */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
        title="Historique des conversations"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Conversations</h3>
              <button
                onClick={handleNewSession}
                className="text-sm bg-[#0084FF] text-white px-3 py-1 rounded-md hover:bg-[#0073E6] transition-colors duration-200"
              >
                Nouvelle
              </button>
            </div>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                Aucune conversation
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.sessionId}
                  onClick={() => {
                    onSessionSelect(session);
                    setIsOpen(false);
                  }}
                  className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                    session.sessionId === currentSessionId ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDate(session.createdAt)} • {session.messages.length} messages
                      </div>
                      {session.messages.length > 0 && (
                        <div className="text-xs text-gray-400 mt-1 truncate">
                          {session.messages[session.messages.length - 1].text}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(session.sessionId, e)}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
                      title="Supprimer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
