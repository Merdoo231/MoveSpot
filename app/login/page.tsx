"use client";

import React, { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

type UserRole = "member" | "owner" | undefined;

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const handleSub = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErr("");

    if (!email.trim() || !password) {
      setErr("E-posta ve şifre alanları boş bırakılamaz");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      if (remember) {
        localStorage.setItem("rememberedEmail", email.trim());
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const userRef = doc(db, "users", userCredential.user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as any;
        const role = data.role as UserRole;
        console.log("Kullanıcı verisi:", data);

        if (role === "owner") {
          router.push("/admin");
        } else {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    } catch (error: any) {
      console.error("Giriş hatası:", error);

      let message = "Giriş yapılırken bir hata oluştu.";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password"
      ) {
        message = "E-posta veya şifre hatalı.";
      } else if (error.code === "auth/user-not-found") {
        message = "Bu e-posta ile kayıtlı kullanıcı bulunamadı.";
      } else if (error.code === "auth/too-many-requests") {
        message =
          "Çok fazla başarısız deneme yaptınız. Lütfen daha sonra tekrar deneyin.";
      }

      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
      <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-md border border-white/10">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/60" />
              <span className="text-white/80 text-sm">
                Giriş yapılıyor, lütfen bekleyin...
              </span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="hidden lg:block bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center">
            <div className="h-full w-full bg-gradient-to-tr from-indigo-900/40 to-transparent flex items-end p-8">
              <div className="text-white">
                <h3 className="text-2xl font-semibold">Hoşgeldiniz!</h3>
                <p className="mt-2 text-sm text-white/90 max-w-xs">
                  Güvenli ve hızlı erişim — hesabınıza giriş yapın veya yeni hesap
                  oluşturun.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full p-8 md:p-12">
            <div className="flex items-center gap-3 mb-6">
              <img src="/weight.png" alt="Logo" className="w-10 h-10" />
              <div>
                <h1 className="text-white text-2xl font-bold tracking-tight">
                  MoveSpot
                </h1>
                <p className="text-sm text-white/70">
                  Hesabınıza güvenli giriş yapın
                </p>
              </div>
            </div>

            {err && (
              <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-800/40 p-3 rounded">
                {err}
              </div>
            )}

            <form onSubmit={handleSub} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm text-white/80 mb-1"
                >
                  E-posta
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm text-white/80 mb-1"
                >
                  Şifre
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Gizli şifreniz"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between text-sm text-white/80">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="remember"
                    className="w-4 h-4 rounded bg-white/5 border-white/20"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Beni Hatırla</span>
                </label>

                <a className="hover:underline" href="#">
                  Şifremi Unuttum?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Giriş Yap
              </button>

              <div className="flex items-center gap-3 text-sm text-white/60">
                <span className="flex-1 border-t border-white/10" />
                <span className="whitespace-nowrap">veya sosyal hesapla</span>
                <span className="flex-1 border-t border-white/10" />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-5 h-5"
                    aria-hidden
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.8 0 6.4 1.6 7.9 2.9l5.8-5.6C36.3 3.7 30.8 1.5 24 1.5 14.9 1.5 7.6 6.7 3.7 13.6l6 4.7C12.7 13.4 17.8 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.5 24c0-1.5-.1-2.7-.4-3.9H24v7.4h12.7c-.6 3.1-2.9 6-6.3 7.8l6 4.7C43.6 36.8 46.5 30.9 46.5 24z"
                    />
                  </svg>
                  Google ile Giriş
                </button>

                <button
                  type="button"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white flex items-center justify-center gap-2"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    aria-hidden
                  >
                    <path
                      d="M22 2H2v20h20V2zM8.3 17H5.6V9.6h2.7V17zM7 8.3C6 8.3 5.2 7.4 5.2 6.3 5.2 5.2 6 4.3 7 4.3s1.8.9 1.8 2c0 1.1-.8 2-1.8 2zM18.4 17h-2.7v-4c0-1-.4-1.7-1.3-1.7-.7 0-1.1.5-1.3 1-.1.2-.1.5-.1.8V17h-2.7V9.6h2.7v1c.4-.6 1.1-1.4 2.8-1.4 2 0 3.5 1.3 3.5 4.1V17z"
                      fill="#1877F2"
                    />
                  </svg>
                  Facebook ile Giriş
                </button>
              </div>

              <p className="text-center text-sm text-white/60">
                Hesabın yok mu?{" "}
                <a
                  href="/register"
                  className="text-indigo-300 hover:underline"
                >
                  Kayıt Ol
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-white/40">
        © 2025 MoveSpot — Tüm hakları saklıdır
      </p>
    </main>
  );
}