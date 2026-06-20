const GOOGLE_COLORS = [
  { id: '1', name: 'Lavender', hex: '#7986cb' },
  { id: '2', name: 'Sage', hex: '#33b679' },
  { id: '3', name: 'Grape', hex: '#8e24aa' },
  { id: '4', name: 'Flamingo', hex: '#e67c73' },
  { id: '5', name: 'Banana', hex: '#f6bf26' },
  { id: '6', name: 'Tangerine', hex: '#f4511e' },
  { id: '7', name: 'Peacock', hex: '#039be5' },
  { id: '8', name: 'Graphite', hex: '#616161' },
  { id: '9', name: 'Blueberry', hex: '#3f51b5' },
  { id: '10', name: 'Basil', hex: '#0b8043' },
  { id: '11', name: 'Tomato', hex: '#d50000' },
];

const COLOR_SWATCHES = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#0ea5e9', '#3b82f6', '#6366f1',
  '#a855f7', '#ec4899', '#f43f5e', '#84cc16', '#10b981', '#06b6d4', '#8b5cf6', '#d946ef',
  '#64748b', '#78716c', '#000000', '#475569'
];

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  };
}

function getClosestGoogleColorId(hexColor) {
  const rgb = hexToRgb(hexColor);
  let closestColorId = '9';
  let minDistance = Infinity;

  for (const gColor of GOOGLE_COLORS) {
    const gRgb = hexToRgb(gColor.hex);
    const distance = Math.sqrt(
      Math.pow(rgb.r - gRgb.r, 2) +
      Math.pow(rgb.g - gRgb.g, 2) +
      Math.pow(rgb.b - gRgb.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColorId = gColor;
    }
  }

  return closestColorId;
}

const mapCounts = {};
for (const swatch of COLOR_SWATCHES) {
  const closest = getClosestGoogleColorId(swatch);
  console.log(`${swatch} maps to ${closest.name} (${closest.id})`);
  mapCounts[closest.name] = (mapCounts[closest.name] || 0) + 1;
}
console.log(mapCounts);
