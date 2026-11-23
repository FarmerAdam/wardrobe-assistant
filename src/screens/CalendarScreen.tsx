import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { showAlert } from '../lib/alert';
import { isWeekend, localDateString } from '../lib/calendarLock';
import { supabase } from '../lib/supabase';
import { CalendarMark, DayType } from '../types';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first column index for the 1st of the month (0 = Monday, 6 = Sunday).
function firstWeekdayColumn(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  return (jsDay + 6) % 7;
}

export function CalendarScreen({ profileId }: { profileId: string }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [marks, setMarks] = useState<CalendarMark[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDate, setActionDate] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('calendar_marks')
      .select('*')
      .eq('profile_id', profileId)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data) setMarks(data as CalendarMark[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const marksByDate = useMemo(() => {
    const map = new Map<string, CalendarMark>();
    for (const mark of marks) map.set(mark.date, mark);
    return map;
  }, [marks]);

  function changeMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  async function applyMark(dayType: DayType | null) {
    if (!actionDate) return;
    setUpdating(true);
    const existing = marksByDate.get(actionDate);

    let error;
    if (dayType === null) {
      ({ error } = await supabase.from('calendar_marks').delete().eq('profile_id', profileId).eq('date', actionDate));
    } else if (existing) {
      ({ error } = await supabase.from('calendar_marks').update({ day_type: dayType }).eq('id', existing.id));
    } else {
      ({ error } = await supabase
        .from('calendar_marks')
        .insert({ profile_id: profileId, date: actionDate, day_type: dayType }));
    }

    setUpdating(false);
    if (error) {
      showAlert('Something went wrong', error.message);
      return;
    }

    setMarks((prev) => {
      const withoutDate = prev.filter((m) => m.date !== actionDate);
      if (dayType === null) return withoutDate;
      return [
        ...withoutDate,
        existing
          ? { ...existing, day_type: dayType }
          : { id: `${actionDate}-pending`, profile_id: profileId, date: actionDate, day_type: dayType, created_at: new Date().toISOString() },
      ];
    });
    setActionDate(null);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const numDays = daysInMonth(viewYear, viewMonth);
  const leadingBlanks = firstWeekdayColumn(viewYear, viewMonth);
  const todayStr = localDateString(today);

  const cells: (string | null)[] = [...Array(leadingBlanks).fill(null)];
  for (let d = 1; d <= numDays; d++) {
    cells.push(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }

  const actionMark = actionDate ? marksByDate.get(actionDate) : undefined;

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={12}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <Pressable onPress={() => changeMonth(1)} hitSlop={12}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <View key={`blank-${i}`} style={styles.cell} />;
          const mark = marksByDate.get(dateStr);
          const weekend = isWeekend(dateStr);
          const isToday = dateStr === todayStr;
          const dayNum = Number(dateStr.slice(-2));

          const cellStyle = [
            styles.cell,
            styles.dayCell,
            weekend && styles.weekendCell,
            mark?.day_type === 'casual' && styles.casualCell,
            mark?.day_type === 'holiday' && styles.holidayCell,
            isToday && styles.todayCell,
          ];

          if (weekend) {
            return (
              <View key={dateStr} style={cellStyle}>
                <Text style={styles.dayNum}>{dayNum}</Text>
              </View>
            );
          }

          return (
            <Pressable key={dateStr} style={cellStyle} onPress={() => setActionDate(dateStr)}>
              <Text style={styles.dayNum}>{dayNum}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.legend}>
        <LegendSwatch style={styles.casualCell} label="Casual day" />
        <LegendSwatch style={styles.holidayCell} label="Holiday" />
        <LegendSwatch style={styles.weekendCell} label="Weekend" />
      </View>

      {actionDate && (
        <View style={styles.overlay}>
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>{actionDate}</Text>

            {!actionMark && (
              <>
                <PrimaryButton label="Mark as Casual Day" onPress={() => applyMark('casual')} disabled={updating} />
                <PrimaryButton
                  label="Mark as Holiday"
                  onPress={() => applyMark('holiday')}
                  disabled={updating}
                  variant="secondary"
                />
              </>
            )}
            {actionMark?.day_type === 'casual' && (
              <PrimaryButton
                label="Switch to Holiday"
                onPress={() => applyMark('holiday')}
                disabled={updating}
                variant="secondary"
              />
            )}
            {actionMark?.day_type === 'holiday' && (
              <PrimaryButton
                label="Switch to Casual Day"
                onPress={() => applyMark('casual')}
                disabled={updating}
                variant="secondary"
              />
            )}
            {actionMark && (
              <PrimaryButton label="Clear Mark" onPress={() => applyMark(null)} disabled={updating} variant="danger" />
            )}

            <PrimaryButton label="Cancel" onPress={() => setActionDate(null)} disabled={updating} variant="secondary" />
          </View>
        </View>
      )}
    </View>
  );
}

function LegendSwatch({ style, label }: { style: object; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, style]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nav: { fontSize: 26, fontWeight: '700', color: '#222', paddingHorizontal: 12 },
  monthLabel: { fontSize: 17, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 8 },
  weekendCell: { backgroundColor: '#f2f2f2' },
  casualCell: { backgroundColor: '#cdeccd' },
  holidayCell: { backgroundColor: '#cfe0f7' },
  todayCell: { borderWidth: 2, borderColor: '#222' },
  dayNum: { fontSize: 14, color: '#333' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 12, color: '#666' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  actionCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'stretch',
  },
  actionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
});
