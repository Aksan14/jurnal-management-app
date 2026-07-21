"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Mail } from "lucide-react";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Username dan password wajib diisi");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        username,
        password,
      });

      const { access_token, refresh_token, user } = response.data.data;
      setAuth(access_token, refresh_token, user);

      toast.success(`Selamat datang kembali, ${user.username}!`);
      router.push("/dashboard");
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Login gagal. Periksa username dan password Anda.";
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-background overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-primary/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[140px] pointer-events-none" />

      {/* Top bar with theme toggle */}
      <div className="relative z-10 flex justify-end px-6 pt-5">
        <ThemeToggle />
      </div>

      {/* Centered content */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border border-border/50 bg-card/90 backdrop-blur-xl shadow-2xl relative z-10 rounded-2xl">
          <CardHeader className="text-center pt-10 pb-5">
            {/* Logo — transparan di semua mode */}
            <div className="mx-auto mb-5 relative w-fit">
              {/* Blue ambient glow */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl scale-150 -z-10" />
              <Image
                src="/logo.png"
                alt="JAMS"
                width={200}
                height={200}
                className="object-contain mix-blend-multiply dark:[filter:invert(1)_hue-rotate(180deg)] dark:mix-blend-screen dark:drop-shadow-[0_0_28px_rgba(99,160,255,0.5)]"
                priority
              />
            </div>
            <CardDescription className="text-sm leading-relaxed font-medium tracking-wide uppercase text-muted-foreground/70">
              Sistem Informasi Manajemen Sekolah
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">Username atau Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="admin@jurnal.com"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="h-11 pl-10 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pl-10 rounded-xl text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 font-medium rounded-xl shadow-md transition-all duration-200 mt-1 text-sm"
              >
                {loading ? "Menghubungkan..." : "Masuk ke Sistem"}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="px-8 pt-5 pb-8 flex flex-col items-center gap-3">
            <div className="h-px w-full bg-border/50" />
            <p className="text-xs text-muted-foreground text-center">
              Punya masalah login? Hubungi administrator sekolah Anda.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
