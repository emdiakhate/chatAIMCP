# 🔧 Fix: Erreur redirect_uri_mismatch Google OAuth

## ❌ Erreur
```
Error 400: redirect_uri_mismatch
Access blocked: n8n-integration's request is invalid
```

## 🔍 Cause
L'URL de redirection configurée dans Google Cloud Console ne correspond pas exactement à celle utilisée par l'application.

## ✅ Solution

### URL de Redirection à Ajouter

L'application utilise cette URL exacte :
```
http://localhost:3001/api/auth/google/callback
```

### Étapes Détaillées

1. **Accédez à Google Cloud Console**
   - https://console.cloud.google.com/apis/credentials

2. **Trouvez votre OAuth 2.0 Client ID**
   - Client ID : `526312616783-qg2oq1fq00qguogq1sm71bom1gm6vb5c.apps.googleusercontent.com`
   - Cliquez dessus pour l'éditer

3. **Section "Authorized redirect URIs"**
   - Cliquez sur **"+ ADD URI"**
   - **Copiez-collez EXACTEMENT** cette URL :
     ```
     http://localhost:3001/api/auth/google/callback
     ```
   - ⚠️ **IMPORTANT** :
     - Pas d'espace avant ou après
     - Pas de slash final (`/`)
     - Utilisez `http://` (pas `https://`)
     - Port `3001` (pas `3000` ou autre)
     - Chemin exact : `/api/auth/google/callback`

4. **Sauvegardez**
   - Cliquez sur **"SAVE"**
   - Attendez 1-2 minutes pour que les changements soient propagés

5. **Testez**
   - Réessayez de connecter Gmail/Drive/Sheets
   - L'erreur devrait disparaître

## 🔍 Vérification

Pour vérifier que l'URL est bien configurée :

1. Dans Google Cloud Console, ouvrez votre OAuth 2.0 Client ID
2. Vérifiez la section "Authorized redirect URIs"
3. Vous devriez voir :
   ```
   http://localhost:3001/api/auth/google/callback
   ```

## ⚠️ Erreurs Communes

### ❌ URLs Incorrectes (ne fonctionneront PAS) :
- `http://localhost:3001/api/auth/google/callback/` (slash final)
- `https://localhost:3001/api/auth/google/callback` (https au lieu de http)
- `http://localhost:3000/api/auth/google/callback` (mauvais port)
- `http://127.0.0.1:3001/api/auth/google/callback` (127.0.0.1 au lieu de localhost)
- ` http://localhost:3001/api/auth/google/callback` (espace au début)

### ✅ URL Correcte :
- `http://localhost:3001/api/auth/google/callback` (exactement comme ça)

## 📝 Note sur "n8n-integration"

Si vous voyez "n8n-integration" dans l'erreur, cela signifie probablement que :
- Le Client ID utilisé appartient à un projet Google différent
- Ou le nom du projet dans Google Cloud Console est "n8n-integration"

Cela n'affecte pas le fonctionnement, tant que l'URL de redirection est correctement configurée.

## 🧪 Test

Après avoir ajouté l'URL :

1. Attendez 1-2 minutes
2. Actualisez la page frontend (F5)
3. Essayez de connecter Gmail/Drive/Sheets à nouveau
4. Le modal OAuth devrait s'ouvrir sans erreur

