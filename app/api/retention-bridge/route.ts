import {env} from 'cloudflare:workers';
import {handleRetention} from '../../../lib/retention-bridge.mjs';
export const dynamic = 'force-dynamic';
const expectedHash = '587bf72b73845badd39b2ab7916d3fb1c94659f238897c9b0a8a9bee4a73ad6d';
export async function POST(request:Request){return handleRetention(request,env,expectedHash);}
