import { StudioNav } from "@/components/studio-nav";
import { KeysBanner } from "@/components/keys-banner";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh lg:pl-56">
      <StudioNav />
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        <KeysBanner />
        {children}
      </main>
    </div>
  );
}
