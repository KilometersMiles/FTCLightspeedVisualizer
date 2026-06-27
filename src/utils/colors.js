export function getPredictableColor(index, saturation = 70, lightness = 50) {
  const goldenRatioConjugate = 0.618033988749895;
  
  // Multiply index by the golden ratio and take the fractional part
  let hue = (index * goldenRatioConjugate) % 1;
  
  hue = Math.floor(hue * 360);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export const getSpeedColor = (v, maxSpeed = 2.0) => {
  const ratio = Math.min(Math.max(v / maxSpeed, 0), 1);
  const hue = ratio * 120;
  return `hsl(${hue}, 100%, 50%)`;
};