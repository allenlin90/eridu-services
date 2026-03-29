import { defineMiddleware } from "astro:middleware";
import * as jose from 'jose'; 
import { CONFIG } from "./config/env";

const JWT_SECRET = new TextEncoder().encode(CONFIG.jwt.secret);

export const onRequest = defineMiddleware(async (context, next) => {
  // 1. Skip auth check for static assets (images, css, etc.)
  if (context.url.pathname.startsWith('/_astro/') || context.url.pathname.match(/\.(png|jpg|jpeg|gif|css|js|ico|svg)$/)) {
    return next();
  }

  // 2. Extract the token
  const token = context.cookies.get(CONFIG.jwt.cookieName)?.value || 
                context.request.headers.get("Authorization")?.replace("Bearer ", "");

  // 3. Fallback: If no token, redirect to login
  if (!token) {
    if (CONFIG.isDev) {
       console.warn("🔐 [DEV] Missing Auth Token. Bypassing strictly for local docs dev.");
       return next();
    }
    
    // Redirect unauthenticated user to Eridu Studios Login
    const loginUrl = new URL(CONFIG.urls.login);
    loginUrl.searchParams.set('redirect', context.url.href);
    return context.redirect(loginUrl.toString(), 302);
  }

  // 4. Validate the JWT
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    
    // Pass the decoded user payload to the Astro Locals object
    context.locals.user = payload;
    
    return next();
  } catch (error) {
    console.error("JWT Validation Failed", error);
    // Invalid token -> Clear cookie and redirect to login
    context.cookies.delete(CONFIG.jwt.cookieName);
    return context.redirect(CONFIG.urls.login, 302);
  }
});
