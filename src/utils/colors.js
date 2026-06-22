export function getPredictableColor(index, saturation = 70, lightness = 50) {
  const goldenRatioConjugate = 0.618033988749895;
  
  // Multiply index by the golden ratio and take the fractional part
  let hue = (index * goldenRatioConjugate) % 1;
  
  hue = Math.floor(hue * 360);
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
