/**
 * MAIN — orkestrator. Menghubungkan Data Service, Form Validator, dan UI Renderer.
 * Dua mode: "client" (toko + checkout) dan "admin" (tambah produk, inventori, pesanan).
 */
import { dataService, KATEGORI, STOK_MENIPIS } from './services/dataService.js';
import {
  validateProduct, validateField, validateCheckout, validateCheckoutField, METODE_BAYAR,
} from './validators/formValidator.js';
import { ui } from './ui/uiRenderer.js';

const $ = (id) => document.getElementById(id);
let els;
let produk = [];
let pesanan = [];
let mode = 'client';
let produkDibeli = null;

/* ----- Render ----- */
async function refresh() {
  [produk, pesanan] = await Promise.all([dataService.getAll(), dataService.getOrders()]);
  render();
}

function render() {
  const hasil = dataService.query(produk, {
    keyword: els.cari.value, kategori: els.kategoriFilter.value, urutan: els.urutan.value,
  });
  ui.renderProducts(els.grid, hasil, { onBuy: openBuy });
  ui.renderResultInfo(els.info, hasil.length, produk.length);

  const urut = dataService.query(produk, { urutan: 'terbaru' });
  ui.renderSummary(els.ringkasan, dataService.summarize(produk, pesanan));
  ui.renderInventory($('tbody-inventori'), urut, { onEdit: startEdit, onDelete: handleDelete, stokMenipis: STOK_MENIPIS });
  ui.renderOrders($('tbody-pesanan'), pesanan, { onAdvance: handleAdvance, nextStatus: (s) => dataService.nextStatus(s) });
}

function toggleMode() {
  mode = mode === 'client' ? 'admin' : 'client';
  ui.setMode(mode);
  window.scrollTo({ top: 0 });
}

/* ----- Admin: produk ----- */
function resetProductForm() {
  ui.fillForm(els.formProduk);
  ui.setProductFormMode(els.formProduk, false);
}

async function startEdit(id) {
  const p = await dataService.getById(id);
  if (!p) return ui.toast('Produk tidak ditemukan.', 'error');
  ui.fillForm(els.formProduk, p);
  ui.setProductFormMode(els.formProduk, true);
  els.formProduk.elements.nama.focus();
  els.formProduk.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData(els.formProduk));
  const { valid, errors, data } = validateProduct(raw);
  ui.clearErrors(els.formProduk);
  if (!valid) return ui.showErrors(els.formProduk, errors);
  try {
    if (raw.id) { await dataService.update(raw.id, data); ui.toast('Produk diperbarui.'); }
    else { await dataService.create(data); ui.toast('Produk ditambahkan.'); }
    resetProductForm();
    await refresh();
  } catch (err) { ui.toast(err.message, 'error'); }
}

async function handleDelete(p) {
  if (!confirm(`Hapus "${p.nama}" dari katalog?`)) return;
  await dataService.remove(p.id);
  if (els.formProduk.elements.id.value === p.id) resetProductForm();
  ui.toast('Produk dihapus.');
  await refresh();
}

async function handleAdvance(id) {
  await dataService.advanceOrder(id);
  ui.toast('Status pesanan diperbarui.');
  await refresh();
}

/* ----- Client: checkout ----- */
function openBuy(id) {
  const p = produk.find((x) => x.id === id);
  if (!p || p.stok <= 0) return ui.toast('Produk sedang tidak tersedia.', 'error');
  produkDibeli = p;
  ui.fillCheckout(els.formBeli, p);
  els.dialogBeli.showModal();
  els.formBeli.elements.nama.focus();
}

async function handleBuySubmit(e) {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData(els.formBeli));
  const { valid, errors, data } = validateCheckout(raw, produkDibeli.stok);
  ui.clearErrors(els.formBeli);
  if (!valid) return ui.showErrors(els.formBeli, errors);
  try {
    const order = await dataService.createOrder({
      productId: raw.productId, jumlah: data.jumlah,
      pembeli: { nama: data.nama, email: data.email, alamat: data.alamat, metode: data.metode },
    });
    els.dialogBeli.close();
    ui.showSuccess(order);
    await refresh();
  } catch (err) {
    ui.toast(err.message, 'error');
    await refresh();
  }
}

/* ----- Event ----- */
function bindEvents() {
  $('btn-mode').addEventListener('click', toggleMode);

  // Filter toko
  els.filter.addEventListener('submit', (e) => e.preventDefault());
  els.cari.addEventListener('input', render);
  els.kategoriFilter.addEventListener('change', render);
  els.urutan.addEventListener('change', render);

  // Form produk (admin)
  els.formProduk.addEventListener('submit', handleProductSubmit);
  $('btn-batal-ubah').addEventListener('click', resetProductForm);
  els.formProduk.addEventListener('focusout', (e) => {
    const { name, value } = e.target;
    if (name && name !== 'id') ui.showFieldError(els.formProduk, name, validateField(name, value));
  });
  els.formProduk.addEventListener('input', (e) => { if (e.target.name === 'deskripsi') ui.updateCounter(els.formProduk); });

  // Form checkout (client)
  els.formBeli.addEventListener('submit', handleBuySubmit);
  $('btn-tutup-beli').addEventListener('click', () => els.dialogBeli.close());
  $('btn-batal-beli').addEventListener('click', () => els.dialogBeli.close());
  els.formBeli.addEventListener('focusout', (e) => {
    const { name, value } = e.target;
    if (name && name !== 'productId') ui.showFieldError(els.formBeli, name, validateCheckoutField(name, value, produkDibeli?.stok ?? 0));
  });
  els.formBeli.addEventListener('input', (e) => { if (e.target.name === 'jumlah' && produkDibeli) ui.updateTotal(els.formBeli, produkDibeli); });
  $('btn-sukses-tutup').addEventListener('click', () => $('dialog-sukses').close());
}

function init() {
  els = {
    grid: $('grid-produk'), ringkasan: $('ringkasan'), info: $('info-hasil'),
    filter: $('form-filter'), cari: $('cari'), kategoriFilter: $('filter-kategori'), urutan: $('urutan'),
    formProduk: $('form-produk'), formBeli: $('form-beli'), dialogBeli: $('dialog-beli'),
  };
  ui.renderOptions(els.kategoriFilter, KATEGORI, 'Semua kategori');
  ui.renderOptions($('kategori'), KATEGORI, 'Pilih kategori');
  ui.renderOptions($('b-metode'), METODE_BAYAR, 'Pilih metode pembayaran');
  bindEvents();
  ui.setMode(mode);
  refresh();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
