'use client';

import { useEffect, useState } from 'react';
import { sessionService, type ChatSession, type Message } from '../lib/sessionService';

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('company_id');
    setCompanyId(id);
    
    // Charger la session existante ou en créer une nouvelle
    if (id) {
      loadOrCreateSession(id);
    }
  }, []);

  const loadOrCreateSession = async (companyId: string) => {
    // Essayer de charger la session existante
    const existingSession = sessionService.getCurrentSession();
    
    if (existingSession && existingSession.companyId === companyId) {
      setCurrentSession(existingSession);
      setMessages(existingSession.messages);
      
      // Synchroniser avec le backend en arrière-plan
      try {
        await sessionService.syncSessionWithBackend(existingSession.sessionId, companyId);
        // Recharger la session après synchronisation
        const updatedSession = sessionService.getCurrentSession();
        if (updatedSession) {
          setCurrentSession(updatedSession);
          setMessages(updatedSession.messages);
        }
      } catch (error) {
        console.log('Synchronisation avec le backend impossible, utilisation du cache local',error);
      }
    } else {
      // Créer une nouvelle session
      const newSession = sessionService.createNewSession(companyId);
      setCurrentSession(newSession);
      setMessages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession) return;

    // Créer le message utilisateur avec timestamp
    const userMessage: Message = { 
      text: input, 
      isUser: true, 
      timestamp: new Date().toISOString() 
    };
    
    // Ajouter le message à l'affichage et à la session
    setMessages(prev => [...prev, userMessage]);
    sessionService.addMessageToSession(currentSession.sessionId, userMessage);
    
    const question = input;
    setInput('');
    setIsLoading(true);

    try {
      // Détecter automatiquement la langue de la question
      const detectedLanguage = sessionService.detectLanguage(question);
      console.log(`Langue détectée: ${detectedLanguage}`);
      
      // Préparer la requête avec session_id et external_user_id
      const requestBody = {
        question: question,
        company_id: companyId,
        session_id: currentSession.sessionId,
        external_user_id: currentSession.externalUserId,
        langue: detectedLanguage
      };

      // Créer une URL avec les paramètres pour EventSource
      const params = new URLSearchParams();
      Object.entries(requestBody).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      // Utiliser fetch pour initier la requête et obtenir un stream
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Lire le stream de réponse
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              break;
            }

            // Décoder le chunk
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            console.log('Chunk reçu:', chunk);

            // Traiter les événements SSE complets
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Garder la ligne incomplète

            for (const line of lines) {
              console.log('Ligne traitée:', line);
              
              // Gérer le format SSE standard avec "data: "
              if (line.startsWith('data: ')) {
                try {
                  const eventData = JSON.parse(line.slice(6)); // Enlever 'data: '
                  
                  // Ignorer les événements de heartbeat
                  if (eventData.event === 'heartbeat' || eventData.event === 'ping_disconnect') {
                    continue;
                  }

                  // Gérer les erreurs
                  if (eventData.error) {
                    console.error('Erreur du backend:', eventData.error);
                    const errorMessage: Message = { 
                      text: `Erreur: ${eventData.error}`, 
                      isUser: false,
                      timestamp: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, errorMessage]);
                    sessionService.addMessageToSession(currentSession.sessionId, errorMessage);
                    continue;
                  }

                  // Traiter les réponses avec answer
                  if (eventData.answer) {
                    console.log('Nouvelle réponse reçue:', eventData);
                    
                    const botMessage: Message = { 
                      text: eventData.answer, 
                      isUser: false, 
                      timestamp: new Date().toISOString() 
                    };
                    
                    // Ajouter la réponse du bot à l'affichage et à la session
                    setMessages(prev => [...prev, botMessage]);
                    sessionService.addMessageToSession(currentSession.sessionId, botMessage);
                    
                    // Mettre à jour le sessionId si le backend a retourné un nouveau
                    if (eventData.session_id && eventData.session_id !== currentSession.sessionId) {
                      sessionService.updateSessionId(currentSession.sessionId, eventData.session_id);
                      setCurrentSession(prev => prev ? { ...prev, sessionId: eventData.session_id } : null);
                    }
                    
                    // Mettre à jour la session complète
                    setCurrentSession(prev => {
                      if (!prev) return null;
                      const updatedSession: ChatSession = {
                        ...prev,
                        sessionId: eventData.session_id || prev.sessionId,
                        messages: [...prev.messages, userMessage, botMessage]
                      };
                      sessionService.saveSession(updatedSession);
                      return updatedSession;
                    });
                  }
                } catch (parseError) {
                  console.error('Erreur lors du parsing de l\'événement SSE:', parseError, 'Line:', line);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      
      console.log("Stream terminé, session sauvegardée");
    } catch (error) {
      console.error('Erreur lors de la communication avec le backend:', error);
      const errorMessage: Message = { 
        text: "Désolé, une erreur s'est produite lors de la communication avec le serveur.", 
        isUser: false,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
      sessionService.addMessageToSession(currentSession.sessionId, errorMessage);
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
              {/* METTRE A LA LIGNE QUAND IL Y A UN \n */}
              {message.text}
              {/* {message.text.split('\n').map((line, lineIndex) => (
                <span key={lineIndex}>
                  {line}
                  {lineIndex < message.text.split('\n').length - 1 && <br />}
                </span>
              ))} */}
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