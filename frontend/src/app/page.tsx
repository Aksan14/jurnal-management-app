"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

export default function Home() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (accessToken) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [accessToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090b11]">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        <p className="text-gray-400 text-sm">Memuat halaman...</p>
      </div>
    </div>
  );
}
