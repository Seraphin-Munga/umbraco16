import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface NavModalProps {
  open: boolean;
  onClose: () => void;
}

interface TabPane {
  kind: 'personal' | 'business';
  label: string;
  accessOnlineBankingUrl: string;
  registerUrl: string;
}

// Same fixed tabs/URLs as the original static Register/Login block in
// Navigation.cshtml (lines 775-865) - no CMS property backs this content.
const TABS: TabPane[] = [
  {
    kind: 'personal',
    label: 'Personal',
    accessOnlineBankingUrl: 'https://ib.africanbank.co.za/',
    registerUrl: 'https://ib.africanbank.co.za/Modules/Subscription/Controls/AB/Onboarding/ABOnboarding.aspx',
  },
  {
    kind: 'business',
    label: 'Business',
    accessOnlineBankingUrl: 'https://qa.del.africanbank.co.za/apps/OnlineBaking',
    registerUrl: 'https://qa.del.africanbank.co.za/apps/OnlineBaking',
  },
];

export function NavModal({ open, onClose }: NavModalProps) {
  const [activeTab, setActiveTab] = useState(0);
  const tab = TABS[activeTab];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-3xl p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Register or log in</DialogTitle>
        </DialogHeader>

        <div className="flex border-b border-border">
          {TABS.map((t, index) => (
            <button
              key={t.kind}
              type="button"
              onClick={() => setActiveTab(index)}
              className={`flex-1 px-4 py-3 text-center text-sm transition-colors ${
                index === activeTab
                  ? 'font-bold text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 px-6 py-6">
          <p className="text-sm text-muted-foreground">
            To access your <b>{tab.kind}</b> online banking please proceed below
          </p>

          <a
            href={tab.accessOnlineBankingUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-bold text-brand-navy transition-transform hover:scale-[1.02]"
          >
            Access Online Banking
            <ArrowUpRight className="size-4 shrink-0" />
          </a>

          <a
            href={tab.registerUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-bold text-brand-navy transition-transform hover:scale-[1.02]"
          >
            Register
            <ArrowUpRight className="size-4 shrink-0" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
