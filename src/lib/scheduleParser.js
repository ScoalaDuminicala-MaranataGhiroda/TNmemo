// Utilitar pentru parsarea fisierului .txt si calcule calendaristice in fusul orar Europe/Bucharest (Timisoara)

export const DEFAULT_PLAN_TXT = `Filipeni
2026-11-02
1:1
1:2
1:3
1:4
1:5
1:6
-
1:7
1:8
1:9
1:10
1:11
-
-
1:12
1:13
1:14
1:18
1:20
1:21
-
1:27
1:28
1:29
2:1
2:2
2:3
2:4
-
2:5
2:6
2:7
2:8
2:9
2:10
2:11`;

/**
 * Returneaza data curenta din Timisoara (Europe/Bucharest) in format YYYY-MM-DD
 */
export function getTimisoaraTodayStr() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bucharest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date()); // 'YYYY-MM-DD'
}

/**
 * Converteste un string 'YYYY-MM-DD' in numar de zile UTC (fara erori de schimbare a orei DST)
 */
export function dateStrToUtcDays(dateStr) {
  const clean = (dateStr || '').trim();
  let year, month, day;

  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    [year, month, day] = clean.split('-').map(Number);
  } else if (/^\d{2}[./-]\d{2}[./-]\d{4}$/.test(clean)) {
    [day, month, year] = clean.split(/[./-]/).map(Number);
  } else {
    const parsed = new Date(clean);
    if (isNaN(parsed.getTime())) return null;
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

/**
 * Adauga `offsetDays` la o data 'YYYY-MM-DD' si returneaza tot 'YYYY-MM-DD'
 */
export function addDaysToDateStr(startDateStr, offsetDays) {
  const baseDays = dateStrToUtcDays(startDateStr);
  if (baseDays === null) return '';
  const targetMs = (baseDays + offsetDays) * 86400000;
  const d = new Date(targetMs);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formateaza o data 'YYYY-MM-DD' prietenos in limba romana (ex: 'Mie, 11 Nov 2026')
 */
export function formatRoDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('ro-RO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dateObj);
}

/**
 * Genereaza link direct catre pasajul biblic pe Resurse Crestine (Cornilescu)
 */
export function getBibleUrl(bookName, ref) {
  if (!bookName || !ref || ref === '-') return null;
  const [chapter, verse] = ref.split(':');
  const slug = bookName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-');
  return `https://biblia.resursecrestine.ro/${bookName.toLowerCase()}/${chapter}/${verse}#verset-${verse}`;
}

/**
 * Parseaza continutul fisierului .txt incarcat de Admin.
 * Linia 1: Numele cartii din Biblie
 * Linia 2: Data calendaristica de start (ex: 2026-11-02 sau 02.11.2026)
 * Liniile 3+: '-' (zi de pauza) sau 'ab:cd' (capitol:verset), cate o linie pentru fiecare zi.
 */
export function parseScheduleTxt(rawText, customTodayStr = null) {
  const todayStr = customTodayStr || getTimisoaraTodayStr();
  if (!rawText || typeof rawText !== 'string') {
    return {
      isValid: false,
      error: 'Fișierul este gol.',
      bookName: '',
      startDateStr: '',
      todayStr,
      days: [],
      allVerses: [],
      versesDueUpToToday: [],
      todayEntry: null,
      scheduleStatus: 'empty',
    };
  }

  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 3) {
    return {
      isValid: false,
      error: 'Fișierul .txt trebuie să conțină cel puțin 3 linii: Cartea (linia 1), Data de start (linia 2) și cel puțin o zi (linia 3+).',
      bookName: lines[0] || '',
      startDateStr: lines[1] || '',
      todayStr,
      days: [],
      allVerses: [],
      versesDueUpToToday: [],
      todayEntry: null,
      scheduleStatus: 'invalid',
    };
  }

  const bookName = lines[0];
  const rawStartDate = lines[1];
  const startUtcDays = dateStrToUtcDays(rawStartDate);

  if (startUtcDays === null) {
    return {
      isValid: false,
      error: `Data de start "${rawStartDate}" de pe linia 2 nu este validă. Folosește formatul YYYY-MM-DD (ex: 2026-11-02) sau ZZ.LL.AAAA.`,
      bookName,
      startDateStr: rawStartDate,
      todayStr,
      days: [],
      allVerses: [],
      versesDueUpToToday: [],
      todayEntry: null,
      scheduleStatus: 'invalid',
    };
  }

  const normalizedStartDate = addDaysToDateStr(rawStartDate, 0);
  const todayUtcDays = dateStrToUtcDays(todayStr);

  const days = [];
  const allVerses = [];
  const versesDueUpToToday = [];
  const occurrenceCounter = {};

  for (let i = 2; i < lines.length; i++) {
    const dayIndex = i - 2; // 0-indexed de la ziua de start
    const rawLine = lines[i];
    const dateStr = addDaysToDateStr(normalizedStartDate, dayIndex);
    const dayUtc = startUtcDays + dayIndex;
    const isPause = rawLine === '-' || rawLine.toLowerCase() === 'pauza' || rawLine.toLowerCase() === 'pauză';

    let verseKey = null;
    let verseOrderNumber = null;

    if (!isPause) {
      occurrenceCounter[rawLine] = (occurrenceCounter[rawLine] || 0) + 1;
      // Cheie unica stabila chiar daca o referinta s-ar repeta sau fisierul primeste zile noi la final
      verseKey = occurrenceCounter[rawLine] === 1 ? rawLine : `${rawLine}#${occurrenceCounter[rawLine]}`;
      verseOrderNumber = allVerses.length + 1;
    }

    const isPastOrToday = dayUtc <= todayUtcDays;
    const isToday = dayUtc === todayUtcDays;

    const entry = {
      dayIndex,
      dayNumber: dayIndex + 1,
      dateStr,
      formattedDate: formatRoDate(dateStr),
      isPause,
      ref: isPause ? '-' : rawLine,
      verseKey,
      verseOrderNumber,
      isPastOrToday,
      isToday,
      bibleUrl: isPause ? null : getBibleUrl(bookName, rawLine),
    };

    days.push(entry);

    if (!isPause) {
      allVerses.push(entry);
      if (isPastOrToday) {
        versesDueUpToToday.push(entry);
      }
    }
  }

  const todayEntry = days.find((d) => d.isToday) || null;
  let scheduleStatus = 'active';
  if (days.length > 0) {
    const firstDayUtc = startUtcDays;
    const lastDayUtc = startUtcDays + days.length - 1;
    if (todayUtcDays < firstDayUtc) scheduleStatus = 'not_started';
    else if (todayUtcDays > lastDayUtc) scheduleStatus = 'completed';
  }

  return {
    isValid: true,
    error: null,
    bookName,
    startDateStr: normalizedStartDate,
    formattedStartDate: formatRoDate(normalizedStartDate),
    endDateStr: days.length > 0 ? days[days.length - 1].dateStr : normalizedStartDate,
    formattedEndDate: days.length > 0 ? days[days.length - 1].formattedDate : '',
    todayStr,
    formattedToday: formatRoDate(todayStr),
    days,
    allVerses,
    versesDueUpToToday,
    todayEntry,
    scheduleStatus,
  };
}
