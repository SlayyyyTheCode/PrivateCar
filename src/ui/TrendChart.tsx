import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { normaliseDate, valueExtent } from '../core/history';
import type { Series } from '../data/history';
import { font, radius, spacing, useIsDark, usePalette } from './theme';

/**
 * A line chart for cost-over-time.
 *
 * The palette below is not a taste decision — it was run through the contrast
 * and colour-vision checks for both surfaces, and each mode has its own steps
 * rather than one being a lightened flip of the other. Series are also always
 * named in the legend, so identity never rests on colour alone.
 */
const SERIES_COLOURS = {
  light: ['#1F5FA0', '#B45309', '#7C3AED'],
  dark: ['#4A93DB', '#C0862E', '#8B6FE0'],
};

const HEIGHT = 190;
const PADDING = { top: 12, right: 12, bottom: 26, left: 46 };

export interface TrendChartProps {
  series: Series[];
  /** Formats values on the axis and in the readout. */
  format: (value: number) => string;
}

export function TrendChart({ series, format }: TrendChartProps) {
  const p = usePalette();
  const isDark = useIsDark();
  const colours = isDark ? SERIES_COLOURS.dark : SERIES_COLOURS.light;

  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const extent = useMemo(() => valueExtent(series), [series]);

  // Every series shares one x-axis and one y-axis. Two scales on one chart is
  // the fastest way to make a comparison lie, so series of different units get
  // separate charts instead.
  const dates = useMemo(() => {
    const all = new Set<string>();
    for (const entry of series) for (const point of entry.points) all.add(normaliseDate(point.date));
    return Array.from(all).sort();
  }, [series]);

  const plotWidth = Math.max(0, width - PADDING.left - PADDING.right);
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const xFor = (index: number) =>
    PADDING.left + (dates.length <= 1 ? plotWidth / 2 : (index / (dates.length - 1)) * plotWidth);
  const yFor = (value: number) =>
    PADDING.top + plotHeight - ((value - extent.min) / (extent.max - extent.min || 1)) * plotHeight;

  const paths = useMemo(
    () =>
      series.map((entry) => {
        const byDate = new Map(entry.points.map((point) => [normaliseDate(point.date), point.value]));
        let path = '';
        dates.forEach((date, index) => {
          const value = byDate.get(date);
          if (value === undefined) return;
          path += `${path === '' ? 'M' : 'L'}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`;
        });
        return { entry, path, byDate };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, dates, width, extent.min, extent.max],
  );

  const ticks = useMemo(() => {
    const count = 4;
    return Array.from({ length: count }, (_, i) => extent.min + ((extent.max - extent.min) * i) / (count - 1));
  }, [extent]);

  const activeIndex = selected ?? dates.length - 1;
  const activeDate = dates[activeIndex];

  if (dates.length === 0) {
    return (
      <View style={{ height: HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[font.caption, { color: p.textFaint }]}>No data in this range.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {/* Readout for the selected point, so values are never guessed off the axis. */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'baseline' }}>
        <Text style={[font.caption, { color: p.textMuted }]}>{formatDateLabel(activeDate)}</Text>
        {series.map((entry, i) => {
          const value = paths[i]?.byDate.get(activeDate);
          return (
            <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colours[i % colours.length] }} />
              <Text style={[font.caption, { color: p.textMuted }]}>{entry.label}</Text>
              <Text style={[font.mono, { color: p.text, fontSize: 13 }]}>
                {value === undefined ? '—' : format(value)}
              </Text>
            </View>
          );
        })}
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={{ width: '100%', height: HEIGHT }}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            {/* Recessive gridlines — the data is the loud part. */}
            {ticks.map((tick) => (
              <Line
                key={tick}
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke={p.border}
                strokeWidth={1}
              />
            ))}

            {activeDate ? (
              <Line
                x1={xFor(activeIndex)}
                x2={xFor(activeIndex)}
                y1={PADDING.top}
                y2={PADDING.top + plotHeight}
                stroke={p.textFaint}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ) : null}

            {paths.map(({ entry, path }, i) => (
              <Path
                key={entry.id}
                d={path}
                stroke={colours[i % colours.length]}
                strokeWidth={2}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {paths.map(({ entry, byDate }, i) => {
              const value = byDate.get(activeDate);
              if (value === undefined) return null;
              return (
                <Circle
                  key={`marker-${entry.id}`}
                  cx={xFor(activeIndex)}
                  cy={yFor(value)}
                  r={5}
                  fill={colours[i % colours.length]}
                  stroke={p.surface}
                  strokeWidth={2}
                />
              );
            })}

            {/* Invisible hit targets, one per point and wider than the marks. */}
            {dates.map((date, index) => (
              <Rect
                key={`hit-${date}`}
                x={xFor(index) - Math.max(8, plotWidth / dates.length / 2)}
                y={0}
                width={Math.max(16, plotWidth / dates.length)}
                height={HEIGHT}
                fill="transparent"
                onPressIn={() => setSelected(index)}
              />
            ))}
          </Svg>
        ) : null}

        {/* Axis labels sit outside the SVG so they inherit the app's text tokens. */}
        {width > 0
          ? ticks.map((tick) => (
              <Text
                key={`label-${tick}`}
                style={[
                  font.caption,
                  {
                    position: 'absolute',
                    left: 0,
                    top: yFor(tick) - 7,
                    width: PADDING.left - 6,
                    textAlign: 'right',
                    color: p.textFaint,
                    fontSize: 10,
                  },
                ]}
              >
                {format(tick)}
              </Text>
            ))
          : null}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: PADDING.left }}>
        <Text style={[font.caption, { color: p.textFaint, fontSize: 10 }]}>{formatDateLabel(dates[0])}</Text>
        <Text style={[font.caption, { color: p.textFaint, fontSize: 10 }]}>
          {formatDateLabel(dates[dates.length - 1])}
        </Text>
      </View>

      {selected !== null ? (
        <Pressable onPress={() => setSelected(null)} accessibilityRole="button">
          <Text style={[font.caption, { color: p.accent, textAlign: 'center' }]}>Back to latest</Text>
        </Pressable>
      ) : (
        <Text style={[font.caption, { color: p.textFaint, textAlign: 'center' }]}>
          Tap the chart to read any point
        </Text>
      )}
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateLabel(date: string | undefined): string {
  if (!date) return '—';
  const [year, month, day] = date.split('-');
  const monthName = MONTHS[Number(month) - 1] ?? '';
  return day === '01' ? `${monthName} ${year}` : `${Number(day)} ${monthName} ${year}`;
}

/** Legend, shown whenever more than one series shares the axis. */
export function ChartLegend({ series }: { series: Series[] }) {
  const p = usePalette();
  const colours = useIsDark() ? SERIES_COLOURS.dark : SERIES_COLOURS.light;
  if (series.length < 2) return null;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
      {series.map((entry, i) => (
        <View key={entry.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View
            style={{
              width: 14,
              height: 3,
              borderRadius: radius.pill,
              backgroundColor: colours[i % colours.length],
            }}
          />
          <Text style={[font.caption, { color: p.textMuted }]}>{entry.label}</Text>
        </View>
      ))}
    </View>
  );
}
