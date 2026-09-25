"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import CommunityFeed from "@/components/CommunityFeed";
import { Code2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SocialFeedPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      if (session?.user) {
        setUserId(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-inter">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link 
              href="/dashboard" 
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1.5 mb-2 transition-colors"
            >
              <ArrowLeft size={13} /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5">
              <Code2 className="text-indigo-500" /> Developer Community
            </h1>
            <p className="text-sm text-gray-400 mt-1">Connect with developers, share snippets, and join live coding jams</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-500">Loading community...</div>
        ) : (
          <CommunityFeed currentUserId={userId} />
        )}
      </main>
    </div>
  );
}
