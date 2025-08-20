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
    disableSignUp: env.DISABLE_SIGNUP,
    // requireEmailVerification: true, // TODO: enable when send verification email is enabled
    sendResetPassword: async (data) => {
      // TODO: send reset password email
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
  ],
});
