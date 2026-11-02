/**
 * FORM VALIDATOR
 * Murni logika validasi: menerima data, mengembalikan { valid, errors, data }.
 * Tidak menyentuh DOM maupun penyimpanan.
 */
import { KATEGORI } from '../services/dataService.js';

const SATUAN = ['kg', 'ikat', 'butir', 'botol', 'pak'];
const REGEX_WA = /^(?:\+?62|0)8[1-9][0-9]{7,11}$/;

const rules = {
  nama(v) {
    if (!v) return 'Nama produk wajib diisi.';
    if (v.length < 3) return 'Nama produk minimal 3 karakter.';
    if (v.length > 60) return 'Nama produk maksimal 60 karakter.';
  },
  kategori(v) {
    if (!v) return 'Pilih kategori produk.';
    if (!KATEGORI.includes(v)) return 'Kategori tidak valid.';
  },
  satuan(v) {
    if (!v) return 'Pilih satuan.';
    if (!SATUAN.includes(v)) return 'Satuan tidak valid.';
  },
  harga(v) {
    if (v === '') return 'Harga wajib diisi.';
    const n = Number(v);
    if (!Number.isFinite(n)) return 'Harga harus berupa angka.';
    if (n <= 0) return 'Harga harus lebih dari 0.';
    if (n > 100_000_000) return 'Harga terlalu besar.';
  },
  stok(v) {
    if (v === '') return 'Stok wajib diisi (isi 0 jika habis).';
    const n = Number(v);
    if (!Number.isInteger(n)) return 'Stok harus bilangan bulat.';
    if (n < 0) return 'Stok tidak boleh negatif.';
  },
  penjual(v) {
    if (!v) return 'Nama penjual wajib diisi.';
    if (v.length < 3) return 'Nama penjual minimal 3 karakter.';
  },
  kontak(v) {
    if (!v) return 'Nomor WhatsApp wajib diisi.';
    if (!REGEX_WA.test(v.replace(/[\s-]/g, ''))) return 'Format salah. Contoh: 081234567890.';
  },
  deskripsi(v) {
    if (v.length > 200) return 'Deskripsi maksimal 200 karakter.';
  },
};

/** Bersihkan input mentah dari form. */
export function sanitize(raw) {
  const t = (k) => String(raw[k] ?? '').trim();
  return {
    nama: t('nama'), kategori: t('kategori'), satuan: t('satuan'),
    harga: t('harga'), stok: t('stok'), penjual: t('penjual'),
    kontak: t('kontak').replace(/[\s-]/g, ''), deskripsi: t('deskripsi'),
  };
}

export function validateField(name, value) {
  const v = String(value ?? '').trim();
  return rules[name]?.(name === 'kontak' ? v.replace(/[\s-]/g, '') : v) ?? '';
}

export function validateProduct(raw) {
  const clean = sanitize(raw);
  const errors = {};
  for (const key of Object.keys(rules)) {
    const msg = rules[key](clean[key]);
    if (msg) errors[key] = msg;
  }
  const valid = Object.keys(errors).length === 0;
  const data = valid ? { ...clean, harga: Number(clean.harga), stok: Number(clean.stok) } : null;
  return { valid, errors, data };
}

/* ===================== VALIDASI CHECKOUT ===================== */
export const METODE_BAYAR = ['Transfer Bank', 'QRIS', 'E-Wallet', 'Bayar di Tempat (COD)'];
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const checkoutRules = {
  nama(v) {
    if (!v) return 'Nama lengkap wajib diisi.';
    if (v.length < 3) return 'Nama minimal 3 karakter.';
    if (!/^[\p{L}\s.'-]+$/u.test(v)) return 'Nama hanya boleh berisi huruf.';
  },
  email(v) {
    if (!v) return 'Email wajib diisi.';
    if (!REGEX_EMAIL.test(v)) return 'Format email tidak valid. Contoh: nama@email.com.';
  },
  alamat(v) {
    if (!v) return 'Alamat pengiriman wajib diisi.';
    if (v.length < 15) return 'Alamat terlalu singkat. Tulis jalan, RT/RW, kelurahan, dan kota.';
    if (v.length > 250) return 'Alamat maksimal 250 karakter.';
  },
  metode(v) {
    if (!v) return 'Pilih metode pembayaran.';
    if (!METODE_BAYAR.includes(v)) return 'Metode pembayaran tidak valid.';
  },
  jumlah(v, stok) {
    if (v === '') return 'Jumlah wajib diisi.';
    const n = Number(v);
    if (!Number.isInteger(n) || n < 1) return 'Jumlah minimal 1 dan berupa bilangan bulat.';
    if (n > stok) return `Jumlah melebihi stok (sisa ${stok}).`;
  },
};

export function validateCheckoutField(name, value, stok) {
  return checkoutRules[name]?.(String(value ?? '').trim(), stok) ?? '';
}

export function validateCheckout(raw, stok) {
  const clean = {};
  for (const k of Object.keys(checkoutRules)) clean[k] = String(raw[k] ?? '').trim();
  const errors = {};
  for (const k of Object.keys(checkoutRules)) {
    const msg = checkoutRules[k](clean[k], stok);
    if (msg) errors[k] = msg;
  }
  const valid = Object.keys(errors).length === 0;
  return { valid, errors, data: valid ? { ...clean, jumlah: Number(clean.jumlah) } : null };
}
