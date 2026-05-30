import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function GET() {
  // Generate 32 bytes of cryptographically secure random values
  const challengeBuffer = crypto.randomBytes(32);
  const challengeBase64Url = challengeBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Mock a user registration or verification configuration
  const userIdBuffer = crypto.randomBytes(16);
  const userIdBase64Url = userIdBuffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return NextResponse.json({
    challenge: challengeBase64Url,
    rp: {
      name: 'Nexify Terminal',
      id: 'localhost' // In real PWA deployments, this matches the hostname
    },
    user: {
      id: userIdBase64Url,
      name: 'admin@nexify.internal',
      displayName: 'Nexify Administrator'
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 }, // ES256
      { type: 'public-key', alg: -257 } // RS256
    ],
    timeout: 60000,
    attestation: 'none'
  });
}
