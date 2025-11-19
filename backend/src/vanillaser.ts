// -----------------------------------------------------------------------------
// Canonical Serialization Types & Constants
// -----------------------------------------------------------------------------

export const TYPE_NULL   = 0x00;
export const TYPE_TRUE   = 0x01;
export const TYPE_FALSE  = 0x02;
export const TYPE_INT    = 0x03;
export const TYPE_BYTES  = 0x05;
export const TYPE_LIST   = 0x06;
export const TYPE_OBJECT = 0x07;

export type CanonicalPrimitive =
  | null
  | boolean
  | number
  | bigint
  | string
  | Uint8Array;

export interface CanonicalObject {
  [key: string]: CanonicalValue;
}

export type CanonicalValue =
  | CanonicalPrimitive
  | CanonicalValue[]
  | CanonicalObject;

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function canonicalSerialize(value: any): Uint8Array {
  const bytesOut: number[] = [];
  encodeValue(value, bytesOut);
  return new Uint8Array(bytesOut);
}

export function canonicalDeserialize(data: Uint8Array): CanonicalValue {
  const ref = { offset: 0 };
  return decodeValue(data, ref);
}

// -----------------------------------------------------------------------------
// Internal Helpers
// -----------------------------------------------------------------------------

function appendBytes(out: number[], bytes: Uint8Array): void {
  for (const b of bytes) out.push(b);
}

/**
 * Encode bigint as a "varint": [header byte = sign + length] [bytes...]
 */
function encodeVarint(n: number | bigint, out: number[]): void {
  let value: bigint =
    typeof n === "bigint" ? n : BigInt(n);

  const isNegative = value < 0n;
  if (isNegative) value = -value;

  const bytes: number[] = [];
  if (value !== 0n) {
    while (value > 0n) {
      bytes.push(Number(value & 0xffn));
      value >>= 8n;
    }
    bytes.reverse();
  }

  const length = bytes.length;
  if (length > 127) {
    throw new Error("Varint is too large (length > 127 bytes)");
  }

  const header = (isNegative ? 0x80 : 0x00) | length;

  out.push(header);
  for (const b of bytes) out.push(b);
}

function decodeVarint(data: Uint8Array, ref: { offset: number }): bigint {
  if (ref.offset >= data.length) throw new Error("decodeVarint: OOB");

  const header = data[ref.offset++];
  const signBit = header >> 7;
  const length = header & 0x7f;

  let value = 0n;

  for (let i = 0; i < length; i++) {
    if (ref.offset >= data.length) throw new Error("decodeVarint: OOB");
    value = (value << 8n) | BigInt(data[ref.offset++]);
  }

  return signBit === 1 ? -value : value;
}

function compareBytes(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length; // shorter first
}

function encodeKeyBytes(key: string): number[] {
  const tmp: number[] = [];
  encodeValue(key, tmp);
  return tmp;
}

// -----------------------------------------------------------------------------
// Encoding
// -----------------------------------------------------------------------------

function encodeValue(value: CanonicalValue, out: number[]): void {
  if (value === null) {
    out.push(TYPE_NULL);
    return;
  }

  if (typeof value === "boolean") {
    out.push(value ? TYPE_TRUE : TYPE_FALSE);
    return;
  }

  if (typeof value === "number" || typeof value === "bigint") {
    out.push(TYPE_INT);
    encodeVarint(value, out);
    return;
  }

  if (typeof value === "string") {
    out.push(TYPE_BYTES);
    const utf8 = new TextEncoder().encode(value);
    encodeVarint(utf8.length, out);
    appendBytes(out, utf8);
    return;
  }

  if (value instanceof Uint8Array) {
    out.push(TYPE_BYTES);
    encodeVarint(value.length, out);
    appendBytes(out, value);
    return;
  }

  if (Array.isArray(value)) {
    out.push(TYPE_LIST);
    encodeVarint(value.length, out);
    for (const v of value) encodeValue(v, out);
    return;
  }

  if (typeof value === "object") {
    const entries = Object.keys(value).map((k) => ({
      key: k,
      keyBytes: encodeKeyBytes(k)
    }));

    // Sort by encoded key bytes
    entries.sort((a, b) => compareBytes(a.keyBytes, b.keyBytes));

    out.push(TYPE_OBJECT);
    encodeVarint(entries.length, out);

    for (const e of entries) {
      encodeValue(e.key, out);
      encodeValue((value as any)[e.key], out);
    }
    return;
  }

  throw new Error(`Unsupported type: ${typeof value}`);
}

// -----------------------------------------------------------------------------
// Decoding
// -----------------------------------------------------------------------------

function decodeValue(
  data: Uint8Array,
  ref: { offset: number }
): CanonicalValue {
  if (ref.offset >= data.length) {
    throw new Error("decodeValue: Out of bounds");
  }

  const type = data[ref.offset++];

  switch (type) {
    case TYPE_NULL:
      return null;

    case TYPE_TRUE:
      return true;

    case TYPE_FALSE:
      return false;

    case TYPE_INT:
      return decodeVarint(data, ref);

    case TYPE_BYTES: {
      const length = decodeVarint(data, ref);
      if (length < 0n) throw new Error("bytes length negative");
      const len = Number(length);

      if (ref.offset + len > data.length) {
        throw new Error("decode bytes: out of bounds");
      }

      const bytes = data.slice(ref.offset, ref.offset + len);
      ref.offset += len;
      return bytes;
    }

    case TYPE_LIST: {
      const length = decodeVarint(data, ref);
      const len = Number(length);

      const arr: CanonicalValue[] = [];
      for (let i = 0; i < len; i++) {
        arr.push(decodeValue(data, ref));
      }
      return arr;
    }

    case TYPE_OBJECT: {
      const length = decodeVarint(data, ref);
      const len = Number(length);

      const obj: Record<string, CanonicalValue> = {};
      for (let i = 0; i < len; i++) {
        const key = decodeValue(data, ref);
        if (typeof key !== "string") {
          throw new Error("Object key must decode to a string");
        }
        const val = decodeValue(data, ref);
        obj[key] = val;
      }
      return obj;
    }

    default:
      throw new Error(`decodeValue: Unknown type ${type}`);
  }
}
