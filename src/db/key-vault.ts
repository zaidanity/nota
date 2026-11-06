import type { AIProviderId } from '@/ai/types'
import { db } from './db'

const VAULT_DB = 'nota-vault'
const VAULT_STORE = 'keys'
const MASTER_KEY_ID = 'master'

interface VaultRecord {
  id: string
  key: CryptoKey
}

let vaultPromise: Promise<IDBDatabase> | null = null
let sessionKey: CryptoKey | null = null
let persistenceAvailable: boolean | null = null

function ensureCrypto(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error(
      'Web Crypto tidak tersedia. Buka Nota melalui HTTPS atau localhost untuk memakai AI.',
    )
  }
  return crypto.subtle
}

function openVault(): Promise<IDBDatabase> {
  if (vaultPromise) return vaultPromise
  vaultPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di browser ini.'))
      return
    }
    const request = indexedDB.open(VAULT_DB, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(VAULT_STORE)) {
        database.createObjectStore(VAULT_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Gagal membuka vault.'))
    request.onblocked = () => reject(new Error('Vault sedang dipakai tab lain.'))
  })
  return vaultPromise
}

function readVaultKey(): Promise<CryptoKey | null> {
  return openVault().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(VAULT_STORE, 'readonly')
        const request = transaction.objectStore(VAULT_STORE).get(MASTER_KEY_ID)
        request.onsuccess = () => {
          const record = request.result as VaultRecord | undefined
          resolve(record?.key ?? null)
        }
        request.onerror = () => reject(request.error ?? new Error('Gagal membaca vault.'))
      }),
  )
}

function writeVaultKey(key: CryptoKey): Promise<void> {
  return openVault().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(VAULT_STORE, 'readwrite')
        const request = transaction.objectStore(VAULT_STORE).put({
          id: MASTER_KEY_ID,
          key,
        } satisfies VaultRecord)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error ?? new Error('Gagal menyimpan vault.'))
      }),
  )
}

async function getMasterKey(): Promise<CryptoKey> {
  if (sessionKey) return sessionKey

  try {
    const stored = await readVaultKey()
    if (stored) {
      persistenceAvailable = true
      return stored
    }
  } catch {
    // Fall through to a session-only key if structured cloning is unavailable.
  }

  const generated = await ensureCrypto().generateKey(
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
  const key = generated as CryptoKey

  try {
    await writeVaultKey(key)
    persistenceAvailable = true
  } catch {
    persistenceAvailable = false
    sessionKey = key
  }
  return key
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}

function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes.buffer
}

async function encryptText(plainText: string): Promise<{ ciphertext: string; iv: string }> {
  const subtle = ensureCrypto()
  const key = await getMasterKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plainText)
  const encrypted = await subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return {
    ciphertext: toBase64(encrypted),
    iv: toBase64(iv.buffer),
  }
}

async function decryptText(ciphertext: string, iv: string): Promise<string> {
  const subtle = ensureCrypto()
  const key = await getMasterKey()
  const decrypted = await subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(fromBase64(iv)) },
    key,
    fromBase64(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}

export function isVaultPersistent(): boolean | null {
  return persistenceAvailable
}

export async function saveProviderKey(provider: AIProviderId, apiKey: string): Promise<void> {
  const trimmed = apiKey.trim()
  if (!trimmed) throw new Error('API key tidak boleh kosong.')

  const encrypted = await encryptText(trimmed)
  await db.secrets.put({
    provider,
    ciphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    hint: trimmed.slice(-4),
    updatedAt: Date.now(),
  })
}

export async function getProviderKey(provider: AIProviderId): Promise<string | null> {
  const record = await db.secrets.get(provider)
  if (!record) return null
  try {
    return await decryptText(record.ciphertext, record.iv)
  } catch {
    throw new Error(
      'API key tersimpan tidak bisa dibuka di perangkat ini. Hapus lalu simpan ulang key.',
    )
  }
}

export async function hasProviderKey(provider: AIProviderId): Promise<boolean> {
  return (await db.secrets.get(provider)) !== undefined
}

export async function removeProviderKey(provider: AIProviderId): Promise<void> {
  await db.secrets.delete(provider)
}

export async function clearProviderKeys(): Promise<void> {
  await db.secrets.clear()
}
