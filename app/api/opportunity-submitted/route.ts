import { createRemoteJWKSet, jwtVerify } from 'jose';
import nodemailer from 'nodemailer';

// Emails the CoSync team when someone submits an opportunity for review.
// Replaces the "Trigger Email from Firestore" extension, which needs the
// paid Blaze plan — this runs as a plain Vercel serverless function instead
// and sends through the team Gmail account with an app password.
//
// It can't be used as an open relay: the recipient is fixed, the caller
// must send a valid Firebase ID token, and the email's contents come from
// the opportunity document itself (read as the caller, so Firestore's own
// rules apply), never from the request body. The only thing a caller
// chooses is which of their own pending opportunities to announce.

export const runtime = 'nodejs';

const TEAM_INBOX = 'cosync.mail@gmail.com';
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';

// Google's published signing keys for Firebase Auth ID tokens. jose caches
// them between requests, so this isn't a fetch per email.
const firebaseKeys = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com')
);

type FirestoreFields = Record<string, { stringValue?: string } | undefined>;

function field(fields: FirestoreFields, name: string): string {
  return fields[name]?.stringValue ?? '';
}

function firestoreConsoleLink(opportunityId: string): string {
  return `https://console.firebase.google.com/project/${PROJECT_ID}/firestore/databases/-default-/data/~2Fopportunities~2F${opportunityId}`;
}

export async function POST(request: Request): Promise<Response> {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailAppPassword || !PROJECT_ID) {
    console.error('Opportunity email not sent: GMAIL_USER / GMAIL_APP_PASSWORD / project id not configured.');
    return Response.json({ error: 'Email is not configured.' }, { status: 500 });
  }

  const idToken = request.headers.get('authorization')?.replace(/^Bearer /, '');
  if (!idToken) return Response.json({ error: 'Not signed in.' }, { status: 401 });

  let uid: string;
  let submitterName: string;
  let submitterEmail: string | null;
  try {
    const { payload } = await jwtVerify(idToken, firebaseKeys, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    if (!payload.sub) throw new Error('Token has no subject.');
    uid = payload.sub;
    submitterName = typeof payload.name === 'string' ? payload.name : 'Someone';
    submitterEmail = typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return Response.json({ error: 'Invalid sign-in token.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { opportunityId?: unknown } | null;
  const opportunityId = typeof body?.opportunityId === 'string' ? body.opportunityId : '';
  if (!/^[A-Za-z0-9]{1,64}$/.test(opportunityId)) {
    return Response.json({ error: 'Missing opportunity id.' }, { status: 400 });
  }

  // Firestore REST, authenticated as the caller — the opportunities read
  // rule lets a poster read their own pending post, and nobody else's.
  const docResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/opportunities/${opportunityId}`,
    { headers: { Authorization: `Bearer ${idToken}` }, cache: 'no-store' }
  );
  if (!docResponse.ok) return Response.json({ error: 'Opportunity not found.' }, { status: 404 });
  const fields = ((await docResponse.json()) as { fields?: FirestoreFields }).fields ?? {};

  if (field(fields, 'posterUid') !== uid || field(fields, 'moderationStatus') !== 'pending') {
    return Response.json({ error: 'Not your pending opportunity.' }, { status: 403 });
  }

  const title = field(fields, 'title') || 'Untitled opportunity';
  const type =
    field(fields, 'type') === 'other' ? field(fields, 'customType') || 'other' : field(fields, 'type') || 'opportunity';
  const description = field(fields, 'description');

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
  });

  try {
    await transporter.sendMail({
      from: `CoSync <${gmailUser}>`,
      to: TEAM_INBOX,
      replyTo: submitterEmail ?? undefined,
      subject: `New opportunity to review: ${title}`,
      text: [
        `${submitterName} (${submitterEmail ?? 'no email on file'}) submitted a new ${type} opportunity for CoSync:`,
        '',
        title,
        '',
        description,
        '',
        `Review and approve or reject it here: ${firestoreConsoleLink(opportunityId)}`,
        '',
        `(Edit the opportunity's moderationStatus field to "approved" or "rejected".)`,
      ].join('\n'),
    });
  } catch (error) {
    console.error('Failed to send opportunity email:', error);
    return Response.json({ error: 'Could not send email.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
