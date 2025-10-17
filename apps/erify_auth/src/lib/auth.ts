import packageJson from "$/package.json" with { type: "json" };
import type { ExtendedUser } from '@/lib/types';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import {
  admin,
  apiKey,
  bearer,
  jwt,
  magicLink,
  multiSession,
  openAPI,
  organization,
} from 'better-auth/plugins';
// import { sso } from '@better-auth/sso'; // Disabled for Phase 1

import env from '@/env';
import { db } from '@/db';

export const auth = betterAuth({
  appName: packageJson.name,
  basePath: '/api/auth',
  baseURL: env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: 'pg',
  }),
  secret: env.BETTER_AUTH_SECRET,
  session: {},
  trustedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4173',
    'http://localhost:5173',
  ], // TODO: add client app hosts
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: true,
    },
  },
  advanced: {
    cookiePrefix: 'eridu_auth',
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    disableSignUp: false, // Allow email/password signup for Phase 1
    requireEmailVerification: true, // Enable email verification for Phase 1
    sendResetPassword: async (data) => {
      // TODO: send reset password email
      console.log('Password reset requested for:', data.user.email);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async (data) => {
      if (data.user.emailVerified) {
        return; // does nothing if the user has verified email
      }
      // TODO: send verification email to user after signup
      console.log('Email verification needed for:', data.user.email);
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'user',
        required: false,
        returned: true,
        input: false,
      },
    },
    changeEmail: {
      enabled: true,
      requireEmailVerification: true,
      sendChangeEmailVerification: async (data, _request) => {
        // TODO: verification email must be sent to the current user email to approve the change
        // if the current email isn't verified, the change happens immediately without verification
      },
    },
  },
  plugins: [
    admin(),
    apiKey(),
    bearer(),
    jwt({
      jwt: {
        expirationTime: '15m',
        definePayload: async ({ user, session }) => {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            activeOrganizationId: session.activeOrganizationId,
            activeTeamId: session.activeTeamId,
            impersonatedBy: session.impersonatedBy,
          };
        },
      },
    }),
    magicLink({
      sendMagicLink: async (data, _request) => {
        // TODO: send magic link
      },
    }),
    multiSession(),
    openAPI(),
    organization({
      allowUserToCreateOrganization: (user) => {
        return (user as ExtendedUser).role === 'admin';
      },
      cancelPendingInvitationsOnReInvite: true,
      creatorRole: 'admin',
      sendInvitationEmail: async (_data) => {
        // TODO: send invitation email
      },
      teams: {
        enabled: true,
        maximumTeams: 10,
        allowRemovingAllTeams: false,
      },
    }),
    // SSO plugin disabled for Phase 1 - email/password only
    // Uncomment and configure when ready for OIDC/SAML
    // sso({
    //   defaultSSO: [
    //     // SAML provider example (ready for enterprise clients)
    //     // {
    //     //   domain: 'company.com',
    //     //   providerId: 'saml-provider',
    //     //   samlConfig: {
    //     //     issuer: env.SAML_ISSUER!,
    //     //     entryPoint: env.SAML_ENTRY_POINT!,
    //     //     cert: env.SAML_CERT!,
    //     //     callbackUrl: `${env.BETTER_AUTH_URL}/api/auth/sso/saml2/callback/saml-provider`,
    //     //     spMetadata: {
    //     //       entityID: `${env.BETTER_AUTH_URL}/api/auth/sso/saml2/sp/metadata/saml-provider`,
    //     //     },
    //     //   },
    //     // },
    //   ],
    //   organizationProvisioning: {
    //     disabled: false,
    //     defaultRole: 'member',
    //   },
    //   trustEmailVerified: true,
    //   providersLimit: 10,
    //   disableImplicitSignUp: false,
    // }),
  ],
});
