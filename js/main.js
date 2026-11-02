/**
 * MAIN — orkestrator. Menghubungkan Data Service, Form Validator, dan UI Renderer.
 */
import { dataService, KATEGORI } from './services/dataService.js';
import { validateProduct, validateField } from './validators/formValidator.js';
import { ui } from './ui/uiRenderer.js';

const $ = (id) => document.getElementById(id);
let els;
let produk = [];

async function refresh() {
  produk = await dataService.getAll();
  render();
}

function render() {
  const hasil = dataService.query(produk, {
    keyword: els.cari.value, kategori: els.kategoriFilter.value, urutan: els.urutan.value,
  });
  ui.renderProducts(els.grid, hasil, { onEdit: openEdit, onDelete: handleDelete });
  ui.renderSummary(els.ringkasan, dataService.summarize(produk));
  ui.renderResultInfo(els.info, hasil.length, produk.length);
}

/* ----- Dialog ----- */
function openAdd() {
  ui.setDialogTitle('Tambah produk');
  ui.fillForm(els.form);
  els.dialog.showModal();
  els.form.elements.nama.focus();
}

async function openEdit(id) {
  const p = await dataService.getById(id);
  if (!p) return ui.toast('Produk tidak ditemukan.', 'error');
  ui.setDialogTitle('Ubah produk');
  ui.fillForm(els.form, p);
  els.dialog.showModal();
}

async function handleSubmit(e) {
  e.preventDefault();
  const raw = Object.fromEntries(new FormData(els.form));
  const { valid, errors, data } = validateProduct(raw);
  ui.clearErrors(els.form);
  if (!valid) return ui.showErrors(els.form, errors);

  try {
    if (raw.id) { await dataService.update(raw.id, data); ui.toast('Produk diperbarui.'); }
    else { await dataService.create(data); ui.toast('Produk ditambahkan.'); }
    els.dialog.close();
    await refresh();
  } catch (err) {
    ui.toast(err.message, 'error');
  }
}

async function handleDelete(p) {
  if (!confirm(`Hapus "${p.nama}" dari katalog?`)) return;
  await dataService.remove(p.id);
  ui.toast('Produk dihapus.');
  await refresh();
}

/* ----- Event ----- */
function bindEvents() {
  $('btn-tambah').addEventListener('click', openAdd);
  $('btn-tutup').addEventListener('click', () => els.dialog.close());
  $('btn-batal').addEventListener('click', () => els.dialog.close());
  els.form.addEventListener('submit', handleSubmit);

  // Validasi langsung saat meninggalkan kolom
  els.form.addEventListener('focusout', (e) => {
    const { name, value } = e.target;
    if (name && name !== 'id') ui.showFieldError(els.form, name, validateField(name, value));
  });
  els.form.addEventListener('input', (e) => { if (e.target.name === 'deskripsi') ui.updateCounter(els.form); });

  els.filter.addEventListener('submit', (e) => e.preventDefault());
  els.cari.addEventListener('input', render);
  els.kategoriFilter.addEventListener('change', render);
  els.urutan.addEventListener('change', render);
}

function init() {
  els = {
    grid: $('grid-produk'), ringkasan: $('ringkasan'), info: $('info-hasil'),
    filter: $('form-filter'), cari: $('cari'), kategoriFilter: $('filter-kategori'), urutan: $('urutan'),
    dialog: $('dialog-form'), form: $('form-produk'),
  };
  ui.renderOptions(els.kategoriFilter, KATEGORI, 'Semua kategori');
  ui.renderOptions($('kategori'), KATEGORI, 'Pilih kategori');
  bindEvents();
  refresh();
}

// type="module" bersifat deferred, tetapi tetap aman jika DOM belum siap
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
