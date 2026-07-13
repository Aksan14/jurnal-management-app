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
    <div className="relative min-h-screen flex items-center justify-center bg-[#090b11] overflow-hidden px-4">
      {/* Background glowing gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-md bg-[#111420]/80 border-border/40 backdrop-blur-xl shadow-2xl relative z-10">
        <CardHeader className="space-y-2 text-center pt-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center border border-primary/20 mb-2">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">Jurnal Apps</CardTitle>
          <CardDescription className="text-gray-400">
            Sistem Informasi Manajemen Sekolah Terintegrasi
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-300">Username atau Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="username"
                  placeholder="admin@jurnal.com"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 bg-[#161a2b] border-border/30 text-white placeholder-gray-500 focus:border-primary/50"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-gray-300">Password</Label>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  placeholder="••••••••"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-[#161a2b] border-border/30 text-white placeholder-gray-500 focus:border-primary/50"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/95 text-white font-medium py-2.5 rounded-lg shadow-lg hover:shadow-primary/20 transition-all duration-200 mt-2"
            >
              {loading ? "Menghubungkan..." : "Masuk ke Sistem"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pb-8 pt-4 text-center">
          <p className="text-xs text-gray-500 w-full">
            Punya masalah login? Hubungi administrator sekolah Anda.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
