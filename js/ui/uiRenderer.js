/**
 * UI RENDERER
 * Hanya mengurus tampilan/DOM. Tidak ada logika bisnis atau akses data.
 * Memakai createElement + textContent (bukan innerHTML) agar aman dari XSS.
 */
const IKON = { 'Sayuran': '🥬', 'Buah': '🍌', 'Beras & Serealia': '🌾', 'Rempah': '🌶️', 'Olahan': '🥫' };

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function el(tag, { className, text, attrs = {} } = {}, children = []) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  children.forEach((c) => node.append(c));
  return node;
}

function waLink(kontak, nama) {
  const nomor = kontak.replace(/^\+/, '').replace(/^0/, '62');
  return `https://wa.me/${nomor}?text=${encodeURIComponent(`Halo, saya tertarik dengan ${nama}.`)}`;
}

function createCard(p, { onEdit, onDelete }) {
  const habis = p.stok <= 0;
  const stokEl = el('p', { className: `meta ${habis ? 'stok-habis' : ''}`, text: habis ? 'Stok habis' : `Stok: ${p.stok} ${p.satuan}` });
  const harga = el('p', { className: 'price' }, [
    document.createTextNode(rupiah.format(p.harga)),
    el('small', { text: ` / ${p.satuan}` }),
  ]);

  const wa = el('a', { className: 'btn btn-small', text: 'Hubungi', attrs: { href: waLink(p.kontak, p.nama), target: '_blank', rel: 'noopener noreferrer', 'aria-label': `Hubungi penjual ${p.penjual} via WhatsApp` } });
  const edit = el('button', { className: 'btn btn-small', text: 'Ubah', attrs: { type: 'button', 'aria-label': `Ubah ${p.nama}` } });
  const hapus = el('button', { className: 'btn btn-small btn-danger', text: 'Hapus', attrs: { type: 'button', 'aria-label': `Hapus ${p.nama}` } });
  edit.addEventListener('click', () => onEdit(p.id));
  hapus.addEventListener('click', () => onDelete(p));

  return el('article', { className: 'card' }, [
    el('div', { className: 'card-media', text: IKON[p.kategori] ?? '🌱', attrs: { 'aria-hidden': 'true' } }),
    el('div', { className: 'card-body' }, [
      el('span', { className: 'badge', text: p.kategori }),
      el('h3', { text: p.nama }),
      harga,
      stokEl,
      el('p', { className: 'meta', text: `Penjual: ${p.penjual}` }),
      el('p', { className: 'meta', text: p.deskripsi || 'Belum ada deskripsi.' }),
    ]),
    el('div', { className: 'card-actions' }, [wa, edit, hapus]),
  ]);
}

export const ui = {
  renderProducts(container, products, handlers) {
    container.replaceChildren();
    if (products.length === 0) {
      container.append(el('p', { className: 'empty', text: 'Tidak ada produk yang cocok. Ubah kata kunci atau tambahkan produk baru.' }));
      return;
    }
    const frag = document.createDocumentFragment();
    products.forEach((p) => frag.append(createCard(p, handlers)));
    container.append(frag);
  },

  renderSummary(container, s) {
    const items = [['Total produk', s.total], ['Stok tersedia', s.tersedia], ['Penjual', s.penjual], ['Kategori', s.kategori]];
    container.replaceChildren(...items.map(([label, val]) =>
      el('div', {}, [el('dt', { text: label }), el('dd', { text: String(val) })])));
  },

  renderResultInfo(node, shown, total) {
    node.textContent = shown === total ? `Menampilkan ${total} produk.` : `Menampilkan ${shown} dari ${total} produk.`;
  },

  renderOptions(select, options, placeholder) {
    select.replaceChildren(el('option', { text: placeholder, attrs: { value: '' } }),
      ...options.map((o) => el('option', { text: o, attrs: { value: o } })));
  },

  fillForm(form, data = {}) {
    form.reset();
    ['id', 'nama', 'kategori', 'satuan', 'harga', 'stok', 'penjual', 'kontak', 'deskripsi']
      .forEach((k) => { if (form.elements[k]) form.elements[k].value = data[k] ?? ''; });
    this.clearErrors(form);
    this.updateCounter(form);
  },

  updateCounter(form) {
    form.querySelector('#hitung').textContent = form.elements.deskripsi.value.length;
  },

  showFieldError(form, name, message) {
    const field = form.elements[name];
    const slot = form.querySelector(`[data-error-for="${name}"]`);
    if (!field || !slot) return;
    slot.textContent = message;
    field.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message) { slot.id = `err-${name}`; field.setAttribute('aria-describedby', slot.id); }
    else field.removeAttribute('aria-describedby');
  },

  showErrors(form, errors) {
    Object.keys(errors).forEach((k) => this.showFieldError(form, k, errors[k]));
    const first = Object.keys(errors)[0];
    if (first) form.elements[first].focus();
  },

  clearErrors(form) {
    form.querySelectorAll('[data-error-for]').forEach((s) => this.showFieldError(form, s.dataset.errorFor, ''));
  },

  setDialogTitle(text) { document.getElementById('judul-dialog').textContent = text; },

  toast(message, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = message;
    t.dataset.type = type;
    t.hidden = false;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => { t.hidden = true; }, 2800);
  },
};
