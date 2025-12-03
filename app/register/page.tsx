"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc, collection } from "firebase/firestore";

type OwnerForm = {
  salonName: string;
  ownerName: string;
  email: string;
  phone: string;
  setupCode: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

type MemberForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
};

export default function RegisterPage() {
  const router = useRouter();

  const [tab, setTab] = useState<"member" | "owner">("member");

  const [member, setMember] = useState<MemberForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [owner, setOwner] = useState<OwnerForm>({
    salonName: "",
    ownerName: "",
    email: "",
    phone: "",
    setupCode: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value: string) => /^\S+@\S+\.\S+$/.test(value.trim());

  const OWNER_SETUP_CODE = "SALON-2025-KEY";

  const handleMemberSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!member.name.trim() || !member.email.trim() || !member.password) {
      setError("Lütfen tüm zorunlu alanları doldurun.");
      return;
    }
    if (!validateEmail(member.email)) {
      setError("Geçerli bir e-posta girin.");
      return;
    }
    if (member.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (member.password !== member.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (!member.acceptTerms) {
      setError("Kayıt olmak için koşulları kabul etmelisiniz.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        member.email,
        member.password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: "member",
        createdAt: new Date(),
      });

      console.log("Üye kaydı başarılı:", userCredential.user.uid);
      router.push("/login");
    } catch (error: any) {
      console.error(error);
      setError("Kayıt hatası: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOwnerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (
      !owner.salonName.trim() ||
      !owner.ownerName.trim() ||
      !owner.email.trim() ||
      !owner.password ||
      !owner.setupCode.trim()
    ) {
      setError("Lütfen tüm zorunlu alanları doldurun (kurulum şifresi dahil).");
      return;
    }
    if (!validateEmail(owner.email)) {
      setError("Geçerli bir e-posta girin.");
      return;
    }
    if (owner.password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır.");
      return;
    }
    if (owner.password !== owner.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    if (!owner.acceptTerms) {
      setError("Kayıt olmak için koşulları kabul etmelisiniz.");
      return;
    }

    if (owner.setupCode.trim() !== OWNER_SETUP_CODE) {
      setError(
        "Kurulum şifresi hatalı. Lütfen doğru şifreyi girin veya yetkili ile iletişime geçin."
      );
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        owner.email,
        owner.password
      );
      const uid = userCredential.user.uid;

      const gymsColRef = collection(db, "gyms");
      const gymDocRef = doc(gymsColRef);  

      const initialCapacity = 50; 

      await setDoc(gymDocRef, {
        name: owner.salonName,
        capacity: initialCapacity,
        currentCount: 0,
        memberIds: [],
        ownerId: uid,    
        createdAt: new Date(),
      });

      await setDoc(doc(db, "users", uid), {
        salonName: owner.salonName,
        ownerName: owner.ownerName,
        email: owner.email,
        phone: owner.phone,
        role: "owner",
        gymId: gymDocRef.id,   
        createdAt: new Date(),
      });

      console.log("Salon sahibi + gym oluşturuldu:", {
        userId: uid,
        gymId: gymDocRef.id,
      });

      router.push("/login");
    } catch (error: any) {
      console.error(error);
      setError("Kayıt hatası: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-900 to-sky-800 p-6">
      <div className="relative w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl bg-white/5 backdrop-blur-md border border-white/10">
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white/60" />
              <span className="text-white/80 text-sm">İşleminiz işleniyor...</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="hidden lg:block bg-[url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200')] bg-cover bg-center">
            <div className="h-full w-full bg-gradient-to-tr from-indigo-900/40 to-transparent flex items-end p-8">
              <div className="text-white">
                <h3 className="text-2xl font-semibold">Topluluğumuza Katıl</h3>
                <p className="mt-2 text-sm text-white/90 max-w-xs">
                  İster bir salon sahibi olun, ister bir üye — güçlü bir profil oluşturun.
                </p>
              </div>
            </div>
          </div>

          <div className="w-full p-6 md:p-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img src="/weight.png" alt="Logo" className="w-10 h-10" />
                <div>
                  <h1 className="text-white text-2xl font-bold tracking-tight">
                    MyCoolWebsite
                  </h1>
                  <p className="text-sm text-white/70">Hesap oluştur</p>
                </div>
              </div>

              <div className="rounded-lg bg-white/5 p-1 flex items-center">
                <button
                  type="button"
                  onClick={() => {
                    setTab("member");
                    setError("");
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    tab === "member"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  Üye
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTab("owner");
                    setError("");
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    tab === "owner"
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-white/80 hover:bg-white/10"
                  }`}
                >
                  Salon Sahibi
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-800/40 p-3 rounded">
                {error}
              </div>
            )}

            {tab === "member" ? (
              // ÜYE FORMU
              <form onSubmit={handleMemberSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-1">İsim</label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) =>
                      setMember({ ...member, name: e.target.value })
                    }
                    placeholder="Adınız Soyadınız"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    E-posta
                  </label>
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) =>
                      setMember({ ...member, email: e.target.value })
                    }
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={member.phone}
                    onChange={(e) =>
                      setMember({ ...member, phone: e.target.value })
                    }
                    placeholder="+90 5xx xxx xx xx"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/80 mb-1">
                      Şifre
                    </label>
                    <input
                      type="password"
                      value={member.password}
                      onChange={(e) =>
                        setMember({ ...member, password: e.target.value })
                      }
                      placeholder="En az 6 karakter"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/80 mb-1">
                      Şifre (Tekrar)
                    </label>
                    <input
                      type="password"
                      value={member.confirmPassword}
                      onChange={(e) =>
                        setMember({
                          ...member,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Şifreyi tekrar girin"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={member.acceptTerms}
                    onChange={(e) =>
                      setMember({
                        ...member,
                        acceptTerms: e.target.checked,
                      })
                    }
                    className="w-4 h-4 rounded bg-white/5 border-white/20"
                  />
                  <span>
                    Kullanım koşullarını ve gizlilik politikasını kabul ediyorum
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition disabled:opacity-60"
                >
                  Kayıt Ol (Üye)
                </button>

                <p className="text-center text-sm text-white/60">
                  Zaten hesabın var mı?{" "}
                  <a href="/login" className="text-indigo-300 hover:underline">
                    Giriş Yap
                  </a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleOwnerSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    Salon Adı
                  </label>
                  <input
                    type="text"
                    value={owner.salonName}
                    onChange={(e) =>
                      setOwner({ ...owner, salonName: e.target.value })
                    }
                    placeholder="Salonunuzun adı"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    Salon Sahibi
                  </label>
                  <input
                    type="text"
                    value={owner.ownerName}
                    onChange={(e) =>
                      setOwner({ ...owner, ownerName: e.target.value })
                    }
                    placeholder="İsim Soyisim"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/80 mb-1">
                      E-posta
                    </label>
                    <input
                      type="email"
                      value={owner.email}
                      onChange={(e) =>
                        setOwner({ ...owner, email: e.target.value })
                      }
                      placeholder="you@example.com"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/80 mb-1">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={owner.phone}
                      onChange={(e) =>
                        setOwner({ ...owner, phone: e.target.value })
                      }
                      placeholder="+90 5xx xxx xx xx"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/80 mb-1">
                    Kurulum Şifresi (size verilen)
                  </label>
                  <input
                    type="text"
                    value={owner.setupCode}
                    onChange={(e) =>
                      setOwner({ ...owner, setupCode: e.target.value })
                    }
                    placeholder="Örn: SALON-XXXX-KEY"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-white/60 mt-1">
                    Not: Bu şifre kurulumu yapan ekip tarafından size verilecektir.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/80 mb-1">
                      Şifre
                    </label>
                    <input
                      type="password"
                      value={owner.password}
                      onChange={(e) =>
                        setOwner({ ...owner, password: e.target.value })
                      }
                      placeholder="En az 6 karakter"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/80 mb-1">
                      Şifre (Tekrar)
                    </label>
                    <input
                      type="password"
                      value={owner.confirmPassword}
                      onChange={(e) =>
                        setOwner({
                          ...owner,
                          confirmPassword: e.target.value,
                        })
                      }
                      placeholder="Şifreyi tekrar girin"
                      className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={owner.acceptTerms}
                    onChange={(e) =>
                      setOwner({ ...owner, acceptTerms: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-white/5 border-white/20"
                  />
                  <span>İşletme şartlarını ve politikaları kabul ediyorum</span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold transition disabled:opacity-60"
                >
                  Salon Sahibi Olarak Kayıt Ol
                </button>

                <p className="text-center text-sm text-white/60">
                  Üyelik mi istiyorsunuz?{" "}
                  <button
                    type="button"
                    onClick={() => setTab("member")}
                    className="text-indigo-300 hover:underline"
                  >
                    Üye Ol
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-white/40">
        © 2025 MyCoolWebsite — Tüm hakları saklıdır
      </p>
    </main>
  );
}