import { cn } from "@/lib/utils";

interface RangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  className?: string;
  showLabels?: boolean;
  formatLabel?: (value: number) => string;
  disabled?: boolean;
}

export function RangeSlider({
  min,
  max,
  step = 1,
  value,
  onChange,
  onDragStart,
  onDragEnd,
  className,
  showLabels = true,
  formatLabel,
  disabled = false
}: RangeSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value));
  };

  const handleMouseDown = () => {
    onDragStart?.();
  };

  const handleMouseUp = () => {
    onDragEnd?.();
  };

  const formatValue = (val: number) => {
    if (formatLabel) return formatLabel(val);
    return val.toString();
  };

  const range = Math.max(1, max - min);
  const pct = Math.min(100, Math.max(0, ((value - min) / range) * 100));

  return (
    <div className={cn("w-full", className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled}
        style={{ ["--pct" as any]: `${pct}%` }}
        className="slider w-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
      />
      {showLabels && (
        <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
}
