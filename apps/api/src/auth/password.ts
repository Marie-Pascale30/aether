import { randomBytes, scrypt, timingSafeEqual, type BinaryLike } from "node:crypto";

// scrypt natif de Node : pas de dépendance native à compiler (utile sous Windows).
const KEY_LENGTH = 64;

function derive(password: BinaryLike, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) =>
        scrypt(password, salt, KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key))),
    );
}

/** Format stocké : `scrypt$<sel hex>$<clé hex>`. */
export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16);
    const key = await derive(password, salt);
    return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
    const [scheme, saltHex, keyHex] = stored.split("$");
    if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

    const expected = Buffer.from(keyHex, "hex");
    const actual = await derive(password, Buffer.from(saltHex, "hex"));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Empreinte factice (sel et clé arbitraires), comparée quand le compte n'existe pas : la connexion
 * coûte alors le même calcul scrypt qu'avec un vrai compte.
 */
export const DUMMY_PASSWORD_HASH = ["scrypt", "0".repeat(32), "0".repeat(KEY_LENGTH * 2)].join("$");
