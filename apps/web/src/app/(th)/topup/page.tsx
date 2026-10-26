'use client';

import { createApi } from '@rukan/api';
import {
  COIN_PACKAGES,
  type CoinPackage,
  type TopupOrderResult,
  type UserTopupInfo,
} from '@rukan/shared';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { LogoMark } from '@/components/landing/icons';
import { createClient } from '@/lib/supabase/client';

export default function TopupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream flex items-center justify-center p-6 text-muted">
          กำลังโหลดศูนย์เติมเหรียญ...
        </div>
      }
    >
      <TopupContent />
    </Suspense>
  );
}

function TopupContent() {
  const searchParams = useSearchParams();
  const uidParam = searchParams.get('uid');

  const supabase = useMemo(() => createClient(), []);
  const api = useMemo(() => createApi(supabase), [supabase]);

  // Account State
  const [targetUserId, setTargetUserId] = useState<string>(uidParam || '');
  const [userInfo, setUserInfo] = useState<UserTopupInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Package State
  const defaultPkg = (COIN_PACKAGES.find((p) => p.popular) ?? COIN_PACKAGES[0]) as CoinPackage;
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage>(defaultPkg);

  // Slip & Payment State
  const [copiedAccount, setCopiedAccount] = useState<boolean>(false);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<TopupOrderResult | null>(null);

  // Load User by ID manually from search input
  const handleSearchUser = async (uidToSearch: string) => {
    const cleanUid = uidToSearch.trim();
    if (!cleanUid) {
      setUserInfo(null);
      return;
    }
    setLoadingUser(true);
    setUserError(null);
    try {
      const info = await api.getUserTopupInfo(cleanUid);
      setUserInfo(info);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่พบบัญชีผู้ใช้นี้ในระบบ รู้กัน';
      setUserError(msg);
      setUserInfo(null);
    } finally {
      setLoadingUser(false);
    }
  };

  // Init from URL param or session
  useEffect(() => {
    let cancelled = false;
    if (uidParam) {
      api
        .getUserTopupInfo(uidParam)
        .then((info) => {
          if (!cancelled) setUserInfo(info);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            const msg = err instanceof Error ? err.message : 'ไม่พบบัญชีผู้ใช้นี้ในระบบ รู้กัน';
            setUserError(msg);
          }
        });
    } else {
      void supabase.auth.getSession().then(({ data }) => {
        if (!cancelled && data.session?.user?.id) {
          const id = data.session.user.id;
          setTargetUserId(id);
          api
            .getUserTopupInfo(id)
            .then((info) => {
              if (!cancelled) setUserInfo(info);
            })
            .catch(() => {});
        }
      });
    }
    return () => {
      cancelled = true;
    };
  }, [uidParam, api, supabase]);

  const handleCopyAccount = () => {
    void navigator.clipboard.writeText('098-8-12345-6');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setSubmitError('กรุณาอัปโหลดไฟล์รูปภาพสลิป (JPG, PNG, WebP)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setSubmitError('ไฟล์ภาพมีขนาดเกิน 10MB กรุณาเลือกภาพที่ขนาดเล็กลง');
        return;
      }
      setSubmitError(null);
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInfo) {
      setSubmitError('กรุณาระบุบัญชีผู้ใช้ที่ต้องการเติมเหรียญ');
      return;
    }
    if (!slipFile) {
      setSubmitError('กรุณาแนบภาพสลิปการโอนเงินเพื่อยืนยัน');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // 1. Upload Slip to Storage
      const slipUrl = await api.uploadSlip({
        userId: userInfo.user_id,
        body: slipFile,
        contentType: slipFile.type,
      });

      // 2. Create Top-up Order
      const res = await api.createTopupOrder({
        packageId: selectedPkg.id as 'starter' | 'popular' | 'best_value' | 'vip_pro',
        slipUrl,
        targetUserId: userInfo.user_id,
      });

      setOrderResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการส่งข้อมูลสลิป';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream text-ink font-sans pb-24 selection:bg-rose-tint selection:text-rose-deep">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-grid opacity-60" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-glow pointer-events-none -z-10" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-cream/80 border-b border-line px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 transition hover:opacity-85">
            <LogoMark size={32} />
            <div className="flex flex-col">
              <span className="font-display font-semibold tracking-tight text-ink text-lg leading-tight">
                รู้กัน · rukan
              </span>
              <span className="text-[11px] font-medium text-muted">
                ศูนย์บริการเติมเหรียญทางการ
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sage-tint text-sage text-xs font-semibold border border-sage/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ระบบรับชำระพร้อมเพย์อัตโนมัติ
            </span>
            <Link
              href="/"
              className="text-xs font-medium text-muted hover:text-ink transition px-2.5 py-1"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        {/* Title & Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-tint text-rose-deep text-xs font-semibold mb-3 border border-rose/30">
            <span>✨</span>
            <span>สิทธิพิเศษหน้าเว็บ: รับโบนัสเหรียญสูงสุด +23%</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-ink">
            เติมเหรียญ <span className="text-gradient">Rukan Coin</span>
          </h1>
          <p className="mt-2 text-sm text-muted max-w-md mx-auto">
            ใช้ส่ง Golden Bubble ชวนคุย, ปลดล็อกโหมดพิเศษ, หรือแลกตั๋ว Gold / Premium Pass
          </p>
        </div>

        {/* ORDER SUCCESS VIEW */}
        {orderResult ? (
          <div className="bg-white rounded-3xl border border-line p-8 text-center shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto mb-4">
              ✓
            </div>
            <h2 className="text-2xl font-display font-bold text-ink">
              แจ้งโอนเงินสำเร็จเรียบร้อย!
            </h2>
            <p className="mt-2 text-sm text-muted max-w-md mx-auto">
              ระบบได้รับสลิปการโอนเงินจำนวน <strong>฿{orderResult.price_thb}</strong> สำหรับเติม{' '}
              <strong>{orderResult.total_coins.toLocaleString()} เหรียญ</strong> เรียบร้อยแล้ว
            </p>

            <div className="mt-6 p-4 rounded-2xl bg-cream border border-line text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-muted">รหัสคำสั่ง (Order ID):</span>
                <span className="font-mono font-medium text-ink">{orderResult.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">บัญชีผู้รับ:</span>
                <span className="font-medium text-ink">{userInfo?.display_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">แพ็กเกจ:</span>
                <span className="font-medium text-ink">{orderResult.package_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">สถานะ:</span>
                <span className="font-semibold text-amber-600">กำลังตรวจสอบสลิป (3–5 นาที)</span>
              </div>
            </div>

            <p className="mt-5 text-xs text-muted">
              เมื่อตรวจสอบยอดเงินถูกต้อง เหรียญจะเข้ากระเป๋าของคุณในแอป รู้กัน โดยอัตโนมัติ
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => {
                  setOrderResult(null);
                  setSlipFile(null);
                  setSlipPreview(null);
                  if (userInfo) {
                    void handleSearchUser(userInfo.user_id);
                  }
                }}
                className="px-6 py-2.5 rounded-full text-xs font-semibold border border-line text-ink hover:bg-cream transition"
              >
                เติมรายการอื่นเพิ่มเติม
              </button>
              <a
                href="rukan://"
                className="px-8 py-2.5 rounded-full text-xs font-semibold bg-ink text-white hover:opacity-90 transition shadow-sm"
              >
                เปิดแอป รู้กัน
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* STEP 1: USER ACCOUNT SELECTION */}
            <section className="bg-white rounded-3xl border border-line p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="text-base font-display font-semibold text-ink">
                    ตรวจสอบบัญชีผู้ใช้
                  </h2>
                </div>
                {userInfo && (
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <span>●</span> บัญชีถูกต้อง
                  </span>
                )}
              </div>

              {userInfo ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-cream border border-line gap-4">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-13 h-13 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                      style={{
                        backgroundColor:
                          userInfo.alias_color === 'rose'
                            ? '#e9a9bf'
                            : userInfo.alias_color === 'indigo'
                              ? '#6366f1'
                              : userInfo.alias_color === 'teal'
                                ? '#14b8a6'
                                : userInfo.alias_color === 'amber'
                                  ? '#f59e0b'
                                  : '#c23a72',
                      }}
                    >
                      {userInfo.alias.charAt(0) || 'ร'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-base">
                          {userInfo.display_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-tint text-rose-deep font-semibold uppercase">
                          {userInfo.tier}
                        </span>
                      </div>
                      <div className="text-xs text-muted">@{userInfo.alias}</div>
                      <div className="text-xs text-amber-600 font-semibold mt-1">
                        🪙 ยอดเหรียญปัจจุบัน: {userInfo.coin_balance.toLocaleString()} เหรียญ
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserInfo(null);
                      setTargetUserId('');
                    }}
                    className="text-xs text-muted hover:text-rose-deep underline self-start sm:self-auto"
                  >
                    เปลี่ยนบัญชี
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-muted mb-2">
                    กรอก User ID ของคุณ (ดูได้ที่แอป: หน้า &quot;ฉัน&quot; → ตั้งค่า → คัดลอก User
                    ID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      placeholder="เช่น a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
                      className="flex-1 px-4 py-2.5 rounded-xl border border-line bg-cream/50 text-sm font-mono text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-rose/40"
                    />
                    <button
                      type="button"
                      disabled={loadingUser || !targetUserId.trim()}
                      onClick={() => void handleSearchUser(targetUserId)}
                      className="px-5 py-2.5 rounded-xl bg-ink text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition whitespace-nowrap"
                    >
                      {loadingUser ? 'ค้นหา...' : 'ตรวจสอบบัญชี'}
                    </button>
                  </div>
                  {userError && (
                    <p className="mt-2 text-xs text-rose-deep font-medium">⚠️ {userError}</p>
                  )}
                </div>
              )}
            </section>

            {/* STEP 2: SELECT PACKAGE */}
            <section className="bg-white rounded-3xl border border-line p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <h2 className="text-base font-display font-semibold text-ink">
                  เลือกแพ็กเกจเหรียญ
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {COIN_PACKAGES.map((pkg) => {
                  const isSelected = selectedPkg.id === pkg.id;
                  const total = pkg.coins + pkg.bonusCoins;

                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg)}
                      className={`relative rounded-2xl p-5 border cursor-pointer transition flex flex-col justify-between ${
                        isSelected
                          ? 'border-rose-deep bg-rose-tint/20 ring-2 ring-rose-deep/30 shadow-sm'
                          : 'border-line hover:border-line-strong hover:bg-cream/40 bg-white'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-rose-deep to-purple-600 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                          🔥 ยอดนิยม
                        </span>
                      )}
                      {pkg.bestValue && (
                        <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-amber-500 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                          คุ้มค่าที่สุด +18%
                        </span>
                      )}

                      <div>
                        <div className="text-xs font-semibold text-muted uppercase tracking-wider">
                          {pkg.name}
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold font-display text-ink">
                            🪙 {total.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted">เหรียญ</span>
                        </div>

                        {pkg.bonusCoins > 0 ? (
                          <div className="mt-1 text-xs text-rose-deep font-semibold">
                            (ได้เหรียญปกติ {pkg.coins.toLocaleString()} + โบนัสพิเศษ{' '}
                            {pkg.bonusCoins.toLocaleString()})
                          </div>
                        ) : (
                          <div className="mt-1 text-xs text-muted">ไม่มีโบนัสพิเศษ</div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
                        <span className="text-lg font-bold text-ink">฿{pkg.priceThb}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${
                            isSelected
                              ? 'bg-rose-deep border-rose-deep text-white font-bold'
                              : 'border-line text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* STEP 3: PROMPTPAY QR & BANK TRANSFER */}
            <section className="bg-white rounded-3xl border border-line p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-display font-semibold text-ink">
                  สแกนชำระเงินผ่านพร้อมเพย์ หรือโอนผ่านธนาคาร
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* QR Code Card */}
                <div className="bg-gradient-to-b from-blue-900 to-indigo-950 p-5 rounded-2xl text-white text-center shadow-md flex flex-col items-center">
                  <div className="text-[11px] font-bold tracking-widest text-blue-200 uppercase mb-2">
                    THAI QR PAYMENT · PROMPTPAY
                  </div>

                  {/* QR Image Box */}
                  <div className="bg-white p-3.5 rounded-xl shadow-inner max-w-[210px] w-full aspect-square flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=00020101021129370016A000000677010111011300669881234565802TH5303764540${selectedPkg.priceThb.toFixed(2).length}${selectedPkg.priceThb.toFixed(2)}6304`}
                      alt="PromptPay QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="mt-3">
                    <div className="text-xs text-blue-200">ยอดที่ต้องชำระตรงกัน:</div>
                    <div className="text-2xl font-bold font-display text-white">
                      ฿{selectedPkg.priceThb}.00
                    </div>
                  </div>
                </div>

                {/* Bank Account Info */}
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-cream border border-line space-y-3 text-xs">
                    <div>
                      <div className="text-muted">ธนาคาร:</div>
                      <div className="font-semibold text-ink text-sm flex items-center gap-1.5 mt-0.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
                        ธนาคารกสิกรไทย (KBANK)
                      </div>
                    </div>

                    <div>
                      <div className="text-muted">ชื่อบัญชี:</div>
                      <div className="font-semibold text-ink mt-0.5">
                        บริษัท รู้กัน เทคโนโลยี จำกัด
                      </div>
                    </div>

                    <div>
                      <div className="text-muted">เลขที่บัญชี:</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-base font-bold text-ink">
                          098-8-12345-6
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyAccount}
                          className="px-3 py-1 rounded-lg bg-white border border-line hover:border-line-strong text-ink font-semibold text-xs shadow-xs transition"
                        >
                          {copiedAccount ? '✓ คัดลอกแล้ว' : 'คัดลอกเลขบัญชี'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-muted space-y-1">
                    <p>• รองรับทุกแอปธนาคารไทย (K PLUS, SCB EASY, Krungthai NEXT, etc.)</p>
                    <p>• กรุณาโอนเงินยอดตรงกับที่เลือก เพื่อความรวดเร็วในการตรวจสอบ</p>
                  </div>
                </div>
              </div>
            </section>

            {/* STEP 4: UPLOAD SLIP */}
            <section className="bg-white rounded-3xl border border-line p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-6 h-6 rounded-full bg-ink text-white text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <h2 className="text-base font-display font-semibold text-ink">
                  แนบสลิปการโอนเงินเพื่อยืนยัน
                </h2>
              </div>

              <div className="space-y-4">
                <label className="block border-2 border-dashed border-line hover:border-rose-deep/50 rounded-2xl p-6 text-center cursor-pointer transition bg-cream/30 hover:bg-cream/60">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {slipPreview ? (
                    <div className="flex flex-col items-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slipPreview}
                        alt="สลิปที่เลือก"
                        className="max-h-56 rounded-xl object-contain shadow-sm border border-line mb-3"
                      />
                      <span className="text-xs text-rose-deep font-semibold underline">
                        คลิกเพื่อเปลี่ยนรูปสลิป
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <div className="w-12 h-12 rounded-full bg-rose-tint text-rose-deep flex items-center justify-center text-xl mb-2">
                        📄
                      </div>
                      <div className="text-sm font-semibold text-ink">
                        คลิกเพื่อเลือกรูปสลิป หรือลากไฟล์มาวางที่นี่
                      </div>
                      <div className="text-xs text-muted mt-1">
                        รองรับ JPG, PNG, WebP สูงสุด 10MB
                      </div>
                    </div>
                  )}
                </label>

                {submitError && (
                  <div className="p-3.5 rounded-xl bg-rose-tint/50 border border-rose/40 text-xs text-rose-deep font-medium">
                    ⚠️ {submitError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !userInfo || !slipFile}
                  className="w-full py-4 rounded-2xl bg-ink text-white font-display font-semibold text-sm hover:opacity-90 disabled:opacity-40 transition shadow-md flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      กำลังอัปโหลดสลิปและบันทึกข้อมูล...
                    </>
                  ) : (
                    <>
                      <span>ยืนยันการชำระเงิน</span>
                      <span>·</span>
                      <span>฿{selectedPkg.priceThb}</span>
                      <span>
                        (รับ {(selectedPkg.coins + selectedPkg.bonusCoins).toLocaleString()} เหรียญ)
                      </span>
                    </>
                  )}
                </button>
              </div>
            </section>
          </form>
        )}
      </main>
    </div>
  );
}
