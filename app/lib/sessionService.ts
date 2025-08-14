interface ChatSession {
  sessionId: string;
  companyId: string;
  externalUserId?: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

interface Message {
  text: string;
  isUser: boolean;
  timestamp: string;
}

class SessionService {
  private readonly STORAGE_KEY = 'chatbot_sessions';
  private readonly CURRENT_SESSION_KEY = 'chatbot_current_session';

  // Génère un ID utilisateur externe unique basé sur le navigateur
  generateExternalUserId(): string {
    const stored = localStorage.getItem('chatbot_external_user_id');
    if (stored) return stored;
    
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('chatbot_external_user_id', userId);
    return userId;
  }

  // Sauvegarde une session dans localStorage
  saveSession(session: ChatSession): void {
    try {
      const sessions = this.getAllSessions();
      const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);
      
      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      localStorage.setItem(this.CURRENT_SESSION_KEY, session.sessionId);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la session:', error);
    }
  }

  // Récupère toutes les sessions depuis localStorage
  getAllSessions(): ChatSession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Erreur lors de la récupération des sessions:', error);
      return [];
    }
  }

  // Récupère la session actuelle
  getCurrentSession(): ChatSession | null {
    try {
      const currentSessionId = localStorage.getItem(this.CURRENT_SESSION_KEY);
      if (!currentSessionId) return null;
      
      const sessions = this.getAllSessions();
      return sessions.find(s => s.sessionId === currentSessionId) || null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la session actuelle:', error);
      return null;
    }
  }

  // Charge les messages d'une session depuis le backend
  async loadSessionFromBackend(sessionId: string, companyId: string): Promise<Message[]> {
    try {
      const response = await fetch(`/api/session-messages?session_id=${sessionId}&company_id=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
    } catch (error) {
      console.error('Erreur lors du chargement des messages depuis le backend:', error);
    }
    return [];
  }

  // Synchronise une session avec le backend
  async syncSessionWithBackend(sessionId: string, companyId: string): Promise<void> {
    try {
      const backendMessages = await this.loadSessionFromBackend(sessionId, companyId);
      if (backendMessages.length > 0) {
        const sessions = this.getAllSessions();
        const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
        
        if (sessionIndex >= 0) {
          sessions[sessionIndex].messages = backendMessages;
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
          console.log(`Session ${sessionId} synchronisée avec le backend (${backendMessages.length} messages)`);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation avec le backend:', error);
    }
  }

  // Crée une nouvelle session
  createNewSession(companyId: string): ChatSession {
    const externalUserId = this.generateExternalUserId();
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newSession: ChatSession = {
      sessionId,
      companyId,
      externalUserId,
      title: `Conversation du ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      createdAt: new Date().toISOString(),
      messages: []
    };
    
    this.saveSession(newSession);
    return newSession;
  }

  // Ajoute un message à la session actuelle
  addMessageToSession(sessionId: string, message: Message): void {
    try {
      const sessions = this.getAllSessions();
      const sessionIndex = sessions.findIndex(s => s.sessionId === sessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].messages.push(message);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du message:', error);
    }
  }

  // Met à jour le sessionId depuis le backend
  updateSessionId(localSessionId: string, backendSessionId: string): void {
    try {
      const sessions = this.getAllSessions();
      const sessionIndex = sessions.findIndex(s => s.sessionId === localSessionId);
      
      if (sessionIndex >= 0) {
        sessions[sessionIndex].sessionId = backendSessionId;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
        localStorage.setItem(this.CURRENT_SESSION_KEY, backendSessionId);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du sessionId:', error);
    }
  }

  // Supprime une session
  deleteSession(sessionId: string): void {
    try {
      const sessions = this.getAllSessions();
      const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredSessions));
      
      // Si c'était la session actuelle, la réinitialiser
      const currentSessionId = localStorage.getItem(this.CURRENT_SESSION_KEY);
      if (currentSessionId === sessionId) {
        localStorage.removeItem(this.CURRENT_SESSION_KEY);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la session:', error);
    }
  }

  // Nettoie les anciennes sessions (garde les 10 plus récentes)
  cleanOldSessions(): void {
    try {
      const sessions = this.getAllSessions();
      if (sessions.length > 10) {
        const sortedSessions = sessions
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
        
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sortedSessions));
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage des sessions:', error);
    }
  }
}

export const sessionService = new SessionService();
export type { ChatSession, Message };
