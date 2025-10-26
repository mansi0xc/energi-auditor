# Brisingr Setup Guide

## Environment Variables Setup

Create a `.env.local` file in the client directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here-change-this-in-production

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Gemini API Configuration (for smart contract auditing)
GEMINI_API_KEY=your-gemini-api-key-here

# Allowed email domain
ALLOWED_EMAIL_DOMAIN=@energi.team
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen:
   - Application name: "Brisingr Smart Contract Auditor"
   - Authorized domains: Add your domain
   - Scopes: email, profile, openid
6. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Authorized JavaScript origins: `http://localhost:3000` (for development)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
7. Copy the Client ID and Client Secret to your `.env.local` file

## Domain Restriction

The application is configured to only allow users with `@energi.team` email addresses. This is enforced in two ways:

1. **NextAuth callback**: Checks email domain during sign-in
2. **Environment variable**: `ALLOWED_EMAIL_DOMAIN` can be changed if needed

## Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key for Gemini
3. Add it to your `.env.local` file as `GEMINI_API_KEY`

Note: The system is designed to easily switch back to ChainGPT API when their endpoint becomes available - just update the `AUDIT_API_URL` in `functions/auditInit.ts`.

## NextAuth Secret

Generate a secure random string for `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (create `.env.local`)

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Authentication Flow

1. Users visit `/audit` and are redirected to `/auth/signin`
2. They click "Continue with Google"
3. Google OAuth consent screen appears
4. After successful authentication, email domain is checked
5. If email ends with `@energi.team`, user is signed in
6. If not, they're redirected to `/auth/error` with access denied message
7. Authenticated users can access the audit functionality

## Security Features

- ✅ Domain-restricted authentication (@energi.team only)
- ✅ Protected routes with middleware
- ✅ Secure session management
- ✅ CSRF protection (built into NextAuth)
- ✅ Input validation for contract code
- ✅ Error handling and user feedback

## Production Deployment

For production:

1. Update `NEXTAUTH_URL` to your production domain
2. Add production domain to Google OAuth settings
3. Use a secure `NEXTAUTH_SECRET`
4. Enable HTTPS
5. Consider rate limiting for API endpoints
