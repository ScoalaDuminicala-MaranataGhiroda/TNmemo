import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coffee,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  KeyRound,
  Link as LinkIcon,
  Lock,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Sun,
  Ticket,
  Trash2,
  Trophy,
  Upload,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  parseScheduleTxt,
  DEFAULT_PLAN_TXT,
} from './lib/scheduleParser';
import {
  initAndFetchAllData,
  saveScheduleTxt,
  saveAdminPassword,
  upsertCompetitor,
  deleteCompetitor,
  toggleVerseLearned,
  setBatchVersesForCompetitor,
  saveCompetitorTicket,
  replaceAllTeams,
  addMaterialLink,
  deleteMaterialLink,
} from './lib/db';
import { generateTeamsList } from './lib/teamGenerator';

export default function App() {
  // Tema (Dark implicit, cu salvare in localStorage)
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('tnmemo_theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('tnmemo_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('tnmemo_theme', 'light');
    }
  }, [darkMode]);

  // Stare de incarcare & date DB
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState('local');
  const [scheduleTxt, setScheduleTxt] = useState(DEFAULT_PLAN_TXT);
  const [adminPassword, setAdminPassword] = useState('talantul');
  const [competitors, setCompetitors] = useState([]);
  const [progress, setProgress] = useState([]);
  const [teams, setTeams] = useState([]);
  const [materials, setMaterials] = useState([]);

  // Navigare: 'public' (Concurent/General - implicit la deschidere) sau 'admin'
  const [viewMode, setViewMode] = useState('public');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('tnmemo_admin_unlocked') === '1';
  });

  // Modal parola Admin
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Modal calendar complet
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  // Filtrare si sortare concurenti pe pagina generala
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('learned_desc');

  // State-uri specifice panoului de Admin
  const [adminTab, setAdminTab] = useState('progress'); // 'progress' | 'competitors' | 'teams' | 'schedule' | 'materials'
  const [selectedCompForVerses, setSelectedCompForVerses] = useState(null);
  const [compForm, setCompForm] = useState({ id: '', name: '', grade: '', active: true });
  const [isEditingComp, setIsEditingComp] = useState(false);
  const [teamCriterion, setTeamCriterion] = useState('support');
  const [showTeamConfirmModal, setShowTeamConfirmModal] = useState(false);
  const [txtDraft, setTxtDraft] = useState('');
  const [materialForm, setMaterialForm] = useState({ url: '', description: '' });
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Incarcare date la pornire
  const loadAll = async () => {
    setLoading(true);
    try {
      const data = await initAndFetchAllData();
      setDbMode(data.mode);
      setScheduleTxt(data.scheduleTxt);
      setTxtDraft(data.scheduleTxt);
      setAdminPassword(data.adminPassword);
      setCompetitors(data.competitors);
      setProgress(data.progress);
      setTeams(data.teams);
      setMaterials(data.materials);
    } catch (err) {
      console.error('Eroare la incarcarea datelor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Parsare orar .txt tinand cont de fusul orar din Timisoara (Europe/Bucharest)
  const schedule = useMemo(() => parseScheduleTxt(scheduleTxt), [scheduleTxt]);

  // Set de chei valide din fisierul curent
  const validVerseKeysSet = useMemo(() => {
    return new Set(schedule.allVerses.map((v) => v.verseKey));
  }, [schedule.allVerses]);

  // Mapare: competitor_id -> Set(verseKey) doar pentru versetele din fisierul curent
  const learnedMap = useMemo(() => {
    const map = {};
    for (const c of competitors) {
      map[c.id] = new Set();
    }
    for (const p of progress) {
      if (validVerseKeysSet.has(p.verse_key)) {
        if (!map[p.competitor_id]) map[p.competitor_id] = new Set();
        map[p.competitor_id].add(p.verse_key);
      }
    }
    return map;
  }, [competitors, progress, validVerseKeysSet]);

  // Numar total versete in plan si numar versete scadente pana azi (inclusiv azi daca nu e pauza)
  const totalMaxVerses = schedule.allVerses.length;
  const dueUpToTodayCount = schedule.versesDueUpToToday.length;

  // Concurenti activi vs toti
  const activeCompetitors = useMemo(
    () => competitors.filter((c) => Boolean(c.active)),
    [competitors]
  );

  // Calcul statistici pentru fiecare concurent
  const competitorsWithStats = useMemo(() => {
    return competitors.map((c) => {
      const learnedSet = learnedMap[c.id] || new Set();
      const learnedCount = learnedSet.size;

      // % din totalul final de versete
      const pctOfFinalTotal =
        totalMaxVerses > 0 ? Math.round((learnedCount / totalMaxVerses) * 1000) / 10 : 0;

      // % din totalul versetelor care trebuiau invatate pana in ziua respectiva (inclusiv azi daca exista)
      const pctOfDueToday =
        dueUpToTodayCount > 0
          ? Math.min(100, Math.round((learnedCount / dueUpToTodayCount) * 1000) / 10)
          : learnedCount > 0
          ? 100
          : 0;

      return {
        ...c,
        isActive: Boolean(c.active),
        learnedCount,
        totalMaxVerses,
        dueUpToTodayCount,
        pctOfFinalTotal,
        pctOfDueToday,
      };
    });
  }, [competitors, learnedMap, totalMaxVerses, dueUpToTodayCount]);

  // Procentul general pe grupa (SE EXCLUD CONCURENTII INACTIVI)
  const groupStats = useMemo(() => {
    const activeCount = activeCompetitors.length;
    const groupTotalPossible = activeCount * totalMaxVerses;
    let groupTotalLearned = 0;

    for (const c of activeCompetitors) {
      groupTotalLearned += (learnedMap[c.id] || new Set()).size;
    }

    const groupPercent =
      groupTotalPossible > 0
        ? Math.round((groupTotalLearned / groupTotalPossible) * 1000) / 10
        : 0;

    return {
      activeCount,
      inactiveCount: competitors.length - activeCount,
      groupTotalLearned,
      groupTotalPossible,
      groupPercent,
    };
  }, [activeCompetitors, competitors.length, learnedMap, totalMaxVerses]);

  // Statistici echipe (doar concurentii activi din fiecare echipa)
  const teamsWithStats = useMemo(() => {
    const compById = {};
    for (const c of competitorsWithStats) {
      compById[c.id] = c;
    }

    return teams
      .map((team) => {
        // Excludem automat concurentii inactivi sau stersi
        const activeMembers = (team.memberIds || [])
          .map((id) => compById[id])
          .filter((c) => c && c.isActive);

        const teamLearned = activeMembers.reduce((acc, m) => acc + m.learnedCount, 0);
        const teamTotal = activeMembers.length * totalMaxVerses;
        const teamPercent =
          teamTotal > 0 ? Math.round((teamLearned / teamTotal) * 1000) / 10 : 0;

        return {
          ...team,
          members: activeMembers,
          teamLearned,
          teamTotal,
          teamPercent,
        };
      })
      .filter((t) => t.members.length > 0);
  }, [teams, competitorsWithStats, totalMaxVerses]);

  // Clase unice pentru filtru
  const uniqueGrades = useMemo(() => {
    const set = new Set(competitors.map((c) => c.grade).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ro'));
  }, [competitors]);

  // Lista filtrata si ordonata a concurentilor (Activi primii, Inactivi la urma grayed out)
  const filteredCompetitors = useMemo(() => {
    return competitorsWithStats
      .filter((c) => {
        const matchesSearch =
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.grade.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesGrade = gradeFilter === 'all' || c.grade === gradeFilter;
        return matchesSearch && matchesGrade;
      })
      .sort((a, b) => {
        // Concurentii activi sunt intotdeauna deasupra celor inactivi
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        if (sortBy === 'learned_desc') {
          if (b.learnedCount !== a.learnedCount) return b.learnedCount - a.learnedCount;
          return a.name.localeCompare(b.name, 'ro');
        }
        if (sortBy === 'name_asc') {
          return a.name.localeCompare(b.name, 'ro');
        }
        if (sortBy === 'grade_asc') {
          const g = a.grade.localeCompare(b.grade, 'ro');
          return g !== 0 ? g : a.name.localeCompare(b.name, 'ro');
        }
        return 0;
      });
  }, [competitorsWithStats, searchQuery, gradeFilter, sortBy]);

  // Selectare automata a primului concurent in tab-ul Admin -> Versete
  useEffect(() => {
    if (!selectedCompForVerses && competitors.length > 0) {
      const firstActive = competitors.find((c) => c.active) || competitors[0];
      setSelectedCompForVerses(firstActive.id);
    }
  }, [competitors, selectedCompForVerses]);

  // Handlers Admin Login
  const handleAdminButtonClick = () => {
    if (viewMode === 'admin') {
      setViewMode('public');
      return;
    }
    if (isAdminUnlocked) {
      setViewMode('admin');
    } else {
      setPasswordInput('');
      setLoginError('');
      setShowLoginModal(true);
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    if (passwordInput.trim() === adminPassword) {
      sessionStorage.setItem('tnmemo_admin_unlocked', '1');
      setIsAdminUnlocked(true);
      setShowLoginModal(false);
      setViewMode('admin');
      showToast('Mod Administrator activat!');
    } else {
      setLoginError('Parolă incorectă. Încearcă din nou.');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('tnmemo_admin_unlocked');
    setIsAdminUnlocked(false);
    setViewMode('public');
    showToast('Te-ai deconectat din panoul Admin.');
  };

  // Handlers Admin: Incarcare fisier .txt
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = String(ev.target?.result || '');
      const parsed = parseScheduleTxt(content);
      if (!parsed.isValid) {
        alert(parsed.error);
        return;
      }
      setTxtDraft(content);
      setScheduleTxt(content);
      await saveScheduleTxt(content);
      showToast(`Fișierul "${file.name}" (${parsed.bookName}) a fost încărcat cu succes!`);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSaveScheduleDraft = async () => {
    const parsed = parseScheduleTxt(txtDraft);
    if (!parsed.isValid) {
      alert(parsed.error);
      return;
    }
    setScheduleTxt(txtDraft);
    await saveScheduleTxt(txtDraft);
    showToast(`Planul pentru cartea "${parsed.bookName}" a fost salvat!`);
  };

  // Handlers Admin: Concurenti
  const handleCompSubmit = async (e) => {
    e.preventDefault();
    if (!compForm.name.trim() || !compForm.grade.trim()) return;
    await upsertCompetitor({
      id: compForm.id || undefined,
      name: compForm.name.trim(),
      grade: compForm.grade.trim(),
      active: compForm.active,
    });
    const refreshed = await initAndFetchAllData();
    setCompetitors(refreshed.competitors);
    setTeams(refreshed.teams);
    setCompForm({ id: '', name: '', grade: '', active: true });
    setIsEditingComp(false);
    showToast(isEditingComp ? 'Concurent actualizat!' : 'Concurent adăugat!');
  };

  const handleToggleCompActive = async (comp) => {
    const nextActive = !Boolean(comp.active);
    await upsertCompetitor({
      id: comp.id,
      name: comp.name,
      grade: comp.grade,
      active: nextActive,
    });
    const refreshed = await initAndFetchAllData();
    setCompetitors(refreshed.competitors);
    setTeams(refreshed.teams);
    showToast(
      nextActive
        ? `${comp.name} este acum ACTIV.`
        : `${comp.name} a fost marcat INACTIV.`
    );
  };

  const handleToggleTicket = async (comp, ticketIndex) => {
    const active = !Boolean(comp.tickets?.[ticketIndex]);
    setCompetitors((prev) =>
      prev.map((competitor) => {
        if (competitor.id !== comp.id) return competitor;
        const tickets = [0, 1, 2].map((index) => Boolean(competitor.tickets?.[index]));
        tickets[ticketIndex] = active;
        return { ...competitor, tickets };
      })
    );
    await saveCompetitorTicket(comp.id, ticketIndex, active);
    showToast(`${comp.name}: tichetul ${ticketIndex + 1} ${active ? 'activat' : 'dezactivat'}.`);
  };

  const handleDeleteCompetitor = async (comp) => {
    if (!window.confirm(`Sigur dorești să ștergi definitiv concurentul "${comp.name}"?`)) return;
    await deleteCompetitor(comp.id);
    const refreshed = await initAndFetchAllData();
    setCompetitors(refreshed.competitors);
    setProgress(refreshed.progress);
    setTeams(refreshed.teams);
    showToast(`Concurentul ${comp.name} a fost șters.`);
  };

  // Handlers Admin: Bifare versete
  const handleToggleSingleVerse = async (competitorId, verseKey) => {
    const currentSet = learnedMap[competitorId] || new Set();
    const shouldLearn = !currentSet.has(verseKey);

    // Optimistic UI update
    if (shouldLearn) {
      setProgress((prev) => [...prev, { competitor_id: competitorId, verse_key: verseKey }]);
    } else {
      setProgress((prev) =>
        prev.filter((p) => !(p.competitor_id === competitorId && p.verse_key === verseKey))
      );
    }

    await toggleVerseLearned(competitorId, verseKey, shouldLearn);
  };

  const handleBatchVerses = async (competitorId, verseKeys, shouldLearn) => {
    await setBatchVersesForCompetitor(competitorId, verseKeys, shouldLearn);
    const refreshed = await initAndFetchAllData();
    setProgress(refreshed.progress);
    showToast(shouldLearn ? 'Versetele au fost bifate!' : 'Versetele au fost debifate!');
  };

  // Handlers Admin: Generare echipe cu popup de confirmare
  const handleConfirmGenerateTeams = async () => {
    const learnedCounts = {};
    for (const c of activeCompetitors) {
      learnedCounts[c.id] = (learnedMap[c.id] || new Set()).size;
    }
    const generated = generateTeamsList(activeCompetitors, learnedCounts, teamCriterion);
    await replaceAllTeams(generated);
    setTeams(generated);
    setShowTeamConfirmModal(false);
    showToast(
      `Au fost generate ${generated.length} echipe după criteriul "${
        teamCriterion === 'support' ? 'Suport (Max + Min)' : 'Aleator'
      }"!`
    );
  };

  // Handlers Admin: Materiale
  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!materialForm.url.trim() || !materialForm.description.trim()) return;
    let formattedUrl = materialForm.url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }
    const created = await addMaterialLink({
      url: formattedUrl,
      description: materialForm.description.trim(),
    });
    setMaterials((prev) => [created, ...prev]);
    setMaterialForm({ url: '', description: '' });
    showToast('Materialul a fost adăugat!');
  };

  const handleDeleteMaterial = async (id) => {
    await deleteMaterialLink(id);
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    showToast('Link-ul a fost șters.');
  };

  const handleSaveNewPassword = async (e) => {
    e.preventDefault();
    if (!newPasswordInput.trim() || newPasswordInput.trim().length < 3) {
      alert('Parola trebuie să aibă cel puțin 3 caractere.');
      return;
    }
    await saveAdminPassword(newPasswordInput.trim());
    setAdminPassword(newPasswordInput.trim());
    setNewPasswordInput('');
    showToast('Parola de administrator a fost actualizată!');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#061612] text-slate-900 dark:text-slate-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-brand-600 text-white px-4 py-3 rounded-2xl shadow-xl border border-brand-400/30 flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/85 dark:bg-[#09201a]/90 border-b border-slate-200 dark:border-brand-900/60">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo & Titlu */}
          <div
            onClick={() => setViewMode('public')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src="./logo.png"
              alt="Logo Talantul în Negoț Memorare"
              className="w-11 h-11 rounded-xl shadow-md ring-2 ring-brand-500/40 group-hover:scale-105 transition-transform object-cover"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-none">
                  TN<span className="text-brand-600 dark:text-brand-400">memo</span>
                </h1>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-500/30">
                  {schedule.bookName || 'Memorare'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Talantul în Negoț • Secțiunea Memorare
              </p>
            </div>
          </div>

          {/* Actiuni Dreapta: Calendar, Tema, Panou Admin */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCalendarModal(true)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-brand-950/80 dark:hover:bg-brand-900/70 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-brand-800/60 transition"
              title="Calendarul complet al versetelor"
            >
              <Calendar className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-brand-950/80 dark:hover:bg-brand-900/70 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-brand-800/60 transition"
              title={darkMode ? 'Comută pe tema luminoasă' : 'Comută pe tema întunecată'}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            <button
              onClick={handleAdminButtonClick}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
                viewMode === 'admin'
                  ? 'bg-brand-500 text-white border-brand-400 shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-brand-950/80 dark:hover:bg-brand-900/80 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-brand-800/60'
              }`}
            >
              {viewMode === 'admin' ? (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Pagină Concurenți</span>
                </>
              ) : (
                <>
                  <Settings className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Admin</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-brand-500" />
            <p className="text-sm font-medium">Se încarcă datele concursului...</p>
          </div>
        ) : viewMode === 'admin' ? (
          /* ======================== PAGINA ADMIN ======================== */
          <div className="space-y-6">
            {/* Banner Status Admin */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Panou Administrator TNmemo</h2>
                  <p className="text-xs text-brand-100">
                    Mod stocare activ:{' '}
                    <span className="font-semibold underline">
                      {dbMode === 'turso'
                        ? 'Turso Cloud DB (Sincronizat pe toate telefoanele)'
                        : 'Mod Local Demo (localStorage - vezi GHID_CONFIGURARE.md pentru conectarea Turso)'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadAll}
                  className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reîncarcă
                </button>
                <button
                  onClick={handleAdminLogout}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Deconectare
                </button>
              </div>
            </div>

            {/* Meniu Tab-uri Admin */}
            <div className="flex overflow-x-auto gap-2 pb-1">
              {[
                { id: 'progress', label: '1. Bifare Versete', icon: CheckCircle2 },
                { id: 'competitors', label: '2. Concurenți', icon: Users },
                { id: 'teams', label: '3. Formare Echipe', icon: Shuffle },
                { id: 'schedule', label: '4. Fișier .TXT Plan', icon: FileText },
                { id: 'materials', label: '5. Materiale & Parolă', icon: LinkIcon },
              ].map((t) => {
                const Icon = t.icon;
                const active = adminTab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setAdminTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition border ${
                      active
                        ? 'bg-brand-500 text-white border-brand-400 shadow-md shadow-brand-500/20'
                        : 'bg-white dark:bg-[#0b241d] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-brand-900/60 hover:border-brand-500/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* TAB 1: BIFARE VERSETE */}
            {adminTab === 'progress' && (
              <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-brand-900/50 pb-4">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white">
                      Bifează versetele știute / parcurse
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Selectează un participant și apasă pe referințele din {schedule.bookName} pentru a le bifa sau debifa.
                    </p>
                  </div>

                  {/* Selector concurent */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedCompForVerses || ''}
                      onChange={(e) => setSelectedCompForVerses(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {competitors.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade}) {!c.active ? '- INACTIV' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedCompForVerses ? (
                  (() => {
                    const comp = competitorsWithStats.find((c) => c.id === selectedCompForVerses);
                    const learnedSet = learnedMap[selectedCompForVerses] || new Set();
                    const dueKeys = schedule.versesDueUpToToday.map((v) => v.verseKey);
                    const allKeys = schedule.allVerses.map((v) => v.verseKey);

                    return (
                      <div className="space-y-4">
                        {comp && (
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-[#061612]/90 border border-slate-200/80 dark:border-brand-900/60">
                            <div className="flex items-center gap-2.5">
                              <span className="font-bold text-sm">{comp.name}</span>
                              <span className="text-xs px-2 py-0.5 rounded-md bg-brand-500/15 text-brand-700 dark:text-brand-300 font-medium">
                                {comp.grade}
                              </span>
                              {!comp.isActive && (
                                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-semibold">
                                  Inactiv
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 mr-2">
                                Învățate: {comp.learnedCount} / {totalMaxVerses} ({comp.pctOfFinalTotal}%)
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBatchVerses(comp.id, dueKeys, true)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-brand-500/15 hover:bg-brand-500/25 text-brand-700 dark:text-brand-300 text-xs font-semibold transition"
                              >
                                + Bifează tot până azi ({dueKeys.length})
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBatchVerses(comp.id, allKeys, true)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-brand-900/60 dark:hover:bg-brand-800 text-xs font-semibold transition"
                              >
                                Bifează tot ({allKeys.length})
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleBatchVerses(comp.id, allKeys, false)
                                }
                                className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-semibold transition"
                              >
                                Resetează (0)
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Grid de butoane pentru fiecare verset din fisierul .txt */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                          {schedule.allVerses.map((v) => {
                            const isChecked = learnedSet.has(v.verseKey);
                            return (
                              <button
                                key={v.verseKey}
                                type="button"
                                onClick={() =>
                                  handleToggleSingleVerse(selectedCompForVerses, v.verseKey)
                                }
                                className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                                  isChecked
                                    ? 'bg-brand-500/15 border-brand-500 text-brand-900 dark:text-white shadow-sm'
                                    : v.isToday
                                    ? 'bg-amber-500/10 border-amber-500/60 text-slate-800 dark:text-slate-200'
                                    : 'bg-slate-50 dark:bg-[#061612]/60 border-slate-200 dark:border-brand-900/50 text-slate-600 dark:text-slate-400 hover:border-brand-500/40'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-extrabold text-sm">
                                    {schedule.bookName} {v.ref}
                                  </span>
                                  <div
                                    className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                                      isChecked
                                        ? 'bg-brand-500 border-brand-500 text-white'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px] opacity-80">
                                  <span>Ziua {v.dayNumber}</span>
                                  <span>{v.formattedDate}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-slate-500">Adaugă mai întâi un concurent.</p>
                )}
              </div>
            )}

            {/* TAB 2: CONCURENTI (ADAUGARE / EDITARE / ACTIV-INACTIV) */}
            {adminTab === 'competitors' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Formular Adaugare / Editare */}
                <form
                  onSubmit={handleCompSubmit}
                  className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-4 h-fit"
                >
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-brand-500" />
                    {isEditingComp ? 'Editează Concurent' : 'Adaugă Concurent Nou'}
                  </h3>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Nume și Prenume
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Andrei Popescu"
                      value={compForm.name}
                      onChange={(e) => setCompForm({ ...compForm, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                      Clasa / Grupa
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Clasa a IX-a"
                      value={compForm.grade}
                      onChange={(e) => setCompForm({ ...compForm, grade: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={compForm.active}
                      onChange={(e) => setCompForm({ ...compForm, active: e.target.checked })}
                      className="w-4 h-4 rounded accent-brand-500"
                    />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Concurent ACTIV (intră în echipe și în calculul % pe grupă)
                    </span>
                  </label>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition"
                    >
                      {isEditingComp ? 'Salvează Modificările' : 'Adaugă Concurent'}
                    </button>
                    {isEditingComp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingComp(false);
                          setCompForm({ id: '', name: '', grade: '', active: true });
                        }}
                        className="py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-brand-900 text-xs font-semibold"
                      >
                        Anulează
                      </button>
                    )}
                  </div>
                </form>

                {/* Lista concurenti */}
                <div className="md:col-span-2 bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base">
                      Listă Concurenți ({competitors.length} total • {activeCompetitors.length} activi)
                    </h3>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-brand-900/40">
                    {competitorsWithStats.map((c) => (
                      <div
                        key={c.id}
                        className={`py-3 flex flex-wrap items-center justify-between gap-3 ${
                          !c.isActive ? 'opacity-55' : ''
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{c.name}</span>
                            <div className="flex items-center gap-1" aria-label="Tichete concurent">
                              {[0, 1, 2].map((ticketIndex) => (
                                <button
                                  key={ticketIndex}
                                  type="button"
                                  onClick={() => handleToggleTicket(c, ticketIndex)}
                                  aria-label={`${c.tickets?.[ticketIndex] ? 'Dezactivează' : 'Activează'} tichetul ${ticketIndex + 1} pentru ${c.name}`}
                                  title={`Tichet ${ticketIndex + 1}: ${c.tickets?.[ticketIndex] ? 'activ' : 'inactiv'}`}
                                  className={`p-1 rounded-md transition hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                                    c.tickets?.[ticketIndex]
                                      ? 'text-brand-600 dark:text-brand-400'
                                      : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                >
                                  <Ticket className="w-4 h-4" />
                                </button>
                              ))}
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-brand-950 border border-slate-200 dark:border-brand-800/60">
                              {c.grade}
                            </span>
                            {!c.isActive && (
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                                INACTIV
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Versete învățate: {c.learnedCount} / {totalMaxVerses} ({c.pctOfFinalTotal}%)
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleCompActive(c)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              c.isActive
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25'
                                : 'bg-brand-500/15 text-brand-700 dark:text-brand-300 hover:bg-brand-500/25'
                            }`}
                          >
                            {c.isActive ? (
                              <>
                                <UserMinus className="w-3.5 h-3.5" />
                                Dezactivează
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                Reactivează
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingComp(true);
                              setCompForm({
                                id: c.id,
                                name: c.name,
                                grade: c.grade,
                                active: c.isActive,
                              });
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-brand-950 hover:bg-slate-200 text-xs font-semibold transition"
                          >
                            Editează
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteCompetitor(c)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition"
                            title="Șterge concurent"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FORMARE ECHIPE */}
            {adminTab === 'teams' && (
              <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-5">
                <div>
                  <h3 className="font-bold text-base">Generator de Echipe (2 sau 3 concurenți activi)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Concurenții inactivi sunt excluși automat. Dacă numărul de concurenți activi ({activeCompetitors.length}) este impar, ultima echipă va avea 3 membri.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setTeamCriterion('support')}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      teamCriterion === 'support'
                        ? 'bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/30'
                        : 'bg-slate-50 dark:bg-[#061612] border-slate-200 dark:border-brand-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-brand-500" />
                        Criteriul Suport (Recomandat)
                      </span>
                      <input
                        type="radio"
                        checked={teamCriterion === 'support'}
                        onChange={() => setTeamCriterion('support')}
                        className="accent-brand-500"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Împerechează concurentul cu cel mai mare număr de versete învățate cu cel care are cel mai mic număr, al 2-lea cel mai mare cu al 2-lea cel mai mic ș.a.m.d.
                    </p>
                  </div>

                  <div
                    onClick={() => setTeamCriterion('random')}
                    className={`p-4 rounded-2xl border cursor-pointer transition ${
                      teamCriterion === 'random'
                        ? 'bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/30'
                        : 'bg-slate-50 dark:bg-[#061612] border-slate-200 dark:border-brand-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm flex items-center gap-2">
                        <Shuffle className="w-4 h-4 text-brand-500" />
                        Criteriul Aleator
                      </span>
                      <input
                        type="radio"
                        checked={teamCriterion === 'random'}
                        onChange={() => setTeamCriterion('random')}
                        className="accent-brand-500"
                      />
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Trage la sorți aleatoriu toți concurenții activi în echipe de câte 2 (și o echipă de 3 dacă numărul este impar).
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={activeCompetitors.length < 2}
                  onClick={() => setShowTeamConfirmModal(true)}
                  className="px-5 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-brand-500/25 flex items-center gap-2 transition"
                >
                  <Shuffle className="w-4 h-4" />
                  Generează Echipele Acum ({activeCompetitors.length} concurenți activi)
                </button>
              </div>
            )}

            {/* TAB 4: INCARCARE FISIER .TXT */}
            {adminTab === 'schedule' && (
              <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base">Planul de Memorare (Fișier .txt)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Linia 1: Numele cărții din Biblie • Linia 2: Data de start (YYYY-MM-DD) • Liniile 3+: câte o linie pe zi (&quot;-&quot; pentru zi de pauză sau &quot;capitol:verset&quot;).
                    </p>
                  </div>

                  <label className="cursor-pointer px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-brand-500/20 transition">
                    <Upload className="w-4 h-4" />
                    Încarcă fișier .txt din telefon/PC
                    <input
                      type="file"
                      accept=".txt,text/plain"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  rows={12}
                  value={txtDraft}
                  onChange={(e) => setTxtDraft(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Filipeni&#10;2026-11-02&#10;1:1&#10;1:2&#10;-"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Carte activă: <strong>{schedule.bookName}</strong> • Total zile: <strong>{schedule.days.length}</strong> • Versete totale: <strong>{totalMaxVerses}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveScheduleDraft}
                    className="px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition"
                  >
                    Salvează Textul Editat
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: MATERIALE & PAROLA ADMIN */}
            {adminTab === 'materials' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-4">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-brand-500" />
                    Adaugă Link în Secțiunea Materiale
                  </h3>

                  <form onSubmit={handleAddMaterial} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Descriere / Titlu Material
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Tabel de memorare PDF sau Audio Filipeni"
                        value={materialForm.description}
                        onChange={(e) =>
                          setMaterialForm({ ...materialForm, description: e.target.value })
                        }
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Link (URL)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="https://..."
                        value={materialForm.url}
                        onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition"
                    >
                      + Adaugă Link Material
                    </button>
                  </form>

                  <div className="divide-y divide-slate-100 dark:divide-brand-900/40 pt-2">
                    {materials.map((m) => (
                      <div key={m.id} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{m.description}</p>
                          <p className="text-[11px] text-brand-600 dark:text-brand-400 truncate">
                            {m.url}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Schimbare Parola Admin */}
                <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-4 h-fit">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-brand-500" />
                    Securitate Panou Admin
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Schimbă parola de acces pentru administratori (salvată direct în baza de date).
                  </p>
                  <form onSubmit={handleSaveNewPassword} className="space-y-3">
                    <input
                      type="password"
                      placeholder="Noua parolă de administrator"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-brand-500 text-white font-bold text-xs transition"
                    >
                      Actualizează Parola
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* ======================== PAGINA GENERALA / CONCURENT ======================== */}
        {/* 1. CARDUL VERSETULUI DE AZI (Fus orar Timisoara) */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c3b2e] via-[#0f513d] to-[#10b982] text-white p-6 shadow-xl border border-brand-400/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-brand-200" />
                <span>Timișoara • Azi, {schedule.formattedToday}</span>
              </div>

              <h2 className="text-xs font-bold uppercase tracking-widest text-brand-100 pt-1">
                Versetul de învățat pentru azi
              </h2>

              {schedule.todayEntry ? (
                schedule.todayEntry.isPause ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 text-2xl sm:text-3xl font-extrabold">
                      <Coffee className="w-7 h-7 text-amber-300" />
                      <span>Zi de pauză și recapitulare!</span>
                    </div>
                    <p className="text-xs sm:text-sm text-brand-100/90">
                      Astăzi (Ziua {schedule.todayEntry.dayNumber}) este marcată cu „-” în plan. Folosește ziua pentru a repeta cele {dueUpToTodayCount} versete parcurse până acum!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl sm:text-4xl font-black tracking-tight">
                      {schedule.bookName} {schedule.todayEntry.ref}
                    </div>
                    <p className="text-xs sm:text-sm text-brand-100/90">
                      Ziua {schedule.todayEntry.dayNumber} din {schedule.days.length} • Versetul #{schedule.todayEntry.verseOrderNumber} din totalul de {totalMaxVerses} versete
                    </p>
                  </div>
                )
              ) : schedule.scheduleStatus === 'not_started' ? (
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-extrabold">
                    Planul începe pe {schedule.formattedStartDate}
                  </div>
                  <p className="text-xs sm:text-sm text-brand-100/90">
                    Pregătește-te! Vom memora împreună {totalMaxVerses} versete din cartea {schedule.bookName}.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-2xl sm:text-3xl font-extrabold">
                    Planul de memorare s-a încheiat! ({schedule.bookName})
                  </div>
                  <p className="text-xs sm:text-sm text-brand-100/90">
                    Recapitulează toate cele {totalMaxVerses} versete din {schedule.bookName} pentru concurs.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {schedule.todayEntry && !schedule.todayEntry.isPause && schedule.todayEntry.bibleUrl && (
                <a
                  href={schedule.todayEntry.bibleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-2xl bg-white text-brand-900 hover:bg-brand-50 font-bold text-xs shadow-lg flex items-center gap-2 transition"
                >
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  Citește capitolul în Biblie
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              )}
              <button
                type="button"
                onClick={() => setShowCalendarModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-black/25 hover:bg-black/35 text-white font-semibold text-xs border border-white/20 flex items-center gap-2 transition"
              >
                <Calendar className="w-4 h-4" />
                Vezi tot planul ({schedule.days.length} zile)
              </button>
            </div>
          </div>
        </section>

        {/* 2. PROCENTUL GENERAL DE INVATARE PE GRUPA (CU MARKERS LA 25%, 50%, 75%) */}
        <section className="bg-white dark:bg-[#0b241d] rounded-3xl p-6 border border-slate-200 dark:border-brand-900/60 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-brand-500" />
                Progresul General al Grupei
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculat pentru cei <strong>{groupStats.activeCount} concurenți activi</strong> (concurenții inactivi sunt excluși)
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-brand-600 dark:text-brand-400">
                {groupStats.groupPercent}%
              </span>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {groupStats.groupTotalLearned} / {groupStats.groupTotalPossible} versete învățate
              </p>
            </div>
          </div>

          {/* Progress Bar cu Markers la 25%, 50%, 75% */}
          <div className="pt-2 pb-5">
            <div className="relative h-5 w-full rounded-full bg-slate-100 dark:bg-[#061612] border border-slate-200 dark:border-brand-900/80 overflow-hidden">
              {/* Bara de umplere */}
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${Math.min(100, groupStats.groupPercent)}%` }}
              />

              {/* Praguri / Markers la 25%, 50%, 75% */}
              {[25, 50, 75].map((mark) => (
                <div
                  key={mark}
                  style={{ left: `${mark}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-slate-400/70 dark:bg-white/40 z-10"
                />
              ))}
            </div>

            {/* Etichete sub progress bar pentru 0%, 25%, 50%, 75%, 100% */}
            <div className="relative w-full mt-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-400">
              <span className="absolute left-0">0%</span>
              {[25, 50, 75].map((mark) => (
                <span
                  key={mark}
                  style={{ left: `${mark}%` }}
                  className={`absolute -translate-x-1/2 px-1.5 py-0.5 rounded ${
                    groupStats.groupPercent >= mark
                      ? 'text-brand-600 dark:text-brand-300 bg-brand-500/10'
                      : ''
                  }`}
                >
                  {mark}%
                </span>
              ))}
              <span className="absolute right-0">100%</span>
            </div>
          </div>
        </section>

        {/* 3. ECHIPELE FORMATE (2 SAU 3 PARTICIPANTI) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-500" />
                Echipele Concursului ({teamsWithStats.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Progresul cumulat pentru fiecare echipă de 2 sau 3 participanți
              </p>
            </div>
          </div>

          {teamsWithStats.length === 0 ? (
            <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-6 text-center border border-slate-200 dark:border-brand-900/60 text-xs text-slate-500">
              Nu au fost generate echipe încă. Administratorul poate forma echipele din panoul Admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teamsWithStats.map((team) => (
                <div
                  key={team.id}
                  className="bg-white dark:bg-[#0b241d] rounded-2xl p-5 border border-slate-200 dark:border-brand-900/60 shadow-sm flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                          {team.name}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-700 dark:text-brand-300">
                          {team.members.length} membri
                        </span>
                      </div>

                      {/* Toate cele 3 numere scrise explicit: %, versete invatate, versete totale */}
                      <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
                        {team.teamPercent}% ({team.teamLearned} / {team.teamTotal} versete)
                      </span>
                    </div>

                    {/* Membrii echipei */}
                    <div className="flex flex-wrap gap-2">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-200/80 dark:border-brand-900/60 text-xs flex items-center gap-2"
                        >
                          <span className="font-bold text-slate-800 dark:text-slate-100">
                            {m.name}
                          </span>
                          <span className="text-[11px] text-slate-400">({m.grade})</span>
                          <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                            {m.learnedCount}/{totalMaxVerses}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Progress bar echipa + cele 3 numere explicite */}
                  <div className="space-y-1.5">
                    <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-[#061612] overflow-hidden border border-slate-200/60 dark:border-brand-900/60">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all duration-500"
                        style={{ width: `${Math.min(100, team.teamPercent)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <span>Procent echipă: <strong>{team.teamPercent}%</strong></span>
                      <span>
                        Învățate: <strong>{team.teamLearned}</strong> din <strong>{team.teamTotal}</strong> versete totale
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 4. TOTI CONCURENTII CU PROGRESS BAR INDIVIDUAL */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-brand-500" />
                Progres Individual Concurenți ({competitors.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Până azi ({schedule.formattedToday}) trebuiau învățate <strong>{dueUpToTodayCount} versete</strong> din <strong>{totalMaxVerses} totale</strong>
              </p>
            </div>

            {/* Cautare si filtre */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Caută concurent..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#0b241d] border border-slate-200 dark:border-brand-900/60 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0b241d] border border-slate-200 dark:border-brand-900/60 text-xs font-medium"
              >
                <option value="all">Toate clasele</option>
                {uniqueGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#0b241d] border border-slate-200 dark:border-brand-900/60 text-xs font-medium"
              >
                <option value="learned_desc">Sortare: Progres (Desc)</option>
                <option value="name_asc">Sortare: Alfabetic (A-Z)</option>
                <option value="grade_asc">Sortare: Clasă</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredCompetitors.map((c) => (
              <div
                key={c.id}
                className={`rounded-2xl p-4 sm:p-5 border transition ${
                  c.isActive
                    ? 'bg-white dark:bg-[#0b241d] border-slate-200 dark:border-brand-900/60 shadow-sm'
                    : 'bg-slate-100/70 dark:bg-[#081814]/60 border-slate-200/60 dark:border-slate-800/60 opacity-50 grayscale'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1" aria-label="Tichete concurent">
                      {[0, 1, 2].map((ticketIndex) => (
                        <Ticket
                          key={ticketIndex}
                          aria-label={`Tichet ${ticketIndex + 1} ${c.tickets?.[ticketIndex] ? 'activ' : 'inactiv'}`}
                          className={`w-4 h-4 ${
                            c.tickets?.[ticketIndex]
                              ? 'text-brand-600 dark:text-brand-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#061612] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-brand-900/60 font-medium">
                      {c.grade}
                    </span>
                    {!c.isActive && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase">
                        Inactiv
                      </span>
                    )}
                  </div>

                  {/* Cele 3 valori scrise explicit */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-500/15 text-brand-700 dark:text-brand-300 font-bold">
                      {c.pctOfFinalTotal}% din totalul final
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold">
                      {c.pctOfDueToday}% din ținta la zi ({dueUpToTodayCount} v.)
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#061612] text-slate-800 dark:text-slate-200 font-extrabold border border-slate-200 dark:border-brand-900/50">
                      {c.learnedCount} / {c.totalMaxVerses} versete
                    </span>
                  </div>
                </div>

                {/* Progress Bar Individual */}
                <div className="space-y-1.5">
                  <div className="relative h-3 w-full rounded-full bg-slate-100 dark:bg-[#061612] overflow-hidden border border-slate-200/70 dark:border-brand-900/60">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        c.isActive ? 'bg-brand-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, c.pctOfFinalTotal)}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2">
                    <span>
                      Progres final: <strong>{c.pctOfFinalTotal}%</strong> ({c.learnedCount} învățate din {c.totalMaxVerses} maxim)
                    </span>
                    <span>
                      Progres la zi (până azi inclusiv): <strong>{c.pctOfDueToday}%</strong> ({c.learnedCount} din {dueUpToTodayCount} scadente)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. SECTIUNEA DE MATERIALE */}
        <section className="space-y-3 pb-8">
          <div>
            <h2 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-brand-500" />
              Materiale și Resurse Utile ({materials.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Link-uri și materiale de studiu încărcate de coordonatori pentru memorare
            </p>
          </div>

          {materials.length === 0 ? (
            <div className="bg-white dark:bg-[#0b241d] rounded-2xl p-6 text-center border border-slate-200 dark:border-brand-900/60 text-xs text-slate-500">
              Nu există materiale încărcate momentan.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {materials.map((mat) => (
                <a
                  key={mat.id}
                  href={mat.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white dark:bg-[#0b241d] hover:border-brand-500 dark:hover:border-brand-500 rounded-2xl p-4 border border-slate-200 dark:border-brand-900/60 shadow-sm flex items-start justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 shrink-0 group-hover:bg-brand-500 group-hover:text-white transition">
                      <LinkIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">
                        {mat.description}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{mat.url}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-brand-500 shrink-0 mt-1" />
                </a>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-brand-900/50 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>TNmemo</strong> - Concursul Biblic „Talantul în Negoț” (Secțiunea Memorare)
          </span>
          <span>Fus orar activ: Timișoara (Europe/Bucharest)</span>
        </div>
      </footer>

      {/* MODAL 1: AUTENTIFICARE ADMIN */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b241d] w-full max-w-sm rounded-3xl p-6 border border-slate-200 dark:border-brand-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-500/15 text-brand-500">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-base">Acces Administrator</h3>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-brand-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
                  Introdu parola de coordonator / admin
                </label>
                <input
                  type="password"
                  autoFocus
                  required
                  placeholder="Parola..."
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setLoginError('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-300 dark:border-brand-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {loginError && (
                  <p className="text-xs text-rose-500 font-semibold mt-1.5">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-lg shadow-brand-500/25 transition"
              >
                Intră în Panoul Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: POPUP CONFIRMARE GENERARE ECHIPE */}
      {showTeamConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b241d] w-full max-w-md rounded-3xl p-6 border border-slate-200 dark:border-brand-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-brand-500" />
                Confirmare Formare Echipe
              </h3>
              <button
                onClick={() => setShowTeamConfirmModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-brand-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                Ești sigur că vrei să regenerezi echipele pentru cei{' '}
                <strong>{activeCompetitors.length} concurenți activi</strong>? Echipele anterioare vor fi înlocuite.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#061612] border border-slate-200 dark:border-brand-900">
                <p className="font-bold text-brand-600 dark:text-brand-400">
                  Criteriu selectat:{' '}
                  {teamCriterion === 'support'
                    ? '2. Suport (Cel mai mare nr. de versete cu cel mai mic)'
                    : '1. Aleator (Tragere la sorți)'}
                </p>
                <p className="mt-1 text-[11px] opacity-80">
                  {activeCompetitors.length % 2 === 1
                    ? `Deoarece numărul (${activeCompetitors.length}) este impar, se vor forma ${
                        Math.floor(activeCompetitors.length / 2) - 1
                      } echipe de 2 concurenți și 1 echipă de 3 concurenți.`
                    : `Se vor forma exact ${activeCompetitors.length / 2} echipe de câte 2 concurenți.`}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTeamConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-brand-950 text-xs font-semibold"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerateTeams}
                className="px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-md shadow-brand-500/20"
              >
                Da, Generează Echipele
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CALENDARUL COMPLET DIN FISIERUL .TXT */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0b241d] w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-slate-200 dark:border-brand-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-brand-900/60 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-500" />
                  Planul Calendaristic - {schedule.bookName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Start: {schedule.formattedStartDate} • {schedule.days.length} zile ({totalMaxVerses} versete)
                </p>
              </div>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-brand-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {schedule.days.map((d) => (
                <div
                  key={d.dayIndex}
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    d.isToday
                      ? 'bg-brand-500/15 border-brand-500 ring-2 ring-brand-500/30'
                      : d.isPause
                      ? 'bg-slate-50/70 dark:bg-[#061612]/40 border-slate-200/60 dark:border-brand-950 opacity-75'
                      : 'bg-white dark:bg-[#061612] border-slate-200 dark:border-brand-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Ziua {d.dayNumber}</span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {d.formattedDate}
                      </span>
                      {d.isToday && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-brand-500 text-white">
                          Azi
                        </span>
                      )}
                    </div>
                    <div className="font-extrabold text-sm mt-0.5">
                      {d.isPause ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold">
                          - Zi de pauză / recapitulare
                        </span>
                      ) : (
                        <span className="text-brand-700 dark:text-brand-300">
                          {schedule.bookName} {d.ref}
                        </span>
                      )}
                    </div>
                  </div>

                  {!d.isPause && d.bibleUrl && (
                    <a
                      href={d.bibleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-brand-500/10 text-brand-500"
                      title="Citește în Biblie"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
