const VERIFIER = {
  salt: "oO7zqZFEVnpM5wiUWEUPjQ==",
  digest: "nvl4KoTggNN9/L81ndzqzat4wfysOdefNBXUvcoG3D0=",
  iterations: 310_000,
};

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function verifyLibraryPassword(password: string) {
  if (!password || !window.crypto?.subtle) return false;
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: decodeBase64(VERIFIER.salt),
      iterations: VERIFIER.iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return constantTimeEqual(new Uint8Array(bits), decodeBase64(VERIFIER.digest));
}
