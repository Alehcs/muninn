import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useTimeTheme } from "@/features/theme/useTimeTheme";
import type { View } from "@/app/navigation";

interface MainLayoutProps {
  view: View;
  onNavigate: (view: View) => void;
  children: ReactNode;
}

export default function MainLayout({
  view,
  onNavigate,
  children,
}: MainLayoutProps) {
  const { preference, setPreference, style } = useTimeTheme();

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-bg text-text"
      style={style}
    >
      <Sidebar view={view} onNavigate={onNavigate} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          view={view}
          preference={preference}
          onPreferenceChange={setPreference}
        />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
