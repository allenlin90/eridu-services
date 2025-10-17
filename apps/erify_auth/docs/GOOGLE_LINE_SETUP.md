# Google & LINE SSO Setup Guide

## Overview
This guide will help you set up Google and LINE authentication for your Better Auth service, allowing users to register and authenticate using their Google or LINE accounts.

## Prerequisites
- Better Auth service running on `http://localhost:3000`
- Google Cloud Console account
- LINE Developers account

## Step 1: Google OAuth Setup

### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 1.2 Enable Google+ API
1. In the Google Cloud Console, go to **APIs & Services > Library**
2. Search for "Google+ API" and enable it
3. Also enable "Google OAuth2 API"

### 1.3 Create OAuth 2.0 Credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth 2.0 Client IDs**
3. Choose **Web application** as the application type
4. Set the name: "Eridu Auth Service"
5. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/sso/callback/google
   ```
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### 1.4 Update Environment Variables
Add to your `.env` file:
```env
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

## Step 2: LINE Login Setup

### 2.1 Create LINE Channel
1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Log in with your LINE account
3. Click **Create a new channel**
4. Choose **LINE Login**
5. Fill in the required information:
   - Channel name: "Eridu Auth Service"
   - Channel description: "Authentication service for Eridu platform"
   - App types: Web app
   - Email address: your email

### 2.2 Configure LINE Login Settings
1. In your channel settings, go to **LINE Login**
2. Add callback URL:
   ```
   http://localhost:3000/api/auth/sso/callback/line
   ```
3. Enable **Email address permission**
4. Save the settings

### 2.3 Get LINE Credentials
1. In your channel settings, go to **Basic settings**
2. Copy the **Channel ID** (this is your Client ID)
3. Copy the **Channel secret** (this is your Client Secret)

### 2.4 Update Environment Variables
Add to your `.env` file:
```env
LINE_CLIENT_ID=your-line-channel-id-here
LINE_CLIENT_SECRET=your-line-channel-secret-here
```

## Step 3: Test Authentication Flows

### 3.1 Start the Auth Service
```bash
cd apps/erify_auth
pnpm dev
```

### 3.2 Test Google Authentication
1. Open your browser to `http://localhost:3000/api/auth/openapi`
2. Find the SSO sign-in endpoint: `POST /api/auth/sign-in/sso`
3. Test with Google:
```json
{
  "callbackURL": "http://localhost:3000/dashboard",
  "providerId": "google",
  "domain": "*"
}
```

### 3.3 Test LINE Authentication
Test with LINE:
```json
{
  "callbackURL": "http://localhost:3000/dashboard", 
  "providerId": "line",
  "domain": "*"
}
```

## Step 4: Frontend Integration

### 4.1 Google Login Button
```html
<button onclick="loginWithGoogle()">Login with Google</button>
```

```javascript
async function loginWithGoogle() {
  const response = await fetch('/api/auth/sign-in/sso', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callbackURL: window.location.origin + '/dashboard',
      providerId: 'google',
      domain: '*'
    })
  });
  
  const data = await response.json();
  if (data.redirect) {
    window.location.href = data.url;
  }
}
```

### 4.2 LINE Login Button
```html
<button onclick="loginWithLine()">Login with LINE</button>
```

```javascript
async function loginWithLine() {
  const response = await fetch('/api/auth/sign-in/sso', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callbackURL: window.location.origin + '/dashboard',
      providerId: 'line',
      domain: '*'
    })
  });
  
  const data = await response.json();
  if (data.redirect) {
    window.location.href = data.url;
  }
}
```

## Step 5: Production Configuration

### 5.1 Update Redirect URIs for Production
**Google Cloud Console:**
- Add production callback URL: `https://yourdomain.com/api/auth/sso/callback/google`

**LINE Developers Console:**
- Add production callback URL: `https://yourdomain.com/api/auth/sso/callback/line`

### 5.2 Update Environment Variables
```env
BETTER_AUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=your-production-google-client-id
GOOGLE_CLIENT_SECRET=your-production-google-client-secret
LINE_CLIENT_ID=your-production-line-channel-id
LINE_CLIENT_SECRET=your-production-line-channel-secret
```

## Step 6: User Registration Flow

### 6.1 New User Registration
When a new user signs in with Google or LINE:
1. Better Auth automatically creates a user account
2. User information is populated from the OAuth provider
3. User is automatically signed in
4. User can access all services in the monorepo

### 6.2 Existing User Authentication
When an existing user signs in:
1. Better Auth links the OAuth account to existing user
2. User is signed in with their existing account
3. All user data and permissions are preserved

## Step 7: Monorepo Integration

### 7.1 API Service Authentication
Your API services can verify tokens:
```javascript
// In your API service
const response = await fetch('http://localhost:3000/api/auth/session', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 7.2 Frontend Application Authentication
Your frontend apps can check authentication status:
```javascript
// Check if user is authenticated
const session = await fetch('/api/auth/session').then(r => r.json());
if (session.user) {
  // User is authenticated
  console.log('User:', session.user);
} else {
  // User is not authenticated
  // Redirect to login
}
```

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check that callback URLs match exactly in provider settings
   - Ensure URLs use correct protocol (http/https)

2. **"Client ID not found"**
   - Verify environment variables are set correctly
   - Check that credentials are copied without extra spaces

3. **"Scope not authorized"**
   - Ensure required scopes are enabled in provider settings
   - Check that APIs are enabled in Google Cloud Console

4. **"User not found"**
   - Check that user has granted required permissions
   - Verify email permissions are enabled in LINE settings

### Debug Mode
Enable debug logging:
```env
LOG_LEVEL=debug
```

This will show detailed logs of the authentication flow.

## Security Considerations

1. **Keep secrets secure**: Never commit client secrets to version control
2. **Use HTTPS in production**: Always use HTTPS for production callbacks
3. **Validate tokens**: Always validate tokens on your API services
4. **Monitor usage**: Set up monitoring for authentication attempts
5. **Regular rotation**: Rotate client secrets regularly

## Next Steps

1. **Test thoroughly**: Test both Google and LINE authentication flows
2. **Integrate frontend**: Add login buttons to your frontend applications
3. **Update API services**: Ensure all API services can verify tokens
4. **Monitor production**: Set up monitoring and alerting
5. **Document for team**: Share this guide with your development team

Your Better Auth service is now configured for Google and LINE authentication! Users can register and authenticate using their social accounts, and the same authentication will work across all services in your monorepo.
