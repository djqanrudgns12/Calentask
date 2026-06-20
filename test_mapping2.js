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

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  };
}

function getClosestWeighted(hexColor) {
  const rgb = hexToRgb(hexColor);
  let closestColorId = '9';
  let minDistance = Infinity;

  for (const gColor of GOOGLE_COLORS) {
    const gRgb = hexToRgb(gColor.hex);
    // Weighted Euclidean
    const distance = Math.sqrt(
      2 * Math.pow(rgb.r - gRgb.r, 2) +
      4 * Math.pow(rgb.g - gRgb.g, 2) +
      3 * Math.pow(rgb.b - gRgb.b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColorId = gColor;
    }
  }

  return closestColorId;
}

console.log("#000000 maps to", getClosestWeighted("#000000").name);
console.log("#ffffff maps to", getClosestWeighted("#ffffff").name);
console.log("#8b5cf6 maps to", getClosestWeighted("#8b5cf6").name);
