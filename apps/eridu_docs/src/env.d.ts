/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface DocsUser {
  id: string;
  name: string;
  email: string;
  image?: string;
}

declare namespace App {
  interface Locals {
    user?: DocsUser;
  }
}
