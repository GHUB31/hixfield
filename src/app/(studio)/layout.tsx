import { StudioNav } from "@/components/studio-nav";

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#000000]">
      <StudioNav />
      <main className="mx-auto max-w-[1440px] px-4 pb-36 pt-5 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
