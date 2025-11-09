# 🔍 Debug OAuth redirect_uri_mismatch

## ✅ Vérifications à faire

### 1. URL de Redirection dans Google Cloud Console

1. Allez sur : https://console.cloud.google.com/apis/credentials
2. Cliquez sur votre OAuth 2.0 Client ID
3. Dans "Authorized redirect URIs", vous DEVEZ avoir EXACTEMENT :

```
http://localhost:3001/api/auth/google/callback
```

**⚠️ Points critiques :**
- Pas d'espace avant ou après
- Pas de slash final (`/`)
- Utilisez `http://` (pas `https://`)
- Port `3001` (pas `3000` ou autre)
- Chemin exact : `/api/auth/google/callback`

### 2. Vérifier l'URL utilisée par l'application

L'application utilise cette URL (définie dans `backend/src/routes/oauth-google.js`) :
```javascript
redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/google/callback'
```

### 3. Vérifier les logs du serveur

Quand vous essayez de connecter Gmail/Drive/Sheets, regardez les logs du backend. Vous devriez voir :
```
[OAuth Google] Starting OAuth flow: {
  scope: 'gmail',
  redirectUri: 'http://localhost:3001/api/auth/google/callback',
  clientId: '526312616783-qg2oq1f...'
}
```

### 4. Variantes à essayer dans Google Cloud Console

Si ça ne fonctionne toujours pas, ajoutez TOUTES ces variantes :

```
http://localhost:3001/api/auth/google/callback
http://127.0.0.1:3001/api/auth/google/callback
```

### 5. Vérifier le Client ID

Assurez-vous que le Client ID utilisé dans `.env` correspond bien à celui dans Google Cloud Console :
- Client ID dans `.env` : `526312616783-qg2oq1fq00qguogq1sm71bom1gm6vb5c.apps.googleusercontent.com`
- Vérifiez que c'est le même dans Google Cloud Console

### 6. Attendre la propagation

Après avoir ajouté/modifié l'URL dans Google Cloud Console :
- Cliquez sur "SAVE"
- Attendez **2-3 minutes** pour que les changements soient propagés
- Réessayez la connexion

### 7. Vérifier le type d'application

Dans Google Cloud Console, vérifiez que votre OAuth 2.0 Client ID est de type :
- **"Web application"** (pas "Desktop app" ou autre)

### 8. Vérifier les scopes autorisés

Dans Google Cloud Console, vérifiez que les scopes suivants sont autorisés :
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/gmail.compose`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/spreadsheets`

## 🐛 Si ça ne fonctionne toujours pas

1. **Vérifiez les logs du backend** lors de la tentative de connexion
2. **Vérifiez la console du navigateur** pour voir l'URL exacte utilisée
3. **Essayez de supprimer et recréer** l'OAuth 2.0 Client ID dans Google Cloud Console
4. **Vérifiez que vous êtes connecté au bon compte Google** dans le navigateur

## 📝 Note sur "n8n-integration"

Si vous voyez "n8n-integration" dans l'erreur, cela signifie que :
- Le Client ID appartient à un projet Google nommé "n8n-integration"
- Ou vous utilisez un Client ID d'un autre projet

Cela n'affecte pas le fonctionnement tant que l'URL de redirection est correctement configurée.

