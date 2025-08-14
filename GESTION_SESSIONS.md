# 🗂️ Gestion des Sessions - Chatbot Externe

## ✨ Fonctionnalités Implémentées

Votre chatbot externe dispose désormais d'un système complet de gestion des sessions qui :

### 🔄 Persistance des conversations
- **localStorage** : Sauvegarde automatique des conversations dans le navigateur
- **Base de données** : Synchronisation avec Supabase via le backend RAG_ONEXUS
- **Continuité** : Les conversations reprennent là où elles s'étaient arrêtées

### 👤 Identification utilisateur
- **ID utilisateur externe** : Génération automatique d'un identifiant unique par navigateur
- **Multi-entreprise** : Isolation des sessions par `company_id`
- **Traçabilité** : Suivi des conversations par utilisateur

### 💾 Stockage hybride
- **Cache local** : Accès immédiat aux conversations récentes
- **Synchronisation backend** : Récupération des conversations depuis la base de données
- **Fallback** : Fonctionnement même en cas de problème de connexion

## 🎯 Comment ça fonctionne

### 1. Première visite
```
👤 Utilisateur ouvre le chatbot
↓
🔑 Génération automatique d'un external_user_id
↓
📝 Création d'une nouvelle session
↓
💾 Sauvegarde locale + base de données
```

### 2. Visite suivante
```
👤 Utilisateur revient
↓
🔍 Recherche de session existante (localStorage)
↓
🔄 Synchronisation avec le backend
↓
📱 Restauration de la conversation
```

### 3. Nouvelle conversation
```
👤 Utilisateur clique "Nouvelle conversation"
↓
📝 Création d'une nouvelle session
↓
🏷️ Archivage de l'ancienne session
↓
🎯 Basculement vers la nouvelle session
```

## 🛠️ Composants Techniques

### Frontend (Next.js)
- `sessionService.ts` : Service de gestion des sessions
- `Chat.tsx` : Composant principal avec synchronisation
- `SessionManager.tsx` : Gestionnaire d'historique des conversations
- `ChatWidget.tsx` : Interface utilisateur avec sélection de sessions

### Backend (FastAPI)
- **Tables Supabase** : `public_chat_sessions` et `public_chat_messages`
- **API endpoints** : 
  - `POST /ask_public/` : Questions avec gestion de session
  - `GET /messages_public/{session_id}` : Récupération de l'historique
- **Fonctions** : `create_public_session()`, `add_public_message()`, `load_public_session_from_supabase()`

## 📊 Structure des données

### Session (ChatSession)
```typescript
{
  sessionId: string;          // ID unique de la session
  companyId: string;          // ID de l'entreprise
  externalUserId: string;     // ID utilisateur généré automatiquement
  title: string;              // Titre auto-généré
  createdAt: string;          // Date de création
  messages: Message[];        // Liste des messages
}
```

### Message
```typescript
{
  text: string;              // Contenu du message
  isUser: boolean;           // true = utilisateur, false = assistant
  timestamp: string;         // Horodatage
}
```

## 🔧 Configuration requise

### Base de données (Supabase)
Exécutez le script SQL mis à jour dans `dashboard_chatbot/database/schema.sql` qui inclut :
- Table `public_chat_sessions`
- Table `public_chat_messages`
- Index optimisés
- Contraintes de référence

### Variables d'environnement (Backend)
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

## 🎮 Utilisation

### Pour les utilisateurs
1. **Première utilisation** : Le chatbot crée automatiquement une session
2. **Conversations suivantes** : L'historique est automatiquement restauré
3. **Gestion des sessions** : Clic sur l'icône 🕐 pour voir l'historique et créer de nouvelles conversations
4. **Suppression** : Possibilité de supprimer des conversations individuelles

### Pour les développeurs
```javascript
// Intégration simple
<iframe src="chatbot/widget?company_id=YOUR_COMPANY_ID"></iframe>

// Ou en mode embed
<div id="chatbot-container"></div>
<script src="chatbot/widget-script?company_id=YOUR_COMPANY_ID"></script>
```

## 🔒 Sécurité et Nettoyage

### Nettoyage automatique
- **Limite** : Conservation des 10 conversations les plus récentes par utilisateur
- **Nettoyage** : Suppression automatique des anciennes sessions

### Données sensibles
- **Pas d'authentification** : Système public, pas de données personnelles
- **Isolation** : Séparation par `company_id`
- **Traçabilité** : Suivi par `external_user_id` généré automatiquement

## 🚀 Déploiement

1. **Mise à jour de la base de données** :
   ```sql
   -- Exécuter le nouveau schema.sql dans Supabase
   ```

2. **Redémarrage du backend** :
   ```bash
   cd RAG_ONEXUS
   uvicorn app:app --reload
   ```

3. **Build du chatbot** :
   ```bash
   cd chatbot
   npm run build
   npm start
   ```

## ✅ Tests

### Test local
1. Ouvrir `http://localhost:3000/widget?company_id=test`
2. Envoyer quelques messages
3. Fermer et rouvrir : vérifier que la conversation reprend
4. Créer une nouvelle conversation
5. Vérifier l'historique dans le gestionnaire de sessions

### Vérification base de données
```sql
-- Vérifier les sessions créées
SELECT * FROM public_chat_sessions ORDER BY created_at DESC;

-- Vérifier les messages
SELECT * FROM public_chat_messages ORDER BY created_at DESC;
```

## 🎉 Résultat

Votre chatbot externe dispose maintenant de :
- ✅ **Persistance des sessions** dans localStorage
- ✅ **Sauvegarde en base de données** via Supabase
- ✅ **Détection automatique** des sessions existantes
- ✅ **Interface de gestion** des conversations
- ✅ **Synchronisation** entre local et backend
- ✅ **Nettoyage automatique** des anciennes données

Les utilisateurs peuvent maintenant reprendre leurs conversations là où ils les avaient laissées, même après avoir fermé leur navigateur ou changé d'appareil (avec le même `external_user_id`).
