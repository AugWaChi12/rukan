'use client';

import { createApi } from '@rukan/api';
import type {
  ModAppealItem,
  ModDashboardCounts,
  ModReportItem,
  ModWaitlistRow,
  ModWaitlistStats,
  SubscriptionTier,
  TierConfig,
} from '@rukan/shared';
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

type TabKey = 'overview' | 'waitlist' | 'plans' | 'reports' | 'appeals' | 'audit';

export default function AdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const api = useMemo(() => createApi(supabase), [supabase]);

  const [loading, setLoading] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isModerator, setIsModerator] = useState(false);

  // Form Login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginPending, setLoginPending] = useState(false);

  // Dashboard Data
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [counts, setCounts] = useState<ModDashboardCounts | null>(null);
  const [stats, setStats] = useState<ModWaitlistStats | null>(null);
  const [waitlistRows, setWaitlistRows] = useState<ModWaitlistRow[]>([]);
  const [searchWaitlist, setSearchWaitlist] = useState('');
  const [reports, setReports] = useState<ModReportItem[]>([]);
  const [reportFilter, setReportFilter] = useState<'open' | 'actioned' | 'dismissed'>('open');
  const [appeals, setAppeals] = useState<ModAppealItem[]>([]);
  const [tierConfigs, setTierConfigs] = useState<TierConfig[]>([]);
  const [savingTier, setSavingTier] = useState<string | null>(null);

  // Admin Quick Tool: เติมเหรียญ Rukan Coin & ตั้งระดับ Pass รายบุคคล
  const [targetUserId, setTargetUserId] = useState('');
  const [coinDelta, setCoinDelta] = useState(1000);
  const [coinNote, setCoinNote] = useState('');
  const [grantingCoins, setGrantingCoins] = useState(false);
  const [manualPassTier, setManualPassTier] = useState<SubscriptionTier>('gold');
  const [manualPassDays, setManualPassDays] = useState(30);
  const [settingPass, setSettingPass] = useState(false);

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const loadTierConfigs = useCallback(async () => {
    try {
      const data = await api.getTierConfigs();
      setTierConfigs(data);
    } catch (err) {
      console.error('Failed to load tier configs:', err);
    }
  }, [api]);

  // โหลดข้อมูล Dashboard ผ่าน @rukan/api ทั้งหมด
  const refreshAdminData = useCallback(async () => {
    try {
      const countsData = await api.moderation.getDashboardCounts();
      setIsModerator(true);
      setCounts(countsData);

      const [statsData, wlData, repData, appData] = await Promise.all([
        api.moderation.getWaitlistStats(),
        api.moderation.listWaitlist({ limit: 100, offset: 0 }),
        api.moderation.listReports({ status: 'open', limit: 50 }),
        api.moderation.listAppeals({ status: 'pending', limit: 50 }),
      ]);

      setStats(statsData);
      setWaitlistRows(wlData);
      setReports(repData);
      setAppeals(appData);

      await loadTierConfigs();
    } catch (err) {
      console.error('Refresh error:', err);
      setIsModerator(false);
    }
  }, [api, loadTierConfigs]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (ignore) return;
        if (!user) {
          setIsModerator(false);
          setCurrentUserEmail(null);
          setLoading(false);
          return;
        }

        setCurrentUserEmail(user.email ?? 'Authenticated');

        try {
          const countsData = await api.moderation.getDashboardCounts();
          if (ignore) return;
          setIsModerator(true);
          setCounts(countsData);

          const [statsData, wlData, repData, appData] = await Promise.all([
            api.moderation.getWaitlistStats(),
            api.moderation.listWaitlist({ limit: 100, offset: 0 }),
            api.moderation.listReports({ status: 'open', limit: 50 }),
            api.moderation.listAppeals({ status: 'pending', limit: 50 }),
          ]);

          if (!ignore) {
            setStats(statsData);
            setWaitlistRows(wlData);
            setReports(repData);
            setAppeals(appData);
            await loadTierConfigs();
          }
        } catch {
          if (!ignore) setIsModerator(false);
        }
      } catch (err) {
        console.error('Admin init error:', err);
        if (!ignore) setIsModerator(false);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [supabase, api, loadTierConfigs]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginPending(true);

    try {
      await api.auth.signInWithEmail(loginEmail.trim(), loginPassword);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserEmail(user?.email ?? loginEmail.trim());
      await refreshAdminData();
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoginPending(false);
    }
  }

  async function handleSignOut() {
    await api.auth.signOut();
    setIsModerator(false);
    setCurrentUserEmail(null);
  }

  async function loadWaitlist(search: string) {
    try {
      const data = await api.moderation.listWaitlist({
        limit: 100,
        offset: 0,
        search: search || undefined,
      });
      setWaitlistRows(data);
    } catch (err) {
      console.error('Failed to load waitlist:', err);
    }
  }

  async function loadReports(status: 'open' | 'actioned' | 'dismissed') {
    try {
      const data = await api.moderation.listReports({
        status,
        limit: 50,
      });
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  }

  async function loadAppeals() {
    try {
      const data = await api.moderation.listAppeals({ status: 'pending', limit: 50 });
      setAppeals(data);
    } catch (err) {
      console.error('Failed to load appeals:', err);
    }
  }

  async function handleTakeAction(
    report: ModReportItem,
    action: 'warn' | 'hide_content' | 'suspend' | 'ban',
    days?: number,
  ) {
    startTransition(async () => {
      try {
        const untilDate = days
          ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
          : undefined;

        const level =
          action === 'warn' ? 1 : action === 'hide_content' ? 2 : action === 'suspend' ? 3 : 4;

        await api.moderation.takeAction({
          userId: report.target_id,
          action,
          level,
          reason: `Action taken by admin (${action})`,
          reportId: report.id,
          targetType: report.target_type,
          targetId: report.target_id,
          until: untilDate,
        });

        setActionMessage(`ดำเนินการ ${action} สำเร็จ`);
        await loadReports(reportFilter);
        const countsData = await api.moderation.getDashboardCounts();
        setCounts(countsData);
      } catch (err: unknown) {
        setActionMessage(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  async function handleReviewAppeal(actionId: string, decision: 'accepted' | 'rejected') {
    startTransition(async () => {
      try {
        await api.moderation.reviewAppeal({ actionId, decision });
        setActionMessage(
          decision === 'accepted'
            ? '✅ อนุมัติคำอุทธรณ์และปลดระงับบัญชีเรียบร้อยแล้ว'
            : '❌ ปฏิเสธคำอุทธรณ์เรียบร้อยแล้ว',
        );
        await loadAppeals();
        const countsData = await api.moderation.getDashboardCounts();
        setCounts(countsData);
      } catch (err: unknown) {
        setActionMessage(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  function exportWaitlistCSV() {
    if (waitlistRows.length === 0) return;
    const headers = [
      'Email',
      'Area',
      'Age Band',
      'Intents',
      'Locale',
      'Consented At',
      'Created At',
    ];
    const rows = waitlistRows.map((r) => [
      `"${r.email}"`,
      `"${r.area}"`,
      `"${r.age_band ?? ''}"`,
      `"${r.intents.join('; ')}"`,
      `"${r.locale}"`,
      `"${r.consented_at}"`,
      `"${r.created_at}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rukan-waitlist-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function updateTierField<K extends keyof TierConfig>(
    tier: SubscriptionTier,
    field: K,
    value: TierConfig[K],
  ) {
    setTierConfigs((prev) =>
      prev.map((item) => (item.tier === tier ? { ...item, [field]: value } : item)),
    );
  }

  async function handleSaveTierConfig(tier: SubscriptionTier) {
    const config = tierConfigs.find((c) => c.tier === tier);
    if (!config) return;

    setSavingTier(tier);
    try {
      await api.moderation.updateTierConfig({
        tier,
        config: {
          display_name: config.display_name,
          swipe_batch_size: Number(config.swipe_batch_size),
          swipe_window_hours: Number(config.swipe_window_hours),
          daily_bubble_limit: Number(config.daily_bubble_limit),
          daily_golden_bubbles: Number(config.daily_golden_bubbles),
          allow_rewind: Boolean(config.allow_rewind),
          match_expiry_hours: Number(config.match_expiry_hours),
          allow_see_likes: Boolean(config.allow_see_likes),
          allow_spotlight_post: Boolean(config.allow_spotlight_post),
          allow_advanced_filters: Boolean(config.allow_advanced_filters),
          allow_ai_assistant: Boolean(config.allow_ai_assistant),
          ai_coin_cost_per_use: Number(config.ai_coin_cost_per_use),
          price_coins_weekly: Number(config.price_coins_weekly),
          price_coins_monthly: Number(config.price_coins_monthly),
          price_thb_monthly: Number(config.price_thb_monthly),
        },
      });

      const labelMap: Record<SubscriptionTier, string> = {
        free: '🌱 ผู้ใช้ทั่วไป (Free)',
        gold: '🥇 Gold Pass',
        premium: '💎 Premium Pass (VIP + AI)',
      };
      setActionMessage(`✅ บันทึกการตั้งค่า ${labelMap[tier]} เรียบร้อยแล้ว!`);
      await loadTierConfigs();
    } catch (err: unknown) {
      setActionMessage(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSavingTier(null);
    }
  }

  async function handleGrantCoins(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    setGrantingCoins(true);
    try {
      const res = await api.moderation.grantUserCoins({
        userId: targetUserId.trim(),
        amount: Number(coinDelta),
        note: coinNote.trim() || undefined,
      });
      setActionMessage(
        `🪙 ปรับยอดเหรียญสำเร็จ (${res.delta > 0 ? `+${res.delta}` : res.delta} 🪙) → ยอดคงเหลือใหม่: ${res.coin_balance.toLocaleString()} 🪙`,
      );
      setCoinNote('');
    } catch (err: unknown) {
      setActionMessage(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGrantingCoins(false);
    }
  }

  async function handleSetManualPass(e: React.FormEvent) {
    e.preventDefault();
    if (!targetUserId.trim()) return;
    setSettingPass(true);
    try {
      const expiresAt =
        manualPassTier === 'free'
          ? null
          : new Date(Date.now() + manualPassDays * 24 * 60 * 60 * 1000).toISOString();
      const res = await api.moderation.setUserSubscription({
        userId: targetUserId.trim(),
        tier: manualPassTier,
        source: 'manual',
        expiresAt,
      });
      setActionMessage(
        `🎫 ตั้งระดับสมาชิกของผู้ใช้ ${res.user_id.slice(0, 8)}… เป็น "${res.tier.toUpperCase()}" สำเร็จ!`,
      );
    } catch (err: unknown) {
      setActionMessage(`เกิดข้อผิดพลาด: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSettingPass(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f0e0d]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#e9a9bf] border-t-transparent" />
          <p className="text-sm text-[#a69d90]">กำลังเชื่อมต่อระบบ Admin...</p>
        </div>
      </div>
    );
  }

  // ถ้ายังไม่ได้ล็อกอิน หรือไม่ได้เป็น Moderator -> แสดงหน้าเข้าสู่ระบบ Admin
  if (!isModerator) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[#2a2724] bg-[#1b1917] p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-[#2a2419] px-3.5 py-1 text-xs font-bold text-[#d6b36a]">
              admin.rukan.app
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold text-[#f2eadb]">
              รู้กัน · Admin Console
            </h1>
            <p className="mt-1 text-sm text-[#a69d90]">ระบบควบคุมและดูแลความปลอดภัยสำหรับทีมงาน</p>
          </div>

          {currentUserEmail && (
            <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              บัญชี <b>{currentUserEmail}</b> ไม่มีสิทธิ์เข้าถึง (ต้องเป็นบัญชี Moderator / Admin)
            </div>
          )}

          {loginError && (
            <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#a69d90] uppercase tracking-wider">
                อีเมลทีมงาน
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="admin@rukan.app หรือ demo@rukan.dev"
                className="mt-1.5 w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-4 py-3 text-sm text-[#f2eadb] outline-none focus:border-[#d6b36a] focus:ring-1 focus:ring-[#d6b36a]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a69d90] uppercase tracking-wider">
                รหัสผ่าน
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1.5 w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-4 py-3 text-sm text-[#f2eadb] outline-none focus:border-[#d6b36a] focus:ring-1 focus:ring-[#d6b36a]"
              />
            </div>

            <button
              type="submit"
              disabled={loginPending}
              className="mt-2 w-full rounded-full bg-[#d6b36a] py-3 text-sm font-bold text-[#0f0e0d] transition hover:bg-[#e4c278] disabled:opacity-50"
            >
              {loginPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ Admin →'}
            </button>
          </form>

          <div className="mt-8 border-t border-[#2a2724] pt-5 text-center text-xs text-[#a69d90]">
            <a href="https://rukan.app" className="hover:text-[#f2eadb] transition">
              ← กลับไปยังหน้าเว็บหลัก rukan.app
            </a>
          </div>
        </div>
      </div>
    );
  }

  // หน้า Admin Console หลัก
  return (
    <div className="min-h-screen pb-16">
      {/* Top Navbar */}
      <header className="border-b border-[#2a2724] bg-[#1b1917]/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#2a2419] text-lg font-bold text-[#d6b36a]">
              🫧
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base text-[#f2eadb]">
                  รู้กัน Admin
                </span>
                <span className="rounded-full bg-[#2a2419] px-2 py-0.5 text-[11px] font-semibold text-[#d6b36a]">
                  admin.rukan.app
                </span>
              </div>
              <p className="text-[12px] text-[#a69d90]">
                Logged in as <span className="text-[#f2eadb]">{currentUserEmail}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://rukan.app"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex rounded-full border border-[#2a2724] px-3.5 py-1.5 text-xs font-semibold text-[#a69d90] hover:border-[#f2eadb] hover:text-[#f2eadb] transition"
            >
              เปิด rukan.app ↗
            </a>
            <button
              onClick={handleSignOut}
              className="rounded-full bg-[#25221f] px-3.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mx-auto flex max-w-7xl overflow-x-auto px-5 gap-1 pt-1">
          {[
            { key: 'overview', label: '📊 ภาพรวม & ย่าน', badge: null },
            { key: 'waitlist', label: '📋 รายชื่อ Waitlist', badge: counts?.waitlist_total },
            { key: 'plans', label: '💎 จัดการ 3 Passes & Rukan Coin', badge: '3 Tiers' },
            { key: 'reports', label: '🛡️ ตรวจรายงาน', badge: counts?.reports_pending },
            { key: 'appeals', label: '⚖️ คำอุทธรณ์', badge: counts?.appeals_pending },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key as TabKey);
                if (item.key === 'reports') void loadReports(reportFilter);
                if (item.key === 'appeals') void loadAppeals();
              }}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition ${
                activeTab === item.key
                  ? 'border-[#d6b36a] text-[#d6b36a]'
                  : 'border-transparent text-[#a69d90] hover:text-[#f2eadb]'
              }`}
            >
              <span>{item.label}</span>
              {item.badge !== null && item.badge !== undefined && (
                <span className="rounded-full bg-[#25221f] px-2 py-0.5 text-xs font-bold text-[#f2eadb]">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-5 pt-8">
        {actionMessage && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-[#d6b36a]/30 bg-[#2a2419] p-4 text-sm text-[#d6b36a]">
            <span>{actionMessage}</span>
            <button
              onClick={() => setActionMessage(null)}
              className="text-xs font-bold text-[#a69d90] hover:text-[#f2eadb]"
            >
              ✕ ปิด
            </button>
          </div>
        )}

        {/* TAB 1: ภาพรวม */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* 4 Stat Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                <span className="text-xs font-semibold text-[#a69d90] uppercase tracking-wider">
                  คนลงชื่อรอใช้ทั้งหมด
                </span>
                <p className="mt-2 text-3xl font-extrabold text-[#f2eadb]">
                  {counts?.waitlist_total ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#d6b36a]">+วันนี้ {stats?.today_count ?? 0} คน</p>
              </div>

              <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                <span className="text-xs font-semibold text-[#a69d90] uppercase tracking-wider">
                  รายงานรอการตรวจสอบ
                </span>
                <p className="mt-2 text-3xl font-extrabold text-[#e9a9bf]">
                  {counts?.reports_pending ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#a69d90]">โพสต์ / บัญชีที่ถูกรายงาน</p>
              </div>

              <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                <span className="text-xs font-semibold text-[#a69d90] uppercase tracking-wider">
                  คำอุทธรณ์รอพิจารณา
                </span>
                <p className="mt-2 text-3xl font-extrabold text-[#bbdacb]">
                  {counts?.appeals_pending ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#a69d90]">จากผู้ใช้ที่ถูกสั่งระงับ</p>
              </div>

              <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                <span className="text-xs font-semibold text-[#a69d90] uppercase tracking-wider">
                  บัญชีที่ถูกระงับอยู่
                </span>
                <p className="mt-2 text-3xl font-extrabold text-red-400">
                  {counts?.active_suspensions ?? 0}
                </p>
                <p className="mt-1 text-xs text-[#a69d90]">มีผลบังคับใช้อยู่ในขณะนี้</p>
              </div>
            </div>

            {/* University / Area Leaderboard */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-[#f2eadb]">
                      🏆 อันดับย่าน & มหาวิทยาลัยที่มีคนรอมากที่สุด
                    </h2>
                    <p className="text-xs text-[#a69d90]">
                      ใช้พิจารณาเปิดตัวระบบแรกตามแผน &quot;ย่านเดียว + มอเดียว&quot;
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('waitlist')}
                    className="text-xs font-semibold text-[#d6b36a] hover:underline"
                  >
                    ดูรายชื่อทั้งหมด →
                  </button>
                </div>

                {stats?.by_area && stats.by_area.length > 0 ? (
                  <div className="space-y-4">
                    {stats.by_area.map((item, idx) => {
                      const total = counts?.waitlist_total || 1;
                      const percentage = Math.round((item.count / total) * 100);
                      return (
                        <div key={item.area} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-[#f2eadb]">
                              <span className="font-bold text-[#d6b36a] mr-2">#{idx + 1}</span>
                              {item.area}
                            </span>
                            <span className="text-[#a69d90]">
                              {item.count} คน ({percentage}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#25221f]">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#e9a9bf] to-[#d6b36a]"
                              style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-[#a69d90]">
                    ยังไม่มีข้อมูลการลงชื่อรอใช้
                  </p>
                )}
              </div>

              {/* Age Band & Demographics */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                  <h3 className="text-sm font-bold text-[#f2eadb] mb-4">🎂 สัดส่วนช่วงอายุ</h3>
                  <div className="space-y-3">
                    {(stats?.by_age_band ?? []).map((age) => (
                      <div
                        key={age.age_band}
                        className="flex items-center justify-between rounded-xl bg-[#25221f] px-3.5 py-2 text-xs"
                      >
                        <span className="text-[#f2eadb]">{age.age_band}</span>
                        <span className="font-bold text-[#d6b36a]">{age.count} คน</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6">
                  <h3 className="text-sm font-bold text-[#f2eadb] mb-4">🌐 ภาษาที่ใช้สมัคร</h3>
                  <div className="flex gap-4">
                    {(stats?.by_locale ?? []).map((loc) => (
                      <div
                        key={loc.locale}
                        className="flex-1 rounded-2xl bg-[#25221f] p-4 text-center"
                      >
                        <span className="text-xs text-[#a69d90] uppercase">
                          {loc.locale === 'th' ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
                        </span>
                        <p className="mt-1 text-xl font-extrabold text-[#f2eadb]">{loc.count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: รายชื่อ Waitlist */}
        {activeTab === 'waitlist' && (
          <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f2eadb]">
                  📋 รายชื่อผู้ลงชื่อรอใช้งาน ({waitlistRows.length} รายการล่าสุด)
                </h2>
                <p className="text-xs text-[#a69d90]">
                  เก็บใน schema private ตามมาตรฐานความปลอดภัย PDPA
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="ค้นหาอีเมล หรือย่าน..."
                  value={searchWaitlist}
                  onChange={(e) => {
                    setSearchWaitlist(e.target.value);
                    loadWaitlist(e.target.value);
                  }}
                  className="rounded-full border border-[#2a2724] bg-[#25221f] px-4 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                />
                <button
                  onClick={exportWaitlistCSV}
                  className="rounded-full bg-[#d6b36a] px-4 py-2 text-xs font-bold text-[#0f0e0d] transition hover:bg-[#e4c278]"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2a2724] text-[#a69d90] uppercase tracking-wider">
                    <th className="py-3 px-3">อีเมล</th>
                    <th className="py-3 px-3">ย่าน / มหาลัย</th>
                    <th className="py-3 px-3">อายุ</th>
                    <th className="py-3 px-3">สิ่งที่มองหา</th>
                    <th className="py-3 px-3">ภาษา</th>
                    <th className="py-3 px-3">เวลาที่ลงชื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2724]">
                  {waitlistRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#25221f]/50 transition">
                      <td className="py-3 px-3 font-mono font-medium text-[#f2eadb]">
                        {row.email}
                      </td>
                      <td className="py-3 px-3 text-[#f2eadb]">{row.area}</td>
                      <td className="py-3 px-3 text-[#a69d90]">{row.age_band ?? '—'}</td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1">
                          {row.intents.map((it) => (
                            <span
                              key={it}
                              className="rounded-full bg-[#2a2419] px-2 py-0.5 text-[10px] text-[#d6b36a]"
                            >
                              {it}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 uppercase text-[#a69d90]">{row.locale}</td>
                      <td className="py-3 px-3 text-[#a69d90]">
                        {new Date(row.created_at).toLocaleString('th-TH')}
                      </td>
                    </tr>
                  ))}
                  {waitlistRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#a69d90]">
                        ไม่พบข้อมูล
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: จัดการ 3 Passes & Rukan Coin (Free | Gold | Premium + AI) */}
        {activeTab === 'plans' && (
          <div className="space-y-8">
            {/* Header info banner */}
            <div className="rounded-3xl border border-[#d6b36a]/30 bg-gradient-to-r from-[#2a2419] to-[#1b1917] p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💎</span>
                    <h2 className="text-lg font-bold text-[#f2eadb]">
                      จัดการ 3 Passes & เหรียญ Rukan Coin (Free · Gold · Premium + AI)
                    </h2>
                  </div>
                  <p className="mt-1 text-xs text-[#a69d90] max-w-3xl">
                    ปรับแต่งโควตา ราคาแลกเหรียญ Rukan Coin (7 วัน / 30 วัน) และสิทธิ์ผู้ช่วย AI
                    ของทั้ง 3 ระดับ: <b className="text-[#f2eadb]">🌱 ผู้ใช้ทั่วไป (Free)</b> ·{' '}
                    <b className="text-[#d6b36a]">🥇 Gold Pass</b> ·{' '}
                    <b className="text-[#e9a9bf]">💎 Premium Pass (VIP + AI ส่วนตัว)</b> แบบ
                    Real-time
                  </p>
                </div>
                <button
                  onClick={loadTierConfigs}
                  className="self-start md:self-auto rounded-full border border-[#2a2724] bg-[#25221f] px-4 py-2 text-xs font-semibold text-[#f2eadb] hover:border-[#d6b36a] transition"
                >
                  🔄 รีเฟรชข้อมูล
                </button>
              </div>
            </div>

            {/* 3-Column Configuration Cards: Free | Gold | Premium */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {(['free', 'gold', 'premium'] as const).map((tierKey) => {
                const cfg = tierConfigs.find((t) => t.tier === tierKey);
                if (!cfg) return null;

                const meta =
                  tierKey === 'free'
                    ? {
                        icon: '🌱',
                        subtitle: 'เริ่มต้นฟรีสำหรับสมาชิกทุกคน',
                        borderClass: 'border-[#2a2724]',
                        titleClass: 'text-[#f2eadb]',
                        badgeClass: 'bg-[#25221f] text-[#a69d90]',
                        btnClass:
                          'bg-[#25221f] text-[#f2eadb] hover:bg-[#2a2724] border border-[#2a2724]',
                      }
                    : tierKey === 'gold'
                      ? {
                          icon: '🥇',
                          subtitle: 'สายป๊อป โอกาสแมตช์สูง',
                          borderClass:
                            'border-[#d6b36a]/50 shadow-[0_0_26px_rgba(214,179,106,0.08)]',
                          titleClass: 'text-[#d6b36a]',
                          badgeClass: 'bg-[#2a2419] text-[#d6b36a]',
                          btnClass: 'bg-[#d6b36a] text-[#0f0e0d] hover:bg-[#e4c278]',
                        }
                      : {
                          icon: '💎',
                          subtitle: 'VIP + ผู้ช่วย AI ส่วนตัวไม่อั้น',
                          borderClass:
                            'border-[#e9a9bf]/60 shadow-[0_0_32px_rgba(233,169,191,0.12)]',
                          titleClass: 'text-[#e9a9bf]',
                          badgeClass: 'bg-[#e9a9bf]/15 text-[#e9a9bf]',
                          btnClass: 'bg-[#e9a9bf] text-[#0f0e0d] hover:bg-[#f2bdd0]',
                        };

                return (
                  <div
                    key={tierKey}
                    className={`rounded-3xl border ${meta.borderClass} bg-[#1b1917] p-6 space-y-6 flex flex-col justify-between`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between border-b border-[#2a2724] pb-4 gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#25221f] text-lg">
                            {meta.icon}
                          </span>
                          <div>
                            <h3 className={`font-display font-bold text-sm ${meta.titleClass}`}>
                              {cfg.display_name}
                            </h3>
                            <span className="text-[11px] text-[#a69d90]">{meta.subtitle}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.badgeClass}`}
                          >
                            {cfg.price_coins_monthly > 0
                              ? `${cfg.price_coins_monthly.toLocaleString()} 🪙 / เดือน`
                              : 'ฟรี (0 🪙)'}
                          </span>
                        </div>
                      </div>

                      {/* Config Form Fields */}
                      <div className="mt-5 space-y-3.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                            🏷️ ชื่อแพ็กเกจที่แสดง (Display Name)
                          </label>
                          <input
                            type="text"
                            value={cfg.display_name}
                            onChange={(e) =>
                              updateTierField(tierKey, 'display_name', e.target.value)
                            }
                            className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                          />
                        </div>

                        {tierKey !== 'free' && (
                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                                🪙 ราคา 7 วัน (เหรียญ)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={1000000}
                                value={cfg.price_coins_weekly}
                                onChange={(e) =>
                                  updateTierField(
                                    tierKey,
                                    'price_coins_weekly',
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#d6b36a] font-bold outline-none focus:border-[#d6b36a]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                                🪙 ราคา 30 วัน (เหรียญ)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={1000000}
                                value={cfg.price_coins_monthly}
                                onChange={(e) =>
                                  updateTierField(
                                    tierKey,
                                    'price_coins_monthly',
                                    Number(e.target.value),
                                  )
                                }
                                className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#d6b36a] font-bold outline-none focus:border-[#d6b36a]"
                              />
                            </div>
                          </div>
                        )}

                        {tierKey !== 'free' && (
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              💳 ราคาอ้างอิงรายเดือน (บาท / เดือน)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={99999}
                              value={cfg.price_thb_monthly}
                              onChange={(e) =>
                                updateTierField(
                                  tierKey,
                                  'price_thb_monthly',
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              🎴 ปัดได้/รอบ (ใบ)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={200}
                              value={cfg.swipe_batch_size}
                              onChange={(e) =>
                                updateTierField(tierKey, 'swipe_batch_size', Number(e.target.value))
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              ⏱️ รีรอบปัด (ชม.)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={48}
                              value={cfg.swipe_window_hours}
                              onChange={(e) =>
                                updateTierField(
                                  tierKey,
                                  'swipe_window_hours',
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              🫧 Bubble (ฟอง/วัน)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={9999}
                              value={cfg.daily_bubble_limit}
                              onChange={(e) =>
                                updateTierField(
                                  tierKey,
                                  'daily_bubble_limit',
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              ✨ Golden Bubble/วัน
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={cfg.daily_golden_bubbles}
                              onChange={(e) =>
                                updateTierField(
                                  tierKey,
                                  'daily_golden_bubbles',
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              ⏳ Match หมดอายุ (ชม.)
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={720}
                              value={cfg.match_expiry_hours}
                              onChange={(e) =>
                                updateTierField(
                                  tierKey,
                                  'match_expiry_hours',
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#a69d90] mb-1">
                              🤖 ค่า AI ต่อครั้ง (🪙)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={10000}
                              value={cfg.ai_coin_cost_per_use}
                              onChange={(e) =>
                                updateTierField(
                                  tierKey,
                                  'ai_coin_cost_per_use',
                                  Number(e.target.value),
                                )
                              }
                              className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3 py-2 text-xs text-[#e9a9bf] font-bold outline-none focus:border-[#e9a9bf]"
                            />
                          </div>
                        </div>

                        {/* Feature Flags Toggles */}
                        <div className="pt-2 space-y-2.5">
                          <span className="block text-[11px] font-bold text-[#a69d90] uppercase tracking-wider">
                            สิทธิ์การเข้าถึงฟีเจอร์ (Feature Flags)
                          </span>

                          {[
                            {
                              key: 'allow_ai_assistant',
                              label: '🤖 ผู้ช่วย AI ส่วนตัวฟรีไม่อั้น (AI Wingman)',
                              desc: 'ช่วยคิดประโยคทัก Space & แนะนำคำตอบแชทฟรี',
                            },
                            {
                              key: 'allow_rewind',
                              label: '⏪ ย้อนการ์ดที่ปัดผ่าน (Rewind)',
                              desc: 'กดย้อนกลับมาดูการ์ดที่เผลอปัดซ้าย',
                            },
                            {
                              key: 'allow_see_likes',
                              label: '👀 ดูคนที่กดถูกใจเราก่อน (See Who Liked)',
                              desc: 'เปิดดูคนที่กดสนใจเราได้ทั้งหมด',
                            },
                            {
                              key: 'allow_spotlight_post',
                              label: '📌 ปักหมุดโพสต์ Spotlight ใน Space',
                              desc: 'ดันโพสต์ขึ้นโดดเด่นในฟีด',
                            },
                            {
                              key: 'allow_advanced_filters',
                              label: '🎯 ตัวกรองค้นหาขั้นสูง',
                              desc: 'กรองย่าน / ความสนใจตรงกันได้ละเอียดขึ้น',
                            },
                          ].map((f) => {
                            const val = Boolean(cfg[f.key as keyof TierConfig]);
                            return (
                              <div
                                key={f.key}
                                className="flex items-center justify-between rounded-xl bg-[#25221f] p-2.5 gap-2"
                              >
                                <div>
                                  <p className="text-xs font-semibold text-[#f2eadb]">{f.label}</p>
                                  <p className="text-[10px] text-[#a69d90]">{f.desc}</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTierField(
                                      tierKey,
                                      f.key as keyof TierConfig,
                                      !val as unknown as TierConfig[keyof TierConfig],
                                    )
                                  }
                                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
                                    val
                                      ? tierKey === 'premium'
                                        ? 'bg-[#e9a9bf]'
                                        : 'bg-[#d6b36a]'
                                      : 'bg-[#1b1917]'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                      val ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#2a2724]">
                      <button
                        onClick={() => handleSaveTierConfig(tierKey)}
                        disabled={savingTier === tierKey}
                        className={`w-full rounded-full py-2.5 text-xs font-bold transition disabled:opacity-50 ${meta.btnClass}`}
                      >
                        {savingTier === tierKey
                          ? 'กำลังบันทึก...'
                          : `💾 บันทึก ${cfg.display_name}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Admin Quick Tool: เติมเหรียญ Rukan Coin & ตั้งระดับ Pass รายบุคคล */}
            <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6 space-y-5">
              <div>
                <h3 className="font-display font-bold text-base text-[#f2eadb]">
                  🪙 จัดการเหรียญ Rukan Coin & ตั้งระดับ Pass รายบุคคล (Admin Quick Tool)
                </h3>
                <p className="text-xs text-[#a69d90]">
                  ใช้สำหรับเติมเหรียญเมื่อลูกค้าโอนผ่านเว็บ / แจกโบนัสกิจกรรม / หรือตั้งระดับ Pass
                  ให้บัญชีทดสอบ (เช่น demo:{' '}
                  <code className="text-[#d6b36a]">11111111-1111-1111-1111-111111111111</code>)
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#a69d90] mb-1">
                    👤 User ID (UUID ของผู้ใช้)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 11111111-1111-1111-1111-111111111111"
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded-xl border border-[#2a2724] bg-[#25221f] px-3.5 py-2.5 font-mono text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                  />
                </div>

                {/* ฟอร์มเติม/หักเหรียญ */}
                <form
                  onSubmit={handleGrantCoins}
                  className="rounded-2xl border border-[#2a2724] bg-[#25221f]/60 p-4 space-y-3"
                >
                  <span className="block text-xs font-bold text-[#d6b36a]">
                    🪙 เติม / ปรับยอดเหรียญ Rukan Coin
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={coinDelta}
                      onChange={(e) => setCoinDelta(Number(e.target.value))}
                      placeholder="จำนวนเหรียญ (+ / -)"
                      className="rounded-xl border border-[#2a2724] bg-[#1b1917] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                    />
                    <input
                      type="text"
                      value={coinNote}
                      onChange={(e) => setCoinNote(e.target.value)}
                      placeholder="หมายเหตุ (เช่น เติมเว็บ 249฿)"
                      className="rounded-xl border border-[#2a2724] bg-[#1b1917] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#d6b36a]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={grantingCoins || !targetUserId.trim()}
                    className="w-full rounded-full bg-[#d6b36a] py-2 text-xs font-bold text-[#0f0e0d] hover:bg-[#e4c278] transition disabled:opacity-50"
                  >
                    {grantingCoins ? 'กำลังดำเนินการ...' : '🪙 ยืนยันปรับยอดเหรียญ'}
                  </button>
                </form>

                {/* ฟอร์มตั้งระดับ Pass โดยตรง */}
                <form
                  onSubmit={handleSetManualPass}
                  className="rounded-2xl border border-[#2a2724] bg-[#25221f]/60 p-4 space-y-3"
                >
                  <span className="block text-xs font-bold text-[#e9a9bf]">
                    🎫 ตั้งระดับ Pass ให้ผู้ใช้โดยตรง
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={manualPassTier}
                      onChange={(e) => setManualPassTier(e.target.value as SubscriptionTier)}
                      className="rounded-xl border border-[#2a2724] bg-[#1b1917] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#e9a9bf]"
                    >
                      <option value="free">🌱 Free Tier</option>
                      <option value="gold">🥇 Gold Pass</option>
                      <option value="premium">💎 Premium Pass</option>
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={manualPassDays}
                      onChange={(e) => setManualPassDays(Number(e.target.value))}
                      disabled={manualPassTier === 'free'}
                      placeholder="จำนวนวัน"
                      className="rounded-xl border border-[#2a2724] bg-[#1b1917] px-3 py-2 text-xs text-[#f2eadb] outline-none focus:border-[#e9a9bf] disabled:opacity-40"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={settingPass || !targetUserId.trim()}
                    className="w-full rounded-full bg-[#e9a9bf] py-2 text-xs font-bold text-[#0f0e0d] hover:bg-[#f2bdd0] transition disabled:opacity-50"
                  >
                    {settingPass ? 'กำลังบันทึก...' : '🎫 ตั้งระดับ Pass ทันที'}
                  </button>
                </form>
              </div>
            </div>

            {/* Comparison Table (Feature Matrix: Free | Gold | Premium) */}
            <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6 space-y-4">
              <div>
                <h3 className="font-display font-bold text-base text-[#f2eadb]">
                  ⚖️ ตารางเปรียบเทียบสิทธิ์ทั้ง 3 ระดับ (Free · Gold Pass · Premium Pass)
                </h3>
                <p className="text-xs text-[#a69d90]">
                  มุมมองสรุปที่ซิงค์ตรงกับฐานข้อมูลสำหรับแสดงในหน้าแลกเหรียญ Rukan Coin บนแอป
                </p>
              </div>

              {(() => {
                const free = tierConfigs.find((t) => t.tier === 'free');
                const gold = tierConfigs.find((t) => t.tier === 'gold');
                const premium = tierConfigs.find((t) => t.tier === 'premium');
                if (!free || !gold || !premium) return null;

                const comparisonRows = [
                  {
                    feature: 'แลกด้วยเหรียญ Rukan Coin (7 วัน / 30 วัน)',
                    freeVal: 'ฟรี (0 🪙)',
                    goldVal: `${gold.price_coins_weekly.toLocaleString()} 🪙 / ${gold.price_coins_monthly.toLocaleString()} 🪙 (~${gold.price_thb_monthly}฿)`,
                    premVal: `${premium.price_coins_weekly.toLocaleString()} 🪙 / ${premium.price_coins_monthly.toLocaleString()} 🪙 (~${premium.price_thb_monthly}฿)`,
                  },
                  {
                    feature: 'โควตาปัดการ์ด Drop ต่อรอบ',
                    freeVal: `${free.swipe_batch_size} ใบ / ${free.swipe_window_hours} ชม.`,
                    goldVal: `${gold.swipe_batch_size} ใบ / ${gold.swipe_window_hours} ชม.`,
                    premVal: `${premium.swipe_batch_size} ใบ / ${premium.swipe_window_hours} ชม.`,
                  },
                  {
                    feature: 'โควตาส่ง Bubble ทักจากโพสต์ Space',
                    freeVal: `${free.daily_bubble_limit} ฟอง / วัน`,
                    goldVal: `${gold.daily_bubble_limit} ฟอง / วัน`,
                    premVal: `${premium.daily_bubble_limit} ฟอง / วัน`,
                  },
                  {
                    feature: 'Golden Bubble (ฟองสีทอง แจ้งเตือนพิเศษ)',
                    freeVal:
                      free.daily_golden_bubbles > 0 ? `${free.daily_golden_bubbles} ฟอง/วัน` : '—',
                    goldVal: `${gold.daily_golden_bubbles} ฟอง / วัน`,
                    premVal: `${premium.daily_golden_bubbles} ฟอง / วัน`,
                  },
                  {
                    feature: '🤖 ผู้ช่วย AI ส่วนตัว (Rukan AI Wingman)',
                    freeVal: free.allow_ai_assistant
                      ? '✓ ฟรีไม่อั้น'
                      : `ลองใช้ ${free.ai_coin_cost_per_use} 🪙 / ครั้ง`,
                    goldVal: gold.allow_ai_assistant
                      ? '✓ ฟรีไม่อั้น'
                      : `ลองใช้ ${gold.ai_coin_cost_per_use} 🪙 / ครั้ง`,
                    premVal: premium.allow_ai_assistant
                      ? '✓ ใช้ผู้ช่วย AI ฟรีไม่อั้น!'
                      : `${premium.ai_coin_cost_per_use} 🪙 / ครั้ง`,
                  },
                  {
                    feature: 'ปัดย้อนกลับ (Rewind) คนที่เผลอปัดข้าม',
                    freeVal: free.allow_rewind ? '✓ ย้อนได้' : '—',
                    goldVal: gold.allow_rewind ? '✓ ย้อนได้' : '—',
                    premVal: premium.allow_rewind ? '✓ ย้อนได้ไม่จำกัด' : '—',
                  },
                  {
                    feature: 'เวลาหมดอายุห้องแชท Match (ถ้ายังไม่ทัก)',
                    freeVal: `${free.match_expiry_hours} ชม.`,
                    goldVal: `${gold.match_expiry_hours} ชม.`,
                    premVal: `${premium.match_expiry_hours} ชม.`,
                  },
                  {
                    feature: 'ดูคนที่กดสนใจเรา (See Who Likes You)',
                    freeVal: free.allow_see_likes ? '✓ เปิดดูได้' : 'เบลอ',
                    goldVal: gold.allow_see_likes ? '✓ เปิดดูได้ทั้งหมด' : 'เบลอ',
                    premVal: premium.allow_see_likes ? '✓ เปิดดูได้ + แมตช์ทันที' : 'เบลอ',
                  },
                  {
                    feature: 'ดันโพสต์ใน Space (Spotlight Boost)',
                    freeVal: free.allow_spotlight_post ? '✓ เปิดใช้ได้' : '—',
                    goldVal: gold.allow_spotlight_post ? '✓ เปิดใช้ได้' : '—',
                    premVal: premium.allow_spotlight_post ? '✓ เปิดใช้ได้' : '—',
                  },
                  {
                    feature: 'ตัวกรองขั้นสูง (ย่าน / ความสนใจตรงกัน)',
                    freeVal: free.allow_advanced_filters ? '✓ เปิดใช้ได้' : '—',
                    goldVal: gold.allow_advanced_filters ? '✓ เปิดใช้ได้' : '—',
                    premVal: premium.allow_advanced_filters ? '✓ เปิดใช้ได้ครบทุกมิติ' : '—',
                  },
                ];

                return (
                  <div className="overflow-x-auto pt-2">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#2a2724] text-[#a69d90] uppercase tracking-wider">
                          <th className="py-3 px-4">ฟีเจอร์ / สิทธิพิเศษ</th>
                          <th className="py-3 px-4">🌱 ผู้ใช้ทั่วไป (Free)</th>
                          <th className="py-3 px-4 text-[#d6b36a]">🥇 Gold Pass</th>
                          <th className="py-3 px-4 text-[#e9a9bf]">💎 Premium Pass (VIP + AI)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2724]">
                        {comparisonRows.map((r) => (
                          <tr key={r.feature} className="hover:bg-[#25221f]/50 transition">
                            <td className="py-3.5 px-4 font-medium text-[#f2eadb]">{r.feature}</td>
                            <td className="py-3.5 px-4 text-[#a69d90]">{r.freeVal}</td>
                            <td className="py-3.5 px-4 font-semibold text-[#d6b36a]">
                              {r.goldVal}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-[#e9a9bf]">
                              {r.premVal}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 3: ตรวจรายงาน (Reports) */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f2eadb]">🛡️ คิวตรวจสอบเรื่องร้องเรียน</h2>
                <p className="text-xs text-[#a69d90]">
                  รายงานการทำผิดกฎชุมชนจาก Space, แชท, และโปรไฟล์
                </p>
              </div>

              <div className="flex rounded-full border border-[#2a2724] bg-[#1b1917] p-1">
                {(['open', 'actioned', 'dismissed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setReportFilter(st);
                      void loadReports(st);
                    }}
                    className={`rounded-full px-3.5 py-1 text-xs font-bold transition capitalize ${
                      reportFilter === st
                        ? 'bg-[#d6b36a] text-[#0f0e0d]'
                        : 'text-[#a69d90] hover:text-[#f2eadb]'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-300 uppercase">
                          {rep.reason}
                        </span>
                        <span className="rounded-full bg-[#25221f] px-2.5 py-0.5 text-xs text-[#a69d90]">
                          เป้าหมาย: {rep.target_type}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#f2eadb]">
                        {rep.details ?? 'ไม่มีรายละเอียดเพิ่มเติม'}
                      </p>
                    </div>
                    <span className="text-xs text-[#a69d90]">
                      {new Date(rep.created_at).toLocaleString('th-TH')}
                    </span>
                  </div>

                  {rep.status === 'open' && (
                    <div className="flex flex-wrap items-center gap-2 border-t border-[#2a2724] pt-4">
                      <button
                        onClick={() => handleTakeAction(rep, 'warn')}
                        className="rounded-full bg-yellow-500/20 px-3.5 py-1.5 text-xs font-semibold text-yellow-300 hover:bg-yellow-500/30 transition"
                      >
                        ตักเตือน (Warn)
                      </button>
                      <button
                        onClick={() => handleTakeAction(rep, 'hide_content')}
                        className="rounded-full bg-orange-500/20 px-3.5 py-1.5 text-xs font-semibold text-orange-300 hover:bg-orange-500/30 transition"
                      >
                        ซ่อนเนื้อหา (Hide)
                      </button>
                      <button
                        onClick={() => handleTakeAction(rep, 'suspend', 7)}
                        className="rounded-full bg-red-500/20 px-3.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition"
                      >
                        ระงับ 7 วัน
                      </button>
                      <button
                        onClick={() => handleTakeAction(rep, 'ban')}
                        className="rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition"
                      >
                        แบนถาวร (Ban)
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {reports.length === 0 && (
                <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-12 text-center text-sm text-[#a69d90]">
                  ไม่มีรายงานที่ค้างอยู่ในสถานะนี้ ✨
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: คำอุทธรณ์ (Appeals) */}
        {activeTab === 'appeals' && (
          <div className="rounded-3xl border border-[#2a2724] bg-[#1b1917] p-6 space-y-4">
            <h2 className="text-lg font-bold text-[#f2eadb]">⚖️ คำอุทธรณ์จากผู้ใช้ที่ถูกระงับ</h2>
            <p className="text-xs text-[#a69d90]">
              ผู้ใช้สามารถยื่นอุทธรณ์ได้ภายใน 14 วันหลังถูกลงโทษ (ผู้ตรวจต้องไม่ใช่ Moderator
              คนเดียวกับผู้สั่งลงโทษ)
            </p>
            {appeals.length > 0 ? (
              <div className="space-y-4">
                {appeals.map((ap) => (
                  <div
                    key={ap.id}
                    className="rounded-2xl border border-[#2a2724] bg-[#25221f] p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#f2eadb]">
                            {ap.display_name}
                          </span>
                          <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-300 uppercase">
                            {ap.action} (Level {ap.level})
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#a69d90]">เหตุผลเดิม: {ap.reason}</p>
                      </div>
                      <span className="text-xs text-[#a69d90]">
                        {ap.appealed_at ? new Date(ap.appealed_at).toLocaleString('th-TH') : ''}
                      </span>
                    </div>
                    <p className="rounded-xl bg-[#1b1917] p-3 text-sm text-[#f2eadb]">
                      {ap.appeal_text ?? '—'}
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleReviewAppeal(ap.id, 'accepted')}
                        className="rounded-full bg-emerald-500/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                      >
                        ✓ อนุมัติคำอุทธรณ์ & ปลดระงับ
                      </button>
                      <button
                        onClick={() => handleReviewAppeal(ap.id, 'rejected')}
                        className="rounded-full bg-red-500/20 px-3.5 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/30 transition"
                      >
                        ✕ ปฏิเสธคำอุทธรณ์
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#2a2724] bg-[#25221f] p-8 text-center text-sm text-[#a69d90]">
                ยังไม่มีคำร้องอุทธรณ์ที่ค้างอยู่
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
