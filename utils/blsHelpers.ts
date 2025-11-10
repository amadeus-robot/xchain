function fpToLimbStruct(fp: bigint) {
  const hex = fp.toString(16).padStart(96, '0'); // 381 bits ≈ 48 bytes, but we pad for clarity
  const lo = "0x" + hex.slice(-64);   // lower 256 bits
  const hi = "0x" + hex.slice(0, hex.length - 64).padStart(64, '0'); // upper bits
  return [hi, lo];
}

export const  g1ToStruct = (P) => {
  const [x_hi, x_lo] = fpToLimbStruct(P.x);
  const [y_hi, y_lo] = fpToLimbStruct(P.y);
  return { x_a: x_lo, x_b: x_hi, y_a: y_lo, y_b: y_hi };
}

export const g2ToStruct = (P) => {
  const [x0_hi, x0_lo] = fpToLimbStruct(P.x.c0);
  const [x1_hi, x1_lo] = fpToLimbStruct(P.x.c1);
  const [y0_hi, y0_lo] = fpToLimbStruct(P.y.c0);
  const [y1_hi, y1_lo] = fpToLimbStruct(P.y.c1);
  return {
    x_c0_a: x0_lo, x_c0_b: x0_hi,
    x_c1_a: x1_lo, x_c1_b: x1_hi,
    y_c0_a: y0_lo, y_c0_b: y0_hi,
    y_c1_a: y1_lo, y_c1_b: y1_hi
  };
}
