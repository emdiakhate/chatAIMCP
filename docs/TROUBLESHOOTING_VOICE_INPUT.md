# 🔧 Dépannage Voice Input (Speech-to-Text)

## ❌ Erreur: Clé API OpenAI affichée

Si vous voyez votre clé API OpenAI (`sk-...`) dans une erreur, c'était un bug de sécurité qui a été **corrigé**.

### ✅ Corrections Appliquées:

1. **Backend** (`chat-stream.js`):
   - Messages d'erreur sécurisés
   - Ne jamais exposer les clés dans les logs
   - Messages clairs selon le type d'erreur

2. **Frontend** (`ChatInputAdvanced.tsx`):
   - Nettoyage automatique des clés API dans les messages
   - Regex pour masquer `sk-[...]` par `[API_KEY]`
   - Messages utilisateur clairs et sécurisés

---

## 🔍 Diagnostic: Vérifier votre Configuration

### Étape 1: Vérifier que la clé est stockée

```bash
cd backend

# Obtenir votre user_id depuis la console du navigateur:
# 1. Ouvrir la console (F12)
# 2. Taper: localStorage.getItem('token')
# 3. Décoder le JWT sur jwt.io pour voir le userId

# Ensuite lancer:
node check-api-keys.js <votre_user_id>

# Exemple:
node check-api-keys.js 1
```

**Résultat attendu:**
```
✅ 1 intégration(s) trouvée(s):

📦 Provider: openai
   ID: 1
   Créé: 2025-11-10 14:30:00
   ✅ Clé API: sk-proj-TH... (164 chars)
   ✅ Format valide: commence par 'sk-'

🎤 Test Voice Input (OpenAI Whisper):
   ✅ Clé OpenAI configurée et récupérable
   ✅ Le bouton micro devrait fonctionner
```

**Si la clé n'est pas trouvée:**
```
❌ Aucune intégration trouvée pour cet utilisateur

Pour ajouter une clé API OpenAI:
1. Aller dans MCP Tools
2. Trouver "OpenAI (GPT & DALL-E)"
3. Cliquer sur "Configure"
4. Ajouter votre clé API
```

---

## 🐛 Problèmes Courants

### Problème 1: "Invalid OpenAI API key"

**Causes possibles:**
- Clé API incorrecte ou expirée
- Clé copiée avec espaces au début/fin
- Clé d'un compte désactivé

**Solutions:**
1. Vérifier sur https://platform.openai.com/api-keys
2. Créer une nouvelle clé si nécessaire
3. **IMPORTANT:** Copier la clé entière (nouvelles clés = 164 caractères)
4. Supprimer l'ancienne clé dans MCP Tools
5. Ajouter la nouvelle clé

**Format des nouvelles clés OpenAI (2024+):**
```
sk-proj-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX...
```
- Commence par `sk-proj-`
- ~164 caractères au total
- Contient lettres, chiffres, tirets, underscores

---

### Problème 2: "OpenAI API rate limit exceeded"

**Cause:** Trop de requêtes

**Solutions:**
1. Attendre 1-2 minutes
2. Vérifier votre usage sur https://platform.openai.com/usage
3. Vérifier votre plan (Free tier = limites strictes)
4. Considérer upgrade vers plan payant

**Taux limites Free tier:**
- 3 requêtes/minute
- 200 requêtes/jour

**Taux limites Pay-as-you-go:**
- 50 requêtes/minute
- 10,000 requêtes/jour

---

### Problème 3: "Audio file is required" ou "buffer is empty"

**Causes:**
- Navigateur ne supporte pas MediaRecorder
- Problème de permissions micro
- Encodage audio non supporté

**Solutions:**

**1. Vérifier le navigateur:**
- ✅ Chrome/Edge: Supporté
- ✅ Firefox: Supporté
- ❌ Safari < 14.1: Non supporté
- Mettre à jour si nécessaire

**2. Vérifier les permissions:**
```
1. Cliquer sur le cadenas dans la barre d'adresse
2. Vérifier que "Microphone" = Autorisé
3. Si bloqué, changer à "Autoriser"
4. Rafraîchir la page
```

**3. Tester le micro:**
```javascript
// Dans la console du navigateur (F12):
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
    console.log('✅ Micro fonctionne:', stream);
    stream.getTracks().forEach(t => t.stop());
  })
  .catch(err => console.error('❌ Erreur micro:', err));
```

---

### Problème 4: Clé configurée mais ne fonctionne pas

**Diagnostic:**

```bash
# 1. Vérifier les logs backend
cd backend
npm run dev

# Observer les logs quand vous cliquez sur le micro:
# [Speech-to-Text] OpenAI API key check:
#   userId: 1
#   hasKey: true/false
#   keyPrefix: sk-proj-...
```

**Si `hasKey: false`:**

