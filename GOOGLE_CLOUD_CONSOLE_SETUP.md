# 🔧 Configuration Google Cloud Console pour Gmail OAuth

## ✅ Vérification des Variables d'Environnement

Vos variables doivent être configurées dans le fichier `.env` du backend :

```
GOOGLE_CLIENT_ID=votre_client_id_google
GOOGLE_CLIENT_SECRET=votre_client_secret_google
```

## 🔗 URL de Redirection à Ajouter dans Google Cloud Console

### URL de Callback OAuth

Vous devez ajouter cette URL dans la section **"Authorized redirect URIs"** de votre OAuth 2.0 Client ID :

```
http://localhost:3001/api/auth/google/callback
```

### Étapes Détaillées

1. **Accédez à Google Cloud Console**
   - Allez sur https://console.cloud.google.com/
   - Sélectionnez votre projet (ou créez-en un nouveau)

2. **Naviguez vers les Credentials**
   - Menu latéral → **APIs & Services** → **Credentials**
   - Ou directement : https://console.cloud.google.com/apis/credentials

3. **Trouvez votre OAuth 2.0 Client ID**
   - Cherchez votre Client ID (format: `xxxxx-xxxxx.apps.googleusercontent.com`)
   - Cliquez dessus pour l'éditer

4. **Ajoutez l'URL de Redirection**
   - Dans la section **"Authorized redirect URIs"**, cliquez sur **"+ ADD URI"**
   - Ajoutez : `http://localhost:3001/api/auth/google/callback`
   - Cliquez sur **"SAVE"**

5. **Vérifiez les Scopes**
   - Assurez-vous que les scopes suivants sont autorisés :
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.compose`
     - `https://www.googleapis.com/auth/drive.readonly` (pour Google Drive)

## 📋 Scopes Requis

### Pour Gmail
- `https://www.googleapis.com/auth/gmail.readonly` - Lecture des emails
- `https://www.googleapis.com/auth/gmail.send` - Envoi d'emails
- `https://www.googleapis.com/auth/gmail.compose` - Composition d'emails

### Pour Google Drive
- `https://www.googleapis.com/auth/drive.readonly` - Lecture des fichiers

### Pour Google Sheets
- `https://www.googleapis.com/auth/spreadsheets` - Accès aux tableurs

## 🔍 Vérification

Après avoir ajouté l'URL de redirection :

1. **Redémarrez le serveur backend** (si nécessaire)
2. **Testez la connexion Gmail** :
   - Allez dans le Marketplace MCP
   - Cliquez sur "Connect" pour Gmail
   - Le modal OAuth devrait s'ouvrir
   - Autorisez l'application dans Google
   - La connexion devrait être créée automatiquement

## ⚠️ Notes Importantes

1. **Environnement de Production** :
   - Pour la production, vous devrez ajouter une URL de redirection supplémentaire :
     - `https://votre-domaine.com/api/auth/google/callback`

2. **OAuth Consent Screen** :
   - Assurez-vous que l'écran de consentement OAuth est configuré
   - Menu → **APIs & Services** → **OAuth consent screen**
   - Remplissez les informations requises (nom de l'application, email, etc.)

3. **Mode de Test vs Production** :
   - En mode test, seuls les utilisateurs ajoutés dans "Test users" peuvent se connecter
   - En production, tous les utilisateurs Google peuvent se connecter

## 🐛 Dépannage

### Erreur : "redirect_uri_mismatch"
- **Cause** : L'URL de redirection n'est pas exactement la même que celle configurée
- **Solution** : Vérifiez que l'URL dans Google Cloud Console correspond exactement à `http://localhost:3001/api/auth/google/callback`

### Erreur : "access_denied"
- **Cause** : L'utilisateur a refusé l'autorisation ou les scopes ne sont pas autorisés
- **Solution** : Vérifiez que les scopes sont bien configurés dans Google Cloud Console

### Erreur : "invalid_client"
- **Cause** : Le Client ID ou Client Secret est incorrect
- **Solution** : Vérifiez les variables d'environnement dans le fichier `.env`

## 📝 Résumé

✅ **Client ID** : Votre Client ID Google (format: `xxxxx-xxxxx.apps.googleusercontent.com`)  
✅ **Client Secret** : Votre Client Secret Google  
🔗 **URL de Redirection** : `http://localhost:3001/api/auth/google/callback`

> ⚠️ **Note de sécurité** : Ne partagez jamais vos Client ID et Client Secret publiquement. Gardez-les dans votre fichier `.env` local uniquement.

Une fois l'URL de redirection ajoutée dans Google Cloud Console, la connexion Gmail devrait fonctionner correctement !

