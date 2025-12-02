"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { updateOccupancy } from "../../../../services/firestoreService";

type Status = "loading" | "success" | "error" | "unauth";

export default function GymExitPage() {
  const params = useParams<{ gymId: string }>();
  const router = useRouter();
  const gymId = params?.gymId as string | undefined;

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Çıkışınız işleniyor...");
  const [gymName, setGymName] = useState<string | null>(null);

  useEffect(() => {
    if (!gymId) {
      setStatus("error");
      setMessage("Geçersiz salon bağlantısı.");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("unauth");
        setMessage("Bu çıkış bağlantısını kullanmak için önce giriş yapmalısınız.");
        return;
      }

      try {
        const gymRef = doc(db, "gyms", gymId);
        const snap = await getDoc(gymRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          if (typeof data.name === "string") {
            setGymName(data.name);
          }
        }

        await updateOccupancy(gymId, "OUT", user.uid);

        setStatus("success");
        setMessage("Çıkışınız başarıyla kaydedildi. Görüşmek üzere! 👋");
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setMessage(err?.message || "Çıkış kaydedilirken bir hata oluştu.");
      }
    });

    return () => unsub();
  }, [gymId]);

  const goDashboard = () => router.push("/");
  const goLogin = () => router.push("/login");

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
      <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl text-center text-white">
        <h1 className="text-2xl font-bold mb-2">
          {gymName ? gymName : "Spor Salonu Çıkışı"}
        </h1>

        <p className="text-sm text-white/70 mb-6">{message}</p>

        {status === "loading" && (
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white/60" />
          </div>
        )}

        {status === "unauth" && (
          <button
            onClick={goLogin}
            className="w-full px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
          >
            Giriş Yap
          </button>
        )}

        {(status === "success" || status === "error") && (
          <button
            onClick={goDashboard}
            className="w-full px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold"
          >
            Ana Sayfaya Dön
          </button>
        )}

        <p className="mt-4 text-xs text-white/40">
          Bu sayfayı her açtığınızda, daha önce giriş yaptıysanız sistemdeki kişi sayınız bir azalır.
        </p>
      </div>
    </main>
  );
}