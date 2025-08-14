# ⚙️ Configuration du Chatbot Externe

## 🔧 Variables d'Environnement

### NEXT_PUBLIC_API_URL
URL de votre backend RAG_ONEXUS.

#### ✅ **Configuration Correcte**
```bash
# Production
NEXT_PUBLIC_API_URL=http://api-rag.onexus.tech

# ou avec HTTPS
NEXT_PUBLIC_API_URL=https://api-rag.onexus.tech

# Développement local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### ❌ **Erreurs Courantes**
```bash
# Ne PAS mettre de @ au début
NEXT_PUBLIC_API_URL=@http://api-rag.onexus.tech  # ❌ INCORRECT

# Ne PAS mettre de slash à la fin
NEXT_PUBLIC_API_URL=http://api-rag.onexus.tech/  # ❌ INCORRECT
```

## 🛠️ Corrections Apportées

### Problème Résolu
L'erreur `Protocol "https:" not supported. Expected "http:"` était causée par :

1. **@ au début de l'URL** dans votre variable d'environnement
2. **Agent HTTP utilisé pour HTTPS** - incompatible
3. **Gestion des protocoles** non adaptée

### Solution Implémentée

#### Détection Automatique du Protocole
```typescript
// Nettoie l'URL (enlève le @ si présent)
const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/^@/, '') || 'http://localhost:8000';
const backendUrl = `${apiUrl}/ask_public/`;

// Détecte HTTPS vs HTTP
const isHttps = backendUrl.startsWith('https://');

// Utilise l'agent approprié
const agent = isHttps 
  ? new https.Agent({ keepAlive: true, rejectUnauthorized: false })
  : new http.Agent({ keepAlive: true });
```

#### Fichiers Modifiés
- `chatbot/app/api/ask/route.ts`
- `chatbot/app/api/session-messages/route.ts`

## 🚀 Déploiement

### 1. Vérifier la Variable d'Environnement
```bash
# Dans votre fichier .env
NEXT_PUBLIC_API_URL=http://api-rag.onexus.tech
```

### 2. Rebuild du Projet
```bash
cd chatbot
npm run build
npm start
```

### 3. Test de Connectivité
```bash
# Tester l'endpoint directement
curl http://api-rag.onexus.tech/ask_public/ \
  -H "Content-Type: application/json" \
  -d '{"question":"Test","company_id":"test"}'
```

## 🔐 Sécurité HTTPS

### Certificats Auto-Signés
Si vous utilisez des certificats auto-signés, l'option `rejectUnauthorized: false` est activée automatiquement.

### Production
Pour la production, assurez-vous d'avoir des certificats SSL valides sur votre backend.

## 🐛 Debug

### Vérifier les Variables
```typescript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
console.log('Backend URL:', backendUrl);
console.log('Is HTTPS:', isHttps);
```

### Erreurs Communes
- **Connection refused** : Backend non démarré
- **CORS errors** : Configuration CORS du backend
- **SSL errors** : Problème de certificat (utilisez HTTP en dev)

## 📝 Logs Utiles

```bash
# Logs du chatbot Next.js
npm run dev

# Logs du backend Python
cd RAG_ONEXUS
uvicorn app:app --reload --log-level debug
```

## ✅ Test Final

Une fois configuré, testez :
1. **Ouvrir** `http://localhost:3000/widget?company_id=test`
2. **Envoyer** un message
3. **Vérifier** la création de session dans les logs backend
4. **Confirmer** l'enregistrement en base de données
