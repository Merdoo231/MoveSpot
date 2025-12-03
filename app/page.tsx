"use client";

import React, { useEffect, useState } from "react";
import { onSnapshot } from "firebase/firestore";

import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
} from "firebase/firestore";

type UserProfile = {
  name?: string;
  salonName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  role?: "member" | "owner";
  createdAt?: Date;
};

type Gym = {
  id: string;
  name: string;
  currentCount: number;
  capacity: number;
};

export default function MainPage() {
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [gyms, setGyms] = useState<Gym[]>([]);
  const [gymsLoading, setGymsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setFirebaseUser(user);

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          setProfile({
            email: user.email ?? "",
          });
        }
      } catch (err) {
        console.error(err);
        setError("Profil bilgileri alınırken bir sorun oluştu.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!firebaseUser) return;

    setGymsLoading(true);

    const q = query(
      collection(db, "gyms"),
      where("memberIds", "array-contains", firebaseUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Gym[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any;
          return {
            id: docSnap.id,
            name: data.name ?? "Bilinmeyen Salon",
            currentCount:
              typeof data.currentCount === "number" ? data.currentCount : 0,
            capacity: typeof data.capacity === "number" ? data.capacity : 0,
          };
        });
        setGyms(list);
        setGymsLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Salon doluluk bilgileri alınırken bir sorun oluştu.");
        setGymsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firebaseUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("Çıkış yapılırken bir hata oluştu.");
    }
  };

  const displayName =
    profile?.salonName ||
    profile?.ownerName ||
    profile?.name ||
    firebaseUser?.email ||
    "Kullanıcı";

  const roleLabel =
    profile?.role === "owner"
      ? "Salon Sahibi"
      : profile?.role === "member"
      ? "Üye"
      : "Kullanıcı";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/60" />
          <p className="text-white/80 text-sm">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Top bar */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="/weight.png" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">
                MoveSpot
              </h1>
              <p className="text-sm text-white/70">Kişisel Kontrol Panelin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-white/80 font-medium">{displayName}</p>
              <p className="text-xs text-white/60">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium border border-white/10 transition"
            >
              Çıkış Yap
            </button>
          </div>
        </header>

        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-800/40 p-3 rounded">
            {error}
          </div>
        )}

        <section className="mb-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6 md:p-8 shadow-xl backdrop-blur-md">
            <h2 className="text-xl md:text-2xl font-semibold text-white mb-2">
              Hoş Geldin, {displayName}
            </h2>
            <p className="text-sm md:text-base text-white/70 max-w-2xl">
              Buradan profil bilgilerini görüntüleyebilir, üyelik durumunu
              inceleyebilir ve spor salonu girişlerinle ilgili bilgileri takip
              edebilirsin.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
            <h3 className="text-white font-semibold mb-3">Profil Özeti</h3>
            <div className="space-y-1 text-sm text-white/80">
              <p>
                <span className="text-white/50">Ad / Salon: </span>
                {profile?.salonName ||
                  profile?.ownerName ||
                  profile?.name ||
                  "-"}
              </p>
              <p>
                <span className="text-white/50">Rol: </span>
                {roleLabel}
              </p>
              <p>
                <span className="text-white/50">E-posta: </span>
                {profile?.email || firebaseUser?.email || "-"}
              </p>
              <p>
                <span className="text-white/50">Telefon: </span>
                {profile?.phone || "-"}
              </p>
            </div>
            <button
              type="button"
              className="mt-4 w-full px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition"
            >
              Profil Bilgilerini Düzenle (yakında)
            </button>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
            <h3 className="text-white font-semibold mb-3">Aktivite Durumu</h3>
            <p className="text-sm text-white/70 mb-4">
              Buraya ileride üyelik hareketlerin, rezervasyonların veya
              istatistiklerin gelebilir.
            </p>
            <ul className="space-y-2 text-sm text-white/80">
              <li>• Son Giriş: az önce</li>
              <li>• Hesap Durumu: aktif</li>
              <li>• Bildirimler: 0 okunmamış</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
            <h3 className="text-white font-semibold mb-3">Hızlı İşlemler</h3>
            <div className="space-y-3">
        
              <button
                type="button"
                onClick={() => router.push("/map")}
                className="w-full px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition"
              >
                Harita Doluluk Oranı Görüntüle
              </button>

              <button
                type="button"
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
              >
                Yeni Rezervasyon 
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
              >
                Üyelik Paketlerini Görüntüle
              </button>
              <button
                type="button"
                className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
              >
                Destek ile İletişime Geç
              </button>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-lg">
              Daha Önce Giriş Yaptığın Spor Salonları
            </h3>
            {gymsLoading && (
              <span className="text-xs text-white/60">Yükleniyor...</span>
            )}
          </div>

          {gyms.length === 0 && !gymsLoading ? (
            <p className="text-sm text-white/60">
              Henüz giriş yaptığın bir spor salonu kaydı bulunmuyor.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {gyms.map((gym) => {
                const safeCount = Math.max(0, gym.currentCount);
                const safeCap = gym.capacity > 0 ? gym.capacity : null;
                const percentage =
                  safeCap && safeCap > 0
                    ? Math.min(100, Math.round((safeCount / safeCap) * 100))
                    : 0;

                return (
                  <div
                    key={gym.id}
                    className="rounded-2xl bg-white/5 border border-white/10 p-4 shadow-md backdrop-blur"
                  >
                    <p className="text-white font-medium mb-1">{gym.name}</p>
                    <p className="text-xs text-white/60 mb-2">
                      Anlık doluluk oranı
                    </p>

                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>

                    <p className="text-xs text-white/70">
                      {safeCap
                        ? `Doluluk: ${percentage}% (${safeCount}/${safeCap} kişi)`
                        : `Doluluk: ${percentage}% (${safeCount} kişi)`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-white/40">
          © 2025 MoveSpot — Tüm hakları saklıdır
        </p>
      </div>
    </main>
  );
}
