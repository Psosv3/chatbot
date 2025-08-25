# 🔍 Diagnostic Messenger - Le bot ne répond pas

## 🚨 Symptômes
- ✅ Webhook reçoit les messages (status 200)
- ❌ Messenger ne marque pas "vu"
- ❌ Le bot ne répond pas
- ❌ Pas d'indicateur de frappe

## 🔧 Étapes de diagnostic

### 1. Vérifier les variables d'environnement
Regardez les logs au démarrage de votre app :
```
🔧 Configuration webhook:
✅ VERIFY_TOKEN: ✓ Configuré
✅ APP_SECRET: ✓ Configuré  
✅ PAGE_TOKEN: ✓ Configuré
✅ PUBLIC_ASK_URL: ✓ Configuré
```

**Si une variable est manquante** : Vérifiez votre fichier `.env.local`

### 2. Tester l'API Facebook directement
Utilisez la route de test créée :
```
GET /api/messenger/test?psid=VOTRE_PSID&message=Test
```

**Exemple** :
```bash
curl "http://localhost:3000/api/messenger/test?psid=123456789&message=Hello"
```

### 3. Vérifier les permissions Facebook
Dans votre app Facebook, vérifiez :
- ✅ **Page Access Token** est valide
- ✅ **Messaging** est activé
- ✅ **Webhooks** sont configurés correctement
- ✅ **Permissions** : `pages_messaging`, `pages_messaging_subscriptions`

### 4. Vérifier la configuration des webhooks
**Décochez** ces webhooks inutiles :
- ❌ `message_deliveries`
- ❌ `message_reads`
- ✅ `messages` (garder)
- ✅ `messaging_postbacks` (garder)

### 5. Analyser les logs détaillés
Avec le nouveau code, vous devriez voir :
```
🔔 Webhook POST reçu
👤 PSID: 123456789
👁️ Tentative de marquage 'vu'...
📤 Envoi de l'action mark_seen pour PSID: 123456789
📤 Réponse de l'API Facebook pour mark_seen: 200 {"message_id":"..."}
✅ Marquage 'vu' réussi pour PSID: 123456789
```

## 🚨 Erreurs courantes

### Erreur 400 : Bad Request
```
{"error":{"message":"Invalid parameter","type":"OAuthException","code":100,"error_subcode":33,"fbtrace_id":"..."}}
```
**Cause** : PSID invalide ou token expiré

### Erreur 403 : Forbidden
```
{"error":{"message":"(#10) This endpoint requires the 'pages_messaging' permission","type":"OAuthException","code":10,"fbtrace_id":"..."}}
```
**Cause** : Permissions manquantes

### Erreur 200 mais pas de message
```
{"message_id":"..."}
```
**Cause** : Message envoyé mais pas affiché (vérifiez la page Facebook)

## 🛠️ Solutions

### Solution 1 : Vérifier le token
1. Allez dans **Facebook Developers** > **Votre App** > **Messenger** > **Settings**
2. **Regénérez** le Page Access Token
3. Mettez à jour votre `.env.local`

### Solution 2 : Vérifier les permissions
1. **App Review** > **Permissions and Features**
2. Demandez `pages_messaging` et `pages_messaging_subscriptions`
3. **Approve** les permissions

### Solution 3 : Tester avec un PSID valide
1. Utilisez le **PSID de votre compte de test**
2. Vérifiez que vous êtes **admin** de la page
3. Testez d'abord avec la route `/api/messenger/test`

### Solution 4 : Vérifier la page Facebook
1. **Page** > **Settings** > **Messaging**
2. Vérifiez que **Messaging** est activé
3. Vérifiez que **Response Assistant** n'interfère pas

## 📱 Test complet

1. **Redémarrez** votre serveur Next.js
2. **Vérifiez** les logs de configuration
3. **Testez** avec `/api/messenger/test`
4. **Envoyez** un message sur votre page Facebook
5. **Vérifiez** les logs du webhook

## 🔍 Debug avancé

Si le problème persiste, ajoutez ces logs temporaires :

```typescript
// Dans sendSenderAction et sendText
console.log("🔍 URL appelée:", `https://graph.facebook.com/v20.0/me/messages?access_token=${PAGE_TOKEN.substring(0, 10)}...`);
console.log("🔍 Body envoyé:", JSON.stringify({ recipient: { id: psid }, sender_action: action }));
```

## 📞 Support

Si rien ne fonctionne :
1. **Vérifiez** que votre page Facebook est active
2. **Testez** avec un autre compte de test
3. **Vérifiez** que l'app n'est pas en mode développement
4. **Contactez** le support Facebook si nécessaire
