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
      timestamp: new Date().toISOString(),
      messageId: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
                      timestamp: new Date().toISOString(),
                      messageId: `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  const handleMessageFeedback = async (messageIndex: number, feedback: 'like' | 'dislike') => {
    if (!currentSession) return;
    
    const message = messages[messageIndex];
    if (!message) return;
    
    // Déterminer le nouveau feedback (toggle si même feedback, sinon appliquer le nouveau)
    const newFeedback = message.userFeedback === feedback ? null : feedback;
    
    // Mettre à jour le message localement
    setMessages(prev => prev.map((msg, index) => {
      if (index === messageIndex) {
        return {
          ...msg,
          userFeedback: newFeedback,
          feedbackTimestamp: newFeedback ? new Date().toISOString() : undefined
        };
      }
      return msg;
    }));
    
    // Mettre à jour dans le sessionService
    sessionService.updateMessageFeedback(currentSession.sessionId, messageIndex, newFeedback);
    
    // Envoyer le feedback au backend si il y a un feedback à envoyer
    if (newFeedback && message.messageId) {
      try {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            session_id: currentSession.sessionId,
            message_id: message.messageId,
            feedback: newFeedback,
            company_id: companyId
          }),
        });

        if (!response.ok) {
          console.error('Erreur lors de l\'envoi du feedback:', response.status);
          // En cas d'erreur, on peut garder le feedback local ou le retirer selon la stratégie souhaitée
        } else {
          console.log(`Feedback ${newFeedback} envoyé avec succès pour le message ${messageIndex}`);
        }
      } catch (error) {
        console.error('Erreur lors de l\'envoi du feedback:', error);
        // En cas d'erreur, on peut garder le feedback local ou le retirer selon la stratégie souhaitée
      }
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
            <div className={`flex flex-col ${message.isUser ? 'items-end' : 'items-start'} max-w-[80%]`}>
              <div
                className={`p-3 rounded-2xl ${
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
              
              {/* Boutons like/dislike uniquement pour les messages du bot */}
              {!message.isUser && (
                <div className="flex items-center gap-1 mt-1 ml-2">
                  <button
                    onClick={() => handleMessageFeedback(index, 'like')}
                    className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${
                      message.userFeedback === 'like' ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-green-600'
                    }`}
                    title="J'aime cette réponse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.398.83 1.169 1.348 2.126 1.348h2.25c.056 0 .112-.003.167-.01a6.75 6.75 0 006.77-6.77 6.75 6.75 0 00-.143-1.4M5.904 18.75a3.751 3.751 0 01.007-6.9 M5.904 18.75c.044.064.092.126.14.188m0 0h2.25c.056 0 .112-.002.167-.008a6.75 6.75 0 006.77-6.85m-6.77-6.85c-.83-.39-1.62-.833-2.35-1.333-.37-.25-.795-.424-1.23-.508a.75.75 0 00-.85.85c-.033.385-.067.77-.1 1.155M5.904 18.75c-.039-.065-.081-.129-.126-.193a3.751 3.751 0 01-.226-1.982l-.06-1.11M5.904 18.75a3.74 3.74 0 01-.085-1.15L5.6 15.8c-.045-.484-.086-.97-.126-1.455" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMessageFeedback(index, 'dislike')}
                    className={`p-1 rounded-full hover:bg-gray-200 transition-colors ${
                      message.userFeedback === 'dislike' ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:text-red-600'
                    }`}
                    title="Je n'aime pas cette réponse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m8.024-9.75c.011.05.028.1.052.148.591 1.2.924 2.55.924 3.977a8.96 8.96 0 01-.999 4.125m.023-8.25c-.076-.365.183-.75.575-.75h.908c.889 0 1.713.518 1.972 1.368.339 1.11.521 2.287.521 3.507 0 1.553-.295 3.036-.831 4.398C20.613 14.547 19.833 15 19 15h-1.053c-.472 0-.745-.556-.5-.96a8.95 8.95 0 00.303-.54m.023-8.25H16.48a4.5 4.5 0 01-1.423-.23l-3.114-1.04a4.5 4.5 0 00-1.423-.23H6.504c-.618 0-1.217.247-1.605.729A11.95 11.95 0 002.25 12c0 .434.023.863.068 1.285C2.427 14.306 3.346 15 4.372 15h3.126c.618 0 .991.724.725 1.282A7.471 7.471 0 007.5 19.5a2.25 2.25 0 002.25 2.25.75.75 0 00.75-.75v-.633c0-.573.11-1.14.322-1.672.304-.759.93-1.33 1.653-1.715a9.04 9.04 0 002.86-2.4c.498-.634 1.226-1.08 2.032-1.08h.384" />
                    </svg>
                  </button>
                </div>
              )}
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