"use client";

import {  SetStateAction, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import {
  getHistory,
  getOccupancy,
  HistoryEntry,
} from "../../services/firestoreService";

type UserProfile = {
  name?: string;
  salonName?: string;
  ownerName?: string;
  email?: string;
  phone?: string;
  role?: "member" | "owner";
};

type GymSummary = {
  id: string;
  name: string;
};

type Status = "loading" | "ready" | "unauth";

type HourlyPoint = {
  hour: number;
  count: number;
};

export default function AdminPage() {
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const [gyms, setGyms] = useState<GymSummary[]>([]);
  const [gymsLoading, setGymsLoading] = useState(false);
  const [selectedGymId, setSelectedGymId] = useState<string>("");

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [currentCount, setCurrentCount] = useState<number>(0);
  const [capacity, setCapacity] = useState<number | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Çıkış hatası:", err);
      setError("Çıkış yapılırken bir hata oluştu.");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("unauth");
        setFirebaseUser(null);
        setProfile(null);
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
        setStatus("ready");
      } catch (err) {
        console.error(err);
        setError("Profil bilgileri alınırken bir hata oluştu.");
        setStatus("ready");
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (status !== "ready") return;

    setGymsLoading(true);
    const fetchGyms = async () => {
      try {
        const snap = await getDocs(collection(db, "gyms"));
        const arr: GymSummary[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            name: data.name ?? "Bilinmeyen Salon",
          };
        });
        setGyms(arr);

        if (arr.length > 0 && !selectedGymId) {
          setSelectedGymId(arr[0].id);
        }
      } catch (err) {
        console.error(err);
        setError("Salon listesi alınırken bir hata oluştu.");
      } finally {
        setGymsLoading(false);
      }
    };

    fetchGyms();
  }, [status, selectedGymId]);

  useEffect(() => {
    if (!selectedGymId) return;

    setHistoryLoading(true);

    const unsubscribeHistory = getHistory(
      selectedGymId,
      (entries: SetStateAction<HistoryEntry[]>) => {
        setHistory(entries);
        setHistoryLoading(false);
      },
      (err: any) => {
        console.error(err);
        setError("Geçmiş verisi alınırken bir hata oluştu.");
        setHistoryLoading(false);
      }
    );

    const unsubscribeOcc = getOccupancy(
      selectedGymId,
      (value: SetStateAction<number>) => {
        setCurrentCount(value);
      },
      (err: any) => {
        console.error(err);
        setError("Doluluk verisi alınırken bir hata oluştu.");
      }
    );

    const fetchCapacity = async () => {
      try {
        const snap = await getDoc(doc(db, "gyms", selectedGymId));
        if (snap.exists()) {
          const data = snap.data() as any;
          const cap =
            typeof data.capacity === "number" ? data.capacity : null;
          setCapacity(cap);
        } else {
          setCapacity(null);
        }
      } catch (err) {
        console.error(err);
        setError("Salon kapasite bilgisi alınırken bir hata oluştu.");
      }
    };

    fetchCapacity();

    return () => {
      unsubscribeHistory();
      unsubscribeOcc();
    };
  }, [selectedGymId]);

  const {
    todaysIn,
    todaysOut,
    netChange,
    busiestHourLabel,
    hourlySeries,
  } = useMemo(() => {
    if (history.length === 0) {
      return {
        todaysIn: 0,
        todaysOut: 0,
        netChange: 0,
        busiestHourLabel: "Veri yok",
        hourlySeries: [] as HourlyPoint[],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysEntries = history.filter((h) => {
      const d = new Date(h.timestamp);
      const d0 = new Date(d);
      d0.setHours(0, 0, 0, 0);
      return d0.getTime() === today.getTime();
    });

    const todaysIn = todaysEntries.filter((e) => e.type === "IN").length;
    const todaysOut = todaysEntries.filter((e) => e.type === "OUT").length;
    const netChange = todaysIn - todaysOut;

    const hourlyIn: Record<number, number> = {};
    todaysEntries.forEach((e) => {
      if (e.type !== "IN") return;
      const hour = e.timestamp.getHours();
      hourlyIn[hour] = (hourlyIn[hour] || 0) + 1;
    });

    let busiestHourLabel = "Veri yok";

    if (Object.keys(hourlyIn).length > 0) {
      let bestHour = 0;
      let bestCount = 0;
      for (const [hStr, count] of Object.entries(hourlyIn)) {
        const h = Number(hStr);
        if (count > bestCount) {
          bestCount = count;
          bestHour = h;
        }
      }

      const from = `${String(bestHour).padStart(2, "0")}:00`;
      const to = `${String((bestHour + 1) % 24).padStart(2, "0")}:00`;
      busiestHourLabel = `${from} - ${to} (Giriş: ${bestCount})`;
    }

    const hourlySeries: HourlyPoint[] = Object.entries(hourlyIn)
      .map(([hStr, count]) => ({
        hour: Number(hStr),
        count: count as number,
      }))
      .sort((a, b) => a.hour - b.hour);

    return {
      todaysIn,
      todaysOut,
      netChange,
      busiestHourLabel,
      hourlySeries,
    };
  }, [history]);

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

  const formatDateTime = (d: Date) =>
    new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);

  const maxHourlyCount =
    hourlySeries.length > 0
      ? Math.max(...hourlySeries.map((h) => h.count))
      : 0;

  if (status === "unauth") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
        <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-center text-white shadow-2xl">
          <h1 className="text-2xl font-bold mb-3">Yetkisiz Erişim</h1>
          <p className="text-sm text-white/70 mb-6">
            Admin paneline erişmek için önce giriş yapmalısınız.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
          >
            Giriş Yap
          </button>
        </div>
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/60" />
          <p className="text-white/80 text-sm">Yükleniyor...</p>
        </div>
      </main>
    );
  }

  const isOwner = profile?.role === "owner";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <img src="/weight.png" alt="Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-white text-2xl font-bold tracking-tight">
                moveSpot – Admin Paneli
              </h1>
              <p className="text-sm text-white/70">
                Giriş–çıkış istatistikleri ve doluluk analizi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm text-white/80 font-medium">{displayName}</p>
              <p className="text-xs text-white/60">{roleLabel}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-red-500/80 hover:bg-red-600 text-white text-sm font-medium border border-red-400/60 transition"
            >
              Çıkış Yap
            </button>
          </div>
        </header>

        {!isOwner && (
          <div className="mb-4 text-xs text-yellow-200 bg-yellow-900/30 border border-yellow-700/40 p-3 rounded">
            Bu panel salon sahipleri için tasarlanmıştır; şu an üye rolüyle
            görüntülüyorsunuz.
          </div>
        )}
        {error && (
          <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-800/40 p-3 rounded">
            {error}
          </div>
        )}

        {/* Salon seçimi */}
        <section className="mb-6 rounded-2xl bg-white/5 border border-white/10 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-white font-semibold text-lg mb-1">
                Spor Salonu Seçimi
              </h2>
              <p className="text-xs text-white/60">
                İstatistikleri görüntülemek için bir spor salonu seçin.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {gymsLoading && (
                <span className="text-xs text-white/60">
                  Salonlar yükleniyor...
                </span>
              )}

              <label htmlFor="gymSelect" className="text-xs text-white/70">
                Spor salonu seç:
              </label>

              <select
                id="gymSelect"
                value={selectedGymId}
                onChange={(e) => setSelectedGymId(e.target.value)}
                className="px-3 py-2 rounded-lg bg-black/30 border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {gyms.length === 0 ? (
                  <option value="">Salon bulunamadı</option>
                ) : (
                  gyms.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.id})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </section>

        {/* Üst 3 kart */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Anlık doluluk */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
            <h3 className="text-white font-semibold mb-2">Anlık Doluluk</h3>
            <p className="text-3xl font-bold text-white mb-1">
              {currentCount}
              {capacity ? ` / ${capacity}` : ""}
            </p>
            <p className="text-xs text-white/60 mb-3">
              Sistemde şu anda içeride görünen kişi sayısı.
            </p>

            {capacity && capacity > 0 && (
              <>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-1">
                  <div
                    className="h-full bg-indigo-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((currentCount / capacity) * 100)
                      )}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-white/70">
                  Doluluk oranı:{" "}
                  {Math.min(
                    100,
                    Math.round((currentCount / capacity) * 100)
                  )}
                  %
                </p>
              </>
            )}
          </div>

          {/* Bugünkü hareketler */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
            <h3 className="text-white font-semibold mb-2">
              Bugünkü Hareketler
            </h3>
            {historyLoading ? (
              <p className="text-sm text-white/60">Veriler yükleniyor...</p>
            ) : (
              <div className="space-y-1 text-sm text-white/80">
                <p>
                  <span className="text-white/50">Toplam Giriş: </span>
                  {todaysIn}
                </p>
                <p>
                  <span className="text-white/50">Toplam Çıkış: </span>
                  {todaysOut}
                </p>
                <p>
                  <span className="text-white/50">Net Değişim: </span>
                  {netChange >= 0 ? `+${netChange}` : netChange}
                </p>
              </div>
            )}
          </div>

          {/* En yoğun saat */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
            <h3 className="text-white font-semibold mb-2">En Yoğun Saat</h3>
            <p className="text-sm text-white/80 mb-2">{busiestHourLabel}</p>
            <p className="text-xs text-white/60">
              Bugünkü giriş hareketlerine göre hesaplanmıştır (sadece giriş
              sayıları baz alınır).
            </p>
          </div>
        </section>

        {/* Saatlik girişler bar chart */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg">
                Bugünkü Saatlik Girişler
              </h3>
              <p className="text-xs text-white/60">
                Her saat aralığı için kaç adet GİRİŞ işlemi yapıldığını gösterir.
              </p>
            </div>
          </div>

          {hourlySeries.length === 0 ? (
            <p className="text-sm text-white/60">
              Bugün için giriş kaydı bulunmuyor.
            </p>
          ) : (
            <div className="space-y-2">
              {hourlySeries.map(({ hour, count }) => {
                const width =
                  maxHourlyCount > 0
                    ? Math.round((count / maxHourlyCount) * 100)
                    : 0;

                return (
                  <div
                    key={hour}
                    className="flex items-center gap-3 text-xs text-white/80"
                  >
                    <div className="w-12 text-right font-mono">
                      {String(hour).padStart(2, "0")}:00
                    </div>
                    <div className="flex-1">
                      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-8 text-right">{count}</div>
                  </div>
                );
              })}

              <p className="mt-3 text-[11px] text-white/50">
                Çubuk uzunlukları, bugünkü en yoğun saate göre normalize
                edilmiştir.
              </p>
            </div>
          )}
        </section>

        {/* Geçmiş tablosu */}
        <section className="rounded-2xl bg-white/5 border border-white/10 p-5 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold text-lg">
                Giriş–Çıkış Geçmişi (Son 100 Kayıt)
              </h3>
              <p className="text-xs text-white/60">
                Zaman damgalı hareketler (gymLogs koleksiyonundan).
              </p>
            </div>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-white/60">
              Henüz bu salon için kayıtlı bir hareket bulunmuyor.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-white/80">
                <thead className="text-xs uppercase text-white/60 border-b border-white/10">
                  <tr>
                    <th className="py-2 pr-4">Zaman</th>
                    <th className="py-2 pr-4">Kullanıcı</th>
                    <th className="py-2 pr-4">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 50).map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-white/5 hover:bg-white/5 transition"
                    >
                      <td className="py-2 pr-4">
                        {formatDateTime(entry.timestamp)}
                      </td>
                      <td className="py-2 pr-4 text-xs">{entry.userId}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            entry.type === "IN"
                              ? "bg-emerald-500/20 text-emerald-200"
                              : "bg-rose-500/20 text-rose-200"
                          }`}
                        >
                          {entry.type === "IN" ? "GİRİŞ" : "ÇIKIŞ"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length > 50 && (
                <p className="mt-2 text-xs text-white/50">
                  Sadece son 50 kayıt gösterilmektedir (toplam {history.length}{" "}
                  kayıt).
                </p>
              )}
            </div>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-white/40">
          © 2025 moveSpot – Admin Paneli
        </p>
      </div>
    </main>
  );
}
