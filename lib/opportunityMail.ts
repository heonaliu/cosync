import { auth } from '@/lib/firebase';

// Asks app/api/opportunity-submitted to email the CoSync team about a new
// pending opportunity. The route reads everything it puts in the email
// (title, type, description, who submitted it) from the opportunity doc and
// the caller's verified sign-in token, so the only input here is which
// opportunity — see that route for why it's built that way.
export async function notifyTeamOfSubmission(opportunityId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in.');

  const response = await fetch('/api/opportunity-submitted', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ opportunityId }),
  });
  if (!response.ok) {
    const { error } = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(error ?? `Review email failed (${response.status}).`);
  }
}
