# Auth Service Package

This package provides React hooks and utilities for authentication with the Eridu auth service.

## Features (Phase 1)

- **Authentication**: Email/password login and signup
- **Session Management**: JWT token handling and session state
- **Password Management**: Forgot password and reset password
- **Email Verification**: Send and verify email addresses
- **Organization Management**: Create organizations, invite members, manage roles
- **Team Management**: Create teams and manage team members
- **Admin Features**: User impersonation, create/update/delete users
- **Magic Link**: Passwordless authentication via email

## Installation

```bash
pnpm add @eridu/auth-service
```

## Usage

### Setup Auth Provider

```tsx
import { AuthProvider } from "@eridu/auth-service/providers/auth-provider";

function App() {
  return (
    <AuthProvider baseURL="http://localhost:3000">
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### Authentication Hooks

#### Login

```tsx
import { useLogin } from '@eridu/auth-service/hooks/use-login';

function LoginForm() {
  const { login, loading, error } = useLogin();

  const handleSubmit = async (email: string, password: string) => {
    const result = await login({ email, password });
    if (result) {
      // User logged in successfully
    }
  };

  return (
    // Your login form JSX
  );
}
```

#### Signup

```tsx
import { useSignup } from '@eridu/auth-service/hooks/use-signup';

function SignupForm() {
  const { signup, loading, error } = useSignup();

  const handleSubmit = async (email: string, password: string, name: string) => {
    const result = await signup({ email, password, name });
    if (result) {
      // User signed up successfully
    }
  };

  return (
    // Your signup form JSX
  );
}
```

#### Password Reset

```tsx
import { usePasswordReset } from '@eridu/auth-service/hooks/use-password-reset';

function PasswordResetForm() {
  const { forgotPassword, resetPassword, loading, error } = usePasswordReset();

  const handleForgotPassword = async (email: string) => {
    const result = await forgotPassword({ email });
    if (result) {
      // Password reset email sent
    }
  };

  const handleResetPassword = async (token: string, password: string) => {
    const success = await resetPassword({ token, password });
    if (success) {
      // Password reset successfully
    }
  };

  return (
    // Your password reset form JSX
  );
}
```

#### Email Verification

```tsx
import { useEmailVerification } from '@eridu/auth-service/hooks/use-email-verification';

function EmailVerificationForm() {
  const { sendVerification, verifyEmail, loading, error } = useEmailVerification();

  const handleSendVerification = async (email: string) => {
    const result = await sendVerification({ email });
    if (result) {
      // Verification email sent
    }
  };

  const handleVerifyEmail = async (token: string) => {
    const success = await verifyEmail({ token });
    if (success) {
      // Email verified successfully
    }
  };

  return (
    // Your email verification form JSX
  );
}
```

#### Magic Link

```tsx
import { useMagicLink } from '@eridu/auth-service/hooks/use-magic-link';

function MagicLinkForm() {
  const { sendMagicLink, loading, error } = useMagicLink();

  const handleSubmit = async (email: string) => {
    const result = await sendMagicLink({ email });
    if (result) {
      // Magic link sent successfully
    }
  };

  return (
    // Your magic link form JSX
  );
}
```

### Session Management

```tsx
import { useSession } from "@eridu/auth-service/hooks/use-session";

function UserProfile() {
  const { session, token, loading, signout } = useSession();

  if (loading)
    return <div>Loading...</div>;
  if (!session)
    return <div>Not authenticated</div>;

  return (
    <div>
      <h1>
        Welcome,
        {session.name}
        !
      </h1>
      <p>
        Email:
        {session.email}
      </p>
      <p>
        Role:
        {session.role}
      </p>
      <button onClick={signout}>Sign Out</button>
    </div>
  );
}
```

### Organization Management

```tsx
import { useOrganization } from '@eridu/auth-service/hooks/use-organization';

function OrganizationManager() {
  const {
    createOrganization,
    inviteMember,
    acceptInvitation,
    loading,
    error
  } = useOrganization();

  const handleCreateOrg = async (name: string, slug: string) => {
    const org = await createOrganization({ name, slug });
    if (org) {
      // Organization created successfully
    }
  };

  const handleInvite = async (email: string, role: string, orgId: string) => {
    const invitation = await inviteMember({ email, role, organizationId: orgId });
    if (invitation) {
      // Invitation sent successfully
    }
  };

  return (
    // Your organization management JSX
  );
}
```

### Admin Features

```tsx
import { useAdmin } from '@eridu/auth-service/hooks/use-admin';

function AdminPanel() {
  const {
    impersonate,
    stopImpersonating,
    createUser,
    updateUser,
    deleteUser,
    loading,
    error
  } = useAdmin();

  const handleImpersonate = async (userId: string) => {
    const result = await impersonate(userId);
    if (result) {
      // Now impersonating user
    }
  };

  const handleCreateUser = async (email: string, password: string, name: string) => {
    const user = await createUser({ email, password, name, role: 'user' });
    if (user) {
      // User created successfully
    }
  };

  return (
    // Your admin panel JSX
  );
}
```

## Types

The package exports comprehensive TypeScript types:

- `User`: User information
- `Session`: Current session data including JWT payload
- `Organization`: Organization data
- `Team`: Team data
- `Member`: Organization membership
- `Invitation`: Organization invitation
- `Role`: User roles ('admin' | 'user' | 'owner' | 'member')

## API Endpoints

The package includes predefined API endpoints that match the auth service:

- Authentication: `/api/auth/sign-in`, `/api/auth/sign-up`
- Session: `/api/auth/session`, `/api/auth/token`
- Password Management: `/api/auth/forgot-password`, `/api/auth/reset-password`
- Email Verification: `/api/auth/send-verification`, `/api/auth/verify-email`
- Magic Link: `/api/auth/sign-in/magic-link`
- Organization: `/api/auth/organization/*`
- Team: `/api/auth/team/*`
- Admin: `/api/auth/admin/*`

## Configuration

The auth service expects the following environment variables on the server:

- `BETTER_AUTH_URL`: Base URL for the auth service
- `BETTER_AUTH_SECRET`: Secret key for JWT signing
- `DATABASE_URL`: PostgreSQL database connection string

## Error Handling

All hooks include error handling and loading states. Errors are automatically captured and can be accessed via the `error` property returned by each hook.

## Phase 2 Roadmap

Future features planned for Phase 2:

- **SSO Integration**: Google, Microsoft, GitHub OAuth
- **SAML Support**: Enterprise SAML SSO
- **Multi-Factor Authentication**: TOTP, SMS, Email codes
- **Advanced Security**: Device trust, risk-based authentication
