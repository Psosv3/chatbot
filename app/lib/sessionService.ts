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

  // Détecte la langue d'un texte (malgache, français, anglais)
  detectLanguage(text: string): 'malgache' | 'français' | 'anglais' {
    const cleanText = text.toLowerCase().trim();
    
    // Mots-clés spécifiques au malgache
    const malagasyKeywords = [
      'misaotra', 'veloma', 'manao ahoana', 'salama', 'miarahaba', 'tsara', 'ratsy', 'misy', 'tsy misy',
      'mandeha', 'mipetraka', 'mihinana', 'misotro', 'matory', 'mifoha',
      'trano', 'olona', 'zavatra', 'andro', 'volana', 'taona', 'fotoana',
      'eto', 'any', 'ao', 'izay', 'izao', 'izany', 'izareo',
      'an\'ny', 'amin\'ny', 'ho an\'ny', 'noho ny',
      'fa', 'ary', 'na', 'sa', 'raha', 'raha tsy', 'satria', 'noho',
      'dia', 'kosa', 'indray', 'avy', 'hatrany', 'mandra-pahatongany',
      'mba', 'mba tsy', 'mba ho', 'mba hitranga', 'mba hatao',
      'toy', 'toy ny', 'tahaka', 'tahaka ny', 'karazana', 'karazany',
      'be', 'kely', 'lehibe', 'maro', 'vitsy', 'rehetra', 'tsirairay', 'tompoko',
      'aiza', 'ahoana', 'anareo', 'izareo', 'ianao', 'kay', 've',
      'fomba', 'manao', 'mametraka', 'mampiasa'
    ];

    // Mots-clés spécifiques au français
    const frenchKeywords = [
      'bonjour', 'bonsoir', 'salut', 'merci', 'de rien', 'excusez-moi', 'pardon',
      'oui', 'non', 'peut-être', 'bien', 'mal', 'bon', 'mauvais', 'grand', 'petit',
      'beaucoup', 'peu', 'trop', 'assez', 'très', 'plutôt', 'vraiment', 'sûrement',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'me', 'te', 'se',
      'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'notre', 'votre',
      'leur', 'nos', 'vos', 'leurs', 'ce', 'cette', 'ces', 'cet', 'un', 'une', 'des',
      'le', 'la', 'les', 'du', 'de la', 'des', 'au', 'aux', 'dans', 'sur', 'sous',
      'avec', 'sans', 'pour', 'par', 'vers', 'chez', 'entre', 'parmi', 'devant',
      'derrière', 'à côté', 'loin', 'près', 'ici', 'là', 'où', 'quand', 'comment',
      'pourquoi', 'qui', 'que', 'quoi', 'dont', 'lequel', 'laquelle', 'lesquels',
      'lesquelles', 'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'puisque',
      'parce que', 'afin que', 'bien que', 'quoique', 'si', 'comme', 'ainsi',
      'alors', 'donc', 'ensuite', 'puis', 'après', 'avant', 'pendant', 'depuis',
      'jusqu\'à', 'vers', 'environ', 'presque', 'tout', 'tous', 'toute', 'toutes'
    ];

    // Mots-clés spécifiques à l'anglais
    const englishKeywords = [
      'hello', 'hi', 'good morning', 'good afternoon', 'good evening', 'good night',
      'thank you', 'thanks', 'you\'re welcome', 'excuse me', 'sorry', 'pardon',
      'yes', 'no', 'maybe', 'well', 'bad', 'good', 'big', 'small', 'large', 'little',
      'much', 'many', 'little', 'few', 'too', 'enough', 'very', 'really', 'surely',
      'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers',
      'ours', 'theirs', 'this', 'that', 'these', 'those', 'a', 'an', 'the',
      'in', 'on', 'at', 'by', 'for', 'with', 'without', 'to', 'from', 'of', 'about',
      'under', 'over', 'above', 'below', 'between', 'among', 'through', 'during',
      'before', 'after', 'since', 'until', 'while', 'where', 'when', 'why', 'how',
      'who', 'what', 'which', 'whose', 'whom', 'and', 'or', 'but', 'so', 'yet',
      'because', 'if', 'unless', 'although', 'though', 'as', 'like', 'than',
      'then', 'now', 'here', 'there', 'everywhere', 'somewhere', 'anywhere',
      'all', 'some', 'any', 'no', 'every', 'each', 'both', 'either', 'neither'
    ];

    // Compter les occurrences de chaque langue
    let malagasyCount = 0;
    let frenchCount = 0;
    let englishCount = 0;

    // Vérifier les mots malgaches
    malagasyKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanText.match(regex);
      if (matches) malagasyCount += matches.length;
    });

    // Vérifier les mots français
    frenchKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanText.match(regex);
      if (matches) frenchCount += matches.length;
    });

    // Vérifier les mots anglais
    englishKeywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = cleanText.match(regex);
      if (matches) englishCount += matches.length;
    });

    // Détecter les caractères spéciaux malgaches (apostrophes dans les mots)
    const malagasyApostrophes = (cleanText.match(/'/g) || []).length;
    malagasyCount += malagasyApostrophes;

    // Détecter des patterns spécifiques au malgache (sans doublon avec les mots-clés)
    const malagasyPatterns = [
      /\b(ny|no|kay|ve)\b/g,  // Articles et particules malgaches
      /\b(aiza|ahoana|anareo|izareo|ianao)\b/g,  // Pronoms malgaches
      /\b(misy|tsy)\b/g  // Verbes d'existence malgaches
    ];
    
    // Ne pas compter deux fois les mots déjà comptés dans malagasyKeywords
    const alreadyCounted = ['aiza', 'ahoana', 'anareo', 'izareo', 'ianao', 'misy', 'tsy'];
    
    malagasyPatterns.forEach(pattern => {
      const matches = cleanText.match(pattern);
      if (matches) {
        // Ne compter que les mots qui ne sont pas déjà dans malagasyKeywords
        const uniqueMatches = matches.filter(match => !alreadyCounted.includes(match.toLowerCase()));
        malagasyCount += uniqueMatches.length;
      }
    });

    // Debug: afficher les comptes pour comprendre la détection
    console.log(`Détection langue pour "${text}": Malgache=${malagasyCount}, Français=${frenchCount}, Anglais=${englishCount}`);

    // Retourner la langue avec le plus grand nombre d'occurrences
    if (malagasyCount > frenchCount && malagasyCount > englishCount) {
      return 'malgache';
    } else if (frenchCount > englishCount) {
      return 'français';
    } else if (englishCount > 0) {
      return 'anglais';
    } else {
      // Par défaut, si aucun mot-clé n'est trouvé, essayer de détecter par les caractères
      // Si le texte contient des apostrophes dans des mots, c'est probablement du malgache
      if (malagasyApostrophes > 0) {
        return 'malgache';
      }
      // Sinon, par défaut français
      return 'français';
    }
  }
}

export const sessionService = new SessionService();
export type { ChatSession, Message };
