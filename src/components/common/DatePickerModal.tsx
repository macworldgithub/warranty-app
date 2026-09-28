/**
 * DatePickerModal — Pure JS drum-roll date picker
 * Works on iOS, Android, and simulator without native modules.
 * Supports mode="date" and mode="time".
 */
import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 46;
const VISIBLE_COUNT = 5; // odd number — selection is centre item
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2); // padding to centre first/last items

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();

// ─── Drum Column ──────────────────────────────────────────────────────────────
interface DrumColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  flex?: number;
}

const DrumColumn: React.FC<DrumColumnProps> = ({ items, selectedIndex, onSelect, flex = 1 }) => {
  const scrollRef = useRef<ScrollView>(null);
  const isDragging = useRef(false);
  const lastIndex = useRef(selectedIndex);

  useEffect(() => {
    if (!isDragging.current) {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
      lastIndex.current = selectedIndex;
    }
  }, [selectedIndex]);

  const handleScrollEnd = useCallback(
    (e: any) => {
      isDragging.current = false;
      const y = e.nativeEvent.contentOffset.y;
      const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
      if (index !== lastIndex.current) {
        lastIndex.current = index;
        onSelect(index);
      }
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    },
    [items.length, onSelect],
  );

  return (
    <View style={[styles.columnWrapper, { flex }]}>
      {/* Selection highlight bar */}
      <View style={styles.selectionHighlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.85}
        onScrollBeginDrag={() => { isDragging.current = true; }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={{ paddingVertical: PADDING }}
        nestedScrollEnabled
      >
        {items.map((label, i) => (
          <TouchableOpacity
            key={i}
            activeOpacity={0.7}
            style={styles.item}
            onPress={() => {
              onSelect(i);
              scrollRef.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
            }}
          >
            <Text style={[styles.itemText, i === selectedIndex && styles.itemTextSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Public Props ─────────────────────────────────────────────────────────────
export interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time';
  minimumDate?: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────
const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  value,
  mode = 'date',
  minimumDate,
  title,
  onConfirm,
  onCancel,
}) => {
  const currentYear = new Date().getFullYear();
  const minYear = minimumDate ? minimumDate.getFullYear() : currentYear;
  const maxYear = currentYear + 20;
  const YEARS = Array.from({ length: maxYear - minYear + 1 }, (_, i) => String(minYear + i));

  const getDays = (month: number, year: number) =>
    Array.from({ length: daysInMonth(month, year) }, (_, i) => String(i + 1).padStart(2, '0'));

  // Date state
  const [monthIdx, setMonthIdx] = useState(value.getMonth());
  const [dayIdx, setDayIdx] = useState(value.getDate() - 1);
  const [yearIdx, setYearIdx] = useState(Math.max(0, value.getFullYear() - minYear));

  // Time state (12-hour)
  const initH = value.getHours();
  const [hourIdx, setHourIdx] = useState((initH % 12 === 0 ? 12 : initH % 12) - 1);
  const [minuteIdx, setMinuteIdx] = useState(value.getMinutes());
  const [periodIdx, setPeriodIdx] = useState(initH >= 12 ? 1 : 0);

  // Re-sync when modal opens
  useEffect(() => {
    if (visible) {
      if (mode === 'date') {
        const yr = value.getFullYear();
        setMonthIdx(value.getMonth());
        setDayIdx(value.getDate() - 1);
        setYearIdx(Math.max(0, yr - minYear));
      } else {
        const h = value.getHours();
        setHourIdx((h % 12 === 0 ? 12 : h % 12) - 1);
        setMinuteIdx(value.getMinutes());
        setPeriodIdx(h >= 12 ? 1 : 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedYear = parseInt(YEARS[yearIdx] || String(minYear), 10);
  const currentDays = getDays(monthIdx, selectedYear);
  const clampedDayIdx = Math.min(dayIdx, currentDays.length - 1);

  const handleConfirm = () => {
    let result: Date;
    if (mode === 'date') {
      result = new Date(selectedYear, monthIdx, clampedDayIdx + 1);
    } else {
      const hour24 = (hourIdx + 1) % 12 + (periodIdx === 1 ? 12 : 0);
      result = new Date(value);
      result.setHours(hour24, minuteIdx, 0, 0);
    }
    onConfirm(result);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />

      <View style={styles.sheet}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.titleText}>{title || (mode === 'date' ? 'Select Date' : 'Select Time')}</Text>
          <TouchableOpacity onPress={handleConfirm} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.doneBtn}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Drum columns */}
        <View style={styles.drumRow}>
          {mode === 'date' ? (
            <>
              <DrumColumn items={MONTHS}       selectedIndex={monthIdx}      onSelect={setMonthIdx} flex={3} />
              <DrumColumn items={currentDays}  selectedIndex={clampedDayIdx} onSelect={setDayIdx}   flex={2} />
              <DrumColumn items={YEARS}        selectedIndex={yearIdx}       onSelect={setYearIdx}  flex={3} />
            </>
          ) : (
            <>
              <DrumColumn items={HOURS}   selectedIndex={hourIdx}   onSelect={setHourIdx}   flex={3} />
              <View style={styles.colonWrap}><Text style={styles.colonText}>:</Text></View>
              <DrumColumn items={MINUTES} selectedIndex={minuteIdx} onSelect={setMinuteIdx} flex={3} />
              <DrumColumn items={PERIODS} selectedIndex={periodIdx} onSelect={setPeriodIdx} flex={2} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  sheet: {
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383A',
  },
  titleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  cancelBtn: {
    color: '#8e8e93',
    fontSize: 16,
    minWidth: 64,
  },
  doneBtn: {
    color: '#C0392B',
    fontSize: 16,
    fontWeight: '700',
    minWidth: 64,
    textAlign: 'right',
  },
  drumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: PICKER_HEIGHT,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  columnWrapper: {
    height: PICKER_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  selectionHighlight: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: PADDING,
    height: ITEM_HEIGHT,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 18,
    color: '#6e6e73',
    fontWeight: '400',
  },
  itemTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 19,
  },
  colonWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 14,
    marginBottom: 4,
  },
  colonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
});

export default DatePickerModal;
