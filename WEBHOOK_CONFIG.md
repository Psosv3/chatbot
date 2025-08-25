# Configuration des Webhooks Facebook Messenger

## 🚨 Problèmes identifiés et corrigés

### 1. Webhooks trop nombreux
**AVANT** : Vous aviez coché :
- ✅ `message_deliveries` 
- ✅ `message_reads`
- ✅ `messages`
- ✅ `messaging_postbacks`

**APRÈS** : Décochez ces webhooks inutiles :
- ❌ `message_deliveries` (déclenche à chaque livraison)
- ❌ `message_reads` (déclenche à chaque lecture)
- ✅ `messages` (garder pour les messages texte)
- ✅ `messaging_postbacks` (garder pour les boutons)

### 2. Corrections apportées au code

#### Rate Limiting
- **2 secondes** entre chaque appel API par utilisateur
- Cache automatique avec nettoyage toutes les minutes

#### Déduplication des messages
- Détection des messages en double via `messageId`
- Cache des messages traités (5 minutes de rétention)

#### Délai anti-surcharge
- **1 seconde** de délai avant chaque appel à l'API Mistral
- Évite de surcharger l'API tierce

#### Gestion d'erreur améliorée
- Fallback local pour les erreurs 429
- Messages d'erreur plus clairs pour l'utilisateur

## 🔧 Configuration Facebook App

### Dans votre app Facebook :
1. Allez dans **Webhooks** > **Messenger**
2. **Décochez** `message_deliveries` et `message_reads`
3. **Gardez** seulement `messages` et `messaging_postbacks`

### URL du webhook :
```
https://votre-domaine.com/api/messenger/webhook
```

## 📊 Monitoring

Le code ajoute des logs détaillés :
- `🔔 Webhook POST reçu`
- `👤 PSID: [id]`
- `🆔 Message ID: [id]`
- `⚠️ Rate limit atteint pour PSID: [id]`
- `🔄 Message en double détecté, ignoré`

## 🚀 Améliorations futures

Pour la production, remplacez le cache Map par :
- **Redis** pour la persistance
- **Queue system** (Bull, Agenda) pour les appels API
- **Circuit breaker** pour l'API Mistral
- **Métriques** avec Prometheus/Grafana

## 💡 Conseils

1. **Testez** avec un seul utilisateur d'abord
2. **Surveillez** les logs pour détecter les patterns
3. **Ajustez** les délais selon vos besoins
4. **Backup** de vos tokens d'accès
