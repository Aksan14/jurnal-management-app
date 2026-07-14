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
import { GraduationCap, Lock, Mail } from "lucide-react";
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
        <Card className="w-full max-w-105 border border-border/50 bg-card/80 backdrop-blur-xl shadow-2xl relative z-10">
          <CardHeader className="space-y-3 text-center pt-10 pb-6">
            <div className="mx-auto bg-primary/10 w-20 h-20 rounded-2xl flex items-center justify-center border border-primary/20 mb-1 shadow-inner">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">Jurnal Apps</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                Sistem Informasi Manajemen Sekolah Terintegrasi
              </CardDescription>
            </div>
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
