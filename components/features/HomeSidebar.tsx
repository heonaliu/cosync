import { Avatar } from '@/components/ui/Avatar';

// Static placeholder content — there's no events collection and no
// follow-recommendation logic in the data model yet, so this sidebar is
// illustrative rather than a real Firestore read, unlike the main feed.
const EVENTS = [
  { name: 'MIT Hackathon', when: 'Sat', going: 42 },
  { name: 'AI club kickoff', when: 'Thu', going: 8 },
];

const SUGGESTIONS = [
  { name: 'Maya', interest: 'Hardware' },
  { name: 'Priya', interest: 'STEM' },
];

export function HomeSidebar() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">This week</h2>
        <ul className="flex flex-col gap-3">
          {EVENTS.map((event) => (
            <li key={event.name} className="flex flex-col">
              <span className="text-sm text-ink">{event.name}</span>
              <span className="text-xs text-sand">
                {event.when} · {event.going} going
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-ink">You might follow</h2>
        <ul className="flex flex-col gap-3">
          {SUGGESTIONS.map((person) => (
            <li key={person.name} className="flex items-center gap-3">
              <Avatar name={person.name} size="sm" decorative />
              <div className="flex flex-col">
                <span className="text-sm text-ink">{person.name}</span>
                <span className="text-xs text-sand">{person.interest}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
