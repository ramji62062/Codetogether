"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getInitials } from "@/lib/utils";

type NavUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
};

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<NavUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id, name, avatar_url, email")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;
      setUser({
        id: session.user.id,
        email: session.user.email ?? null,
        name: profile?.name ?? null,
        avatar_url: profile?.avatar_url ?? null,
      });
      setLoading(false);
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const displayName = useMemo(() => user?.name || user?.email || "User", [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="text-xl font-black tracking-tight text-black sm:text-2xl">
          Code<span className="text-black">Together</span>
        </Link>

        {loading ? (
          <div className="h-9 w-28 animate-pulse rounded-lg bg-gray-200" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-xs font-bold text-white">
              {getInitials(displayName)}
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg border border-black bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-100"
            >
              Dashboard →
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-black transition-all duration-200 hover:border-black hover:bg-gray-50"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-gray-800"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
