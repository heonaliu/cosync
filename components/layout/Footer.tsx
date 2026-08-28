import { PageContainer } from '@/components/layout/PageContainer';

export function Footer() {
  return (
    <footer className="border-t border-olive">
      <PageContainer className="flex flex-wrap items-center justify-between gap-2 py-4 text-xs text-sand">
        <span>© 2026 CoSync</span>
        <a
          href="mailto:mailcosync@gmail.com"
          className="rounded-pill hover:text-oak focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fresh"
        >
          Feedback / Contact us
        </a>
      </PageContainer>
    </footer>
  );
}