```sql
# Vérifier directement dans la base de données:
cd backend
sqlite3 database/chatai.db

SELECT id, user_id, provider, created_at
FROM integrations
WHERE provider = 'openai';

# Si vide -> Reconfigurer la clé
# Si présent -> Problème de décryptage
```

**Si problème de décryptage:**

```bash
# Vérifier ENCRYPTION_KEY dans .env
cat backend/.env | grep ENCRYPTION_KEY

# Si absent ou changé récemment -> Les anciennes clés ne peuvent plus être décryptées
# Solution: Reconfigurer toutes les clés API
```

---

### Problème 5: "Could not parse multipart form"

**Cause:** Format FormData incorrect

**Solution:**

1. Vérifier que vous utilisez bien `ChatInputAdvanced`
2. Redémarrer le backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Vider le cache du navigateur (Ctrl+Shift+Delete)
4. Rafraîchir la page (F5)

---

## ✅ Test Complet

### Test 1: Backend est OK

```bash
curl http://localhost:3001/health
```

**Résultat attendu:**
```json
{
  "status": "ok",
  "version": "2.0.0-mcp-sqlite",
  "database": "SQLite"
}
```

---

### Test 2: Clé API est récupérable

```bash
node backend/check-api-keys.js 1
```

**Attendu:** `✅ Clé OpenAI configurée et récupérable`

---

### Test 3: Micro fonctionne

1. Ouvrir http://localhost:5173
2. Aller dans une conversation
3. Cliquer sur le micro 🎤
4. **Attendu:** Demande de permission → Icône devient rouge
5. Parler clairement
6. Recliquer pour arrêter
7. **Attendu:** "Transcribing audio..." → Texte apparaît

---

### Test 4: Clé API OpenAI valide

```bash
# Tester directement l'API Whisper:
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer VOTRE_CLE_API_ICI"
```

**Si erreur 401:** Clé invalide
**Si liste de modèles:** Clé valide ✅

---

## 🔒 Sécurité: Jamais Exposer les Clés

### Avant (Problème):
```
Error: Invalid key: sk-proj-THEe4DFBM4xYEXY8...
```
☠️ Clé exposée dans l'erreur

### Après (Corrigé):
```
Error: Invalid OpenAI API key. Please verify your API key in MCP Tools settings.
```
✅ Message clair sans exposer la clé

**Les clés sont masquées:**
- Backend: Messages d'erreur sécurisés
- Frontend: Regex supprime `sk-[...]` → `[API_KEY]`
- Logs: Seulement les 7 premiers caractères + "..."

---

## 📝 Procédure de Reconfiguration

Si vous devez reconfigurer votre clé OpenAI:

### 1. Supprimer l'ancienne clé

**Via l'interface:**
1. MCP Tools → OpenAI
2. Cliquer "Disconnect" ou "Delete"

**Via la base de données:**
```bash
cd backend
sqlite3 database/chatai.db

DELETE FROM integrations
WHERE user_id = 1 AND provider = 'openai';

.exit
```

### 2. Ajouter la nouvelle clé

1. Aller sur https://platform.openai.com/api-keys
2. Créer une nouvelle clé (ou copier une existante)
3. MCP Tools → OpenAI → Configure
4. Coller la clé entière (toutes les 164 caractères!)
5. Sauvegarder

### 3. Vérifier

```bash
node backend/check-api-keys.js 1
```

**Attendu:**
```
✅ Clé API: sk-proj-TH... (164 chars)
✅ Format valide: commence par 'sk-'
✅ Le bouton micro devrait fonctionner
```

### 4. Tester

1. Cliquer sur le micro
2. Parler
3. ✅ Transcription apparaît

---

## 💡 Tips

### Économiser les crédits OpenAI

**Whisper coûts:**
- $0.006 par minute d'audio
- Exemple: 10 minutes = $0.06

**Conseils:**
- Enregistrements courts (<30 secondes)
- Parler clairement (moins de re-transcriptions)
- Utiliser pour les longs messages seulement

### Alternative: Speech Recognition native du navigateur

Si vous voulez éviter les coûts OpenAI, on peut utiliser `webkitSpeechRecognition` (gratuit mais moins précis).

**Avantages:**
- ✅ Gratuit
- ✅ Pas besoin de clé API
- ✅ Instantané

**Inconvénients:**
- ❌ Moins précis
- ❌ Nécessite connexion internet
- ❌ Seulement Chrome/Edge

---

## 📞 Support

**Si le problème persiste après ces étapes:**

1. Vérifier les logs backend pour l'erreur exacte
2. Vérifier les logs frontend (F12 → Console)
3. Lancer le diagnostic: `node backend/check-api-keys.js <user_id>`
4. Capturer les logs pendant l'enregistrement

**Informations à fournir:**
- User ID
- Résultat de `check-api-keys.js`
- Logs backend (ligne `[Speech-to-Text]`)
- Logs frontend (console browser)
- Message d'erreur exact

---

**Problème résolu?** Vous devriez maintenant pouvoir utiliser le voice input! 🎤✅
