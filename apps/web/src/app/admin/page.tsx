'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';

type TabKey = 'overview' | 'waitlist' | 'reports' | 'appeals' | 'audit';

interface DashboardCounts {
  waitlist_total: number;
  reports_pending: number;
  appeals_pending: number;
  active_suspensions: number;
}

interface WaitlistStats {
  total_count: number;
  today_count: number;
  by_area: { area: string; count: number }[];
  by_age_band: { age_band: string; count: number }[];
  by_locale: { locale: string; count: number }[];
}

interface WaitlistRow {
  id: string;
  email: string;
  area: string;
  age_band: string | null;
  intents: string[];
  locale: string;
  consented_at: string;
  created_at: string;
}

interface ReportRow {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const supabase = createClient();

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
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [waitlistRows, setWaitlistRows] = useState<WaitlistRow[]>([]);
  const [searchWaitlist, setSearchWaitlist] = useState('');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportFilter, setReportFilter] = useState<'open' | 'actioned' | 'dismissed'>('open');

  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // โหลดข้อมูล Dashboard
  const refreshAdminData = useCallback(async () => {
    try {
      const { data: countsData, error: countsError } = await supabase.rpc(
        'mod_get_dashboard_counts',
      );
      if (countsError) {
        setIsModerator(false);
        return;
      }
      setIsModerator(true);
      setCounts(countsData as unknown as DashboardCounts);

      const { data: statsData } = await supabase.rpc('mod_get_waitlist_stats');
      if (statsData) setStats(statsData as unknown as WaitlistStats);

      const { data: wlData } = await supabase.rpc('mod_list_waitlist', {
        p_limit: 100,
        p_offset: 0,
      });
      if (wlData) setWaitlistRows(wlData as unknown as WaitlistRow[]);

      const { data: repData } = await supabase.rpc('mod_list_reports', {
        p_status: 'open',
        p_limit: 50,
      });
      if (repData) setReports(repData as unknown as ReportRow[]);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  }, [supabase]);

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

        const { data: countsData, error: countsError } = await supabase.rpc(
          'mod_get_dashboard_counts',
        );

        if (ignore) return;
        if (countsError) {
          setIsModerator(false);
        } else {
          setIsModerator(true);
          setCounts(countsData as unknown as DashboardCounts);

          const { data: statsData } = await supabase.rpc('mod_get_waitlist_stats');
          if (!ignore && statsData) setStats(statsData as unknown as WaitlistStats);

          const { data: wlData } = await supabase.rpc('mod_list_waitlist', {
            p_limit: 100,
            p_offset: 0,
          });
          if (!ignore && wlData) setWaitlistRows(wlData as unknown as WaitlistRow[]);

          const { data: repData } = await supabase.rpc('mod_list_reports', {
            p_status: 'open',
            p_limit: 50,
          });
          if (!ignore && repData) setReports(repData as unknown as ReportRow[]);
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
  }, [supabase]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginPending(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        setLoginError(error.message);
      } else {
        await refreshAdminData();
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
    } finally {
      setLoginPending(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setIsModerator(false);
    setCurrentUserEmail(null);
  }

  async function loadWaitlist(search: string) {
    const { data } = await supabase.rpc('mod_list_waitlist', {
      p_limit: 100,
      p_offset: 0,
      p_search: search || undefined,
    });
    if (data) setWaitlistRows(data as unknown as WaitlistRow[]);
  }

  async function loadReports(status: 'open' | 'actioned' | 'dismissed') {
    const { data } = await supabase.rpc('mod_list_reports', {
      p_status: status,
      p_limit: 50,
    });
    if (data) setReports(data as unknown as ReportRow[]);
  }

  async function handleTakeAction(
    report: ReportRow,
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

        const { error } = await supabase.rpc('mod_take_action', {
          p_user_id: report.target_id,
          p_action: action,
          p_level: level,
          p_reason: `Action taken by admin (${action})`,
          p_report_id: report.id,
          p_target_type: report.target_type,
          p_target_id: report.target_id,
          p_until: untilDate,
        });

        if (error) {
          setActionMessage(`เกิดข้อผิดพลาด: ${error.message}`);
        } else {
          setActionMessage(`ดำเนินการ ${action} สำเร็จ`);
          await loadReports(reportFilter);
          const { data: countsData } = await supabase.rpc('mod_get_dashboard_counts');
          if (countsData) setCounts(countsData as unknown as DashboardCounts);
        }
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
            { key: 'reports', label: '🛡️ ตรวจรายงาน', badge: counts?.reports_pending },
            { key: 'appeals', label: '⚖️ คำอุทธรณ์', badge: counts?.appeals_pending },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setActiveTab(item.key as TabKey);
                if (item.key === 'reports') loadReports(reportFilter);
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
              ผู้ใช้สามารถยื่นอุทธรณ์ได้ภายใน 14 วันหลังถูกลงโทษ (ตามข้อกำหนดนโยบายความโปร่งใส)
            </p>
            <div className="rounded-2xl border border-[#2a2724] bg-[#25221f] p-8 text-center text-sm text-[#a69d90]">
              ยังไม่มีคำร้องอุทธรณ์ที่ค้างอยู่
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
