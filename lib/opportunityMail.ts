import { addDoc, collection } from 'firebase/firestore';

import { db } from '@/lib/firebase';

const TEAM_INBOX = 'mailcosync@gmail.com';

// Firestore console's data-view deep link — jumps straight to a single
// document. `~2F` is the extension's own encoding for the `/` in the
// document path (a literal `/` there would be read as a URL segment
// separator instead). Only works once the "Trigger Email from Firestore"
// extension's admin actually has Firestore console access on this project,
// which is the same person who'll be approving these by hand today (there's
// no in-app admin/approve UI yet).
function firestoreConsoleLink(opportunityId: string): string {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  return `https://console.firebase.google.com/project/${projectId}/firestore/databases/-default-/data/~2Fopportunities~2F${opportunityId}`;
}

type SubmissionNotice = {
  opportunityId: string;
  title: string;
  type: string;
  submitterName: string;
  /** Firebase Auth's `user.email` — may be null for an account that never
   * granted an email scope. The notice still sends without it; the admin
   * just won't have a reply-to address to work with for that one. */
  submitterEmail: string | null;
};

// Writes a doc into the `mail` collection the "Trigger Email from
// Firestore" extension watches — see firestore.rules' `match /mail/{mailId}`
// for why this collection can only ever be addressed to TEAM_INBOX. The
// extension itself (Firebase Console → Extensions) is what actually sends
// this over SMTP; this function's only job is to queue the doc.
export async function notifyTeamOfSubmission(notice: SubmissionNotice): Promise<void> {
  await addDoc(collection(db, 'mail'), {
    to: [TEAM_INBOX],
    message: {
      subject: `New opportunity to review: ${notice.title}`,
      text: [
        `${notice.submitterName} (${notice.submitterEmail ?? 'no email on file'}) submitted a new ${notice.type} opportunity for CoSync:`,
        '',
        notice.title,
        '',
        `Review and approve or reject it here: ${firestoreConsoleLink(notice.opportunityId)}`,
        '',
        `(Edit the opportunity's moderationStatus field to "approved" or "rejected".)`,
      ].join('\n'),
    },
  });
}
