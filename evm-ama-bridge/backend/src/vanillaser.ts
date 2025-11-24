// ------------------------------------------------------------
// Types
// ------------------------------------------------------------

export type CanonicalValue =
  | null
  | boolean
  | number
  | bigint
  | string
  | Uint8Array
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

const TYPE_NULL   = 0x00;
const TYPE_TRUE   = 0x01;
const TYPE_FALSE  = 0x02;
const TYPE_INT    = 0x03;
const TYPE_BYTES  = 0x05;
const TYPE_LIST   = 0x06;
const TYPE_OBJECT = 0x07;

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

export function canonicalSerialize(value: any): Uint8Array {
  const bytesOut: number[] = [];
  encodeValue(value, bytesOut);
  return new Uint8Array(bytesOut);
}

// optional future implementation
export function canonicalDeserialize(_data: Uint8Array): CanonicalValue {
  throw new Error("canonicalDeserialize not implemented");
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function appendBytes(out: number[], bytes: Uint8Array | number[]): void {
  for (const b of bytes) out.push(b);
}

function encodeVarint(n: bigint | number, out: number[]): void {
  let value = typeof n === "bigint" ? n : BigInt(n);

  const isNegative = value < 0n;
  if (isNegative) value = -value;

  const bytes: number[] = [];

  if (value !== 0n) {
    while (value > 0n) {
      bytes.push(Number(value & 0xFFn));
      value >>= 8n;
    }
    bytes.reverse();
  }

  const length = bytes.length;
  if (length > 127) {
    throw new Error("Value too large: length exceeds 127 bytes.");
  }

  const header = (Number(isNegative) << 7) | length;

  const output = new Uint8Array(1 + length);
  output[0] = header;

  for (let i = 0; i < length; i++) {
    output[i + 1] = bytes[i];
  }

  appendBytes(out, output);
}

function decodeVarint(data: Uint8Array, ref: { offset: number }): bigint {
  const header = data[ref.offset++];
  const signBit = header >> 7;
  const length = header & 0x7F;

  let value = 0n;
  for (let i = 0; i < length; i++) {
    value = (value << 8n) | BigInt(data[ref.offset++]);
  }

  return signBit === 1 ? -value : value;
}

// ------------------------------------------------------------
// Encoding Logic
// ------------------------------------------------------------

function encodeValue(value: any, out: number[]): void {
  if (value === null) {
    out.push(TYPE_NULL);

  } else if (typeof value === "boolean") {
    out.push(value ? TYPE_TRUE : TYPE_FALSE);

  } else if (typeof value === "number" || typeof value === "bigint") {
    out.push(TYPE_INT);
    encodeVarint(value, out);

  } else if (typeof value === "string") {
    out.push(TYPE_BYTES);
    const utf8 = new TextEncoder().encode(value);
    encodeVarint(utf8.length, out);
    appendBytes(out, utf8);

  } else if (value instanceof Uint8Array) {
    out.push(TYPE_BYTES);
    encodeVarint(value.length, out);
    appendBytes(out, value);

  } else if (Array.isArray(value)) {
    out.push(TYPE_LIST);
    encodeVarint(value.length, out);
    for (const element of value) {
      encodeValue(element, out);
    }

  } else if (typeof value === "object") {
    const keys = Object.keys(value).sort();

    out.push(TYPE_OBJECT);
    encodeVarint(keys.length, out);

    for (const k of keys) {
      encodeValue(k, out);          // encode key as string
      encodeValue(value[k], out);   // encode value
    }

  } else {
    throw new Error(`Unsupported type: ${typeof value}`);
  }
}

// ------------------------------------------------------------
// Decoding Logic
// ------------------------------------------------------------

export function decodeBytes(data: Uint8Array, ref: { offset: number }): CanonicalValue {
  if (ref.offset >= data.length) {
    throw new Error("decodeBytes: Out of bounds read");
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
      const length = Number(decodeVarint(data, ref));
      const bytes = data.slice(ref.offset, ref.offset + length);
      ref.offset += length;
      return bytes;
    }

    default:
      throw new Error(`decodeBytes: Unknown type ${type}`);
  }
}
