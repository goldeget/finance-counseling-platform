import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export async function isAdmin() {
  const user = await getChatGPTUser();
  const owner = (env as unknown as Record<string,string>).ADMIN_EMAIL?.trim().toLowerCase();
  return !!owner && !!user?.userId && user.email.trim().toLowerCase() === owner;
}
export function sameOrigin(request: Request) {
  const origin=request.headers.get('origin');
  return !!origin && origin===new URL(request.url).origin;
}
