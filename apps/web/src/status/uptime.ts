export function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return "< 1 minute";
  }

  if (seconds < 3_600) {
    return formatUnit(Math.floor(seconds / 60), "minute");
  }

  if (seconds < 86_400) {
    return formatUnit(Math.floor(seconds / 3_600), "hour");
  }

  return formatUnit(Math.floor(seconds / 86_400), "day");
}

function formatUnit(value: number, unit: "minute" | "hour" | "day"): string {
  return `${String(value)} ${unit}${value === 1 ? "" : "s"}`;
}
