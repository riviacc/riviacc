const API_URL='https://script.google.com/macros/s/AKfycbx1DTb7OiIarQLyaRAUy0cNbYvnMUt0m3WPaXBjCks-FwAW5ZaJhoWp8fpQ_PDZANptBQ/exec'; 

let token = localStorage.getItem('stok_token') || '';
let user = null;
let barangCache = [];

try {
  const savedUser = localStorage.getItem('stok_user');

  if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
    user = JSON.parse(savedUser);
  }
} catch (error) {
  console.error('Data user lokal tidak valid:', error);
  localStorage.removeItem('stok_user');
  localStorage.removeItem('stok_token');
  token = '';
  user = null;
}
async function api(action, data = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        action: action,
        ...data
      })
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status);
    }

    const text = await response.text();

    if (!text) {
      throw new Error('Server tidak mengembalikan data.');
    }

    console.log('API Response:', text);

    return JSON.parse(text);

  } catch (error) {
    console.error('API ERROR:', error);

    throw new Error(
      'Koneksi ke server gagal: ' + error.message
    );
  }
}

const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');

function table(rows){
  if(!Array.isArray(rows)||!rows.length)return '<p>Tidak ada data.</p>';
  const h=Object.keys(rows[0]);
  return `<div class="table-wrap"><table><thead><tr>${h.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${h.map(x=>`<td>${esc(r[x])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function showApp() {
  $('loginPage').classList.add('hidden');
  $('appPage').classList.remove('hidden');

  $('userName').textContent =
    user?.nama || user?.username || '-';

  $('userRole').textContent =
    user?.role || '-';

  const role =
    String(user?.role || '').trim().toLowerCase();

  // ADMIN SAJA
  document.querySelectorAll('.admin-only').forEach(el => {
    el.classList.toggle('hidden', role !== 'admin');
  });

  // ADMIN + STOK
  document.querySelectorAll('.stok-only').forEach(el => {
    el.classList.toggle(
      'hidden',
      !['admin', 'stok'].includes(role)
    );
  });

  // ADMIN + GUDANG
  document.querySelectorAll('.transaction-nav').forEach(el => {
    el.classList.toggle(
      'hidden',
      !['admin', 'gudang'].includes(role)
    );
  });

  // Pengamanan tambahan khusus menu LOG
  document.querySelectorAll('[data-page="log"]').forEach(el => {
    el.classList.toggle('hidden', role !== 'admin');
  });

  loadDashboard();
}

function logout(){
  if(token) api('logout',{token}).catch(()=>{});
  token='';user=null;localStorage.removeItem('stok_token');localStorage.removeItem('stok_user');
  $('appPage').classList.add('hidden');$('loginPage').classList.remove('hidden');$('password').value='';
}

async function login(e) {
  e.preventDefault();

  const message = document.getElementById('loginMessage');
  const button = document.getElementById('loginButton');

  message.textContent = '⏳ Memeriksa login...';
  button.disabled = true;
  button.textContent = 'Memproses...';

  try {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      message.textContent = '❌ Username dan password wajib diisi.';
      return;
    }

    console.log('LOGIN:', username);

    const result = await api('login', {
      username: username,
      password: password
    });

    console.log('HASIL LOGIN:', result);

    if (!result || result.success !== true) {
      message.textContent =
        '❌ ' + (result?.message || 'Login gagal.');
      return;
    }

    token = result.token;
    user = result.user;

    localStorage.setItem('stok_token', token);
    localStorage.setItem('stok_user', JSON.stringify(user));

    message.textContent = '✅ Login berhasil.';

    showApp();

  } catch (error) {
    console.error('LOGIN ERROR:', error);

    message.textContent =
      '❌ ' + (error.message || 'Terjadi kesalahan koneksi.');

  } finally {
    button.disabled = false;
    button.textContent = 'Masuk';
  }
}

document.getElementById('loginForm').addEventListener('submit', login);
console.log('LOGIN EVENT AKTIF');

function go(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  const target=$('page-'+page);if(target)target.classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  if(page==='dashboard')loadDashboard();
  if(page==='barang')loadBarang();
  if(page==='stok')loadStok();
  if(page==='transaksi')loadBarangForTransaction();
  if(page==='penyesuaian')loadAdjustmentBarang();
  if(page==='users')loadUsers();
  if(page==='log')loadLog();
}

async function loadDashboard(){
  try{
    const r=await api('dashboard',{token});
    if(!r.success)return apiError(r);
    const d=r.data||{};
    $('totalBarang').textContent=d.totalBarang??0;$('totalStok').textContent=d.totalStok??0;$('stokMenipis').textContent=d.stokMenipis??0;$('stokHabis').textContent=d.stokHabis??0;$('barangMasuk').textContent=d.barangMasuk??0;$('barangKeluar').textContent=d.barangKeluar??0;
    $('recentActivity').innerHTML=table(d.aktivitasTerakhir||[]);
  }catch(e){console.error(e)}
}

async function loadBarang() {
  try {
    const r = await api('barang', { token });

    if (!r.success) {
      return apiError(r);
    }

    barangCache = r.data || [];

    if (!barangCache.length) {
      $('barangTable').innerHTML =
        '<p>Tidak ada data barang.</p>';
      return;
    }

    const h = Object.keys(barangCache[0]);
    const role = String(user?.role || '').toLowerCase();

    $('barangTable').innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              ${h.map(x => `<th>${esc(x)}</th>`).join('')}
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            ${barangCache.map((r, index) => {

              let aksi = `
                <button
                  type="button"
                  class="secondary"
                  onclick="openEditBarangModal(${index})">
                  ✏️ Edit
                </button>
              `;

              if (role === 'admin') {
                aksi += `
                  <button
                    type="button"
                    class="danger small"
                    onclick="nonaktifkanBarang(${index})">
                    🗑️ Hapus
                  </button>
                `;
              }

              return `
                <tr>
                  ${h.map(x => `
                    <td>${esc(r[x])}</td>
                  `).join('')}

                  <td>
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      ${aksi}
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

  } catch (error) {
    console.error('LOAD BARANG ERROR:', error);

    $('barangTable').innerHTML =
      '<p>❌ Gagal memuat data barang.</p>';
  }
}

async function nonaktifkanBarang(index) {

  if (String(user?.role || '').toLowerCase() !== 'admin') {
    alert('❌ Hanya Admin yang dapat menghapus barang.');
    return;
  }

  const barang = barangCache[index];

  if (!barang) {
    alert('❌ Data barang tidak ditemukan.');
    return;
  }

  const kodeBarang = barang['Kode Barang'];
  const namaBarang = barang['Nama Barang'];

  const yakin = confirm(
    'Yakin ingin menonaktifkan barang?\n\n' +
    'Kode: ' + kodeBarang + '\n' +
    'Nama: ' + namaBarang +
    '\n\n' +
    'Barang tidak akan dihapus dari riwayat transaksi.'
  );

  if (!yakin) return;

  try {

    const r = await api('nonaktifkan_barang', {
      token: token,
      kodeBarang: kodeBarang
    });

    console.log('HASIL HAPUS:', r);

    if (!r.success) {
      alert('❌ ' + (r.message || 'Gagal menonaktifkan barang.'));
      return;
    }

    alert('✅ ' + (r.message || 'Barang berhasil dinonaktifkan.'));

    await loadBarang();
    await loadStok();

  } catch (error) {

    console.error('HAPUS BARANG ERROR:', error);

    alert(
      '❌ ' +
      (error.message || 'Terjadi kesalahan koneksi.')
    );
  }
}

async function loadStok(){
  const r=await api('stok',{token});if(!r.success)return apiError(r);$('stokTable').innerHTML=table(r.data);
}

async function loadUsers() {
  const r = await api('users', { token });

  if (!r.success) {
    return apiError(r);
  }

  const users = r.data || [];

  if (!users.length) {
    $('usersTable').innerHTML =
      '<p>Tidak ada data pengguna.</p>';
    return;
  }

  window.usersCache = users;

  const h = Object.keys(users[0]);

  $('usersTable').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${h.map(x => `<th>${esc(x)}</th>`).join('')}
            <th>Aksi</th>
          </tr>
        </thead>

        <tbody>
          ${users.map((u, index) => `
            <tr>
              ${h.map(x => `
                <td>${esc(u[x])}</td>
              `).join('')}

              <td>
                <button
                  type="button"
                  class="secondary"
                  onclick="openEditUserModal(${index})">
                  ✏️ Edit
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function openEditUserModal(index) {

  if (String(user?.role || '').toLowerCase() !== 'admin') {
    alert('❌ Hanya Admin yang dapat mengedit pengguna.');
    return;
  }

  const users = window.usersCache || [];
  const u = users[index];

  if (!u) {
    alert('❌ Data pengguna tidak ditemukan.');
    return;
  }

  const username = u['Username'] || '';
  const name = u['Name'] || '';
  const role = String(u['Role'] || '').toLowerCase();
  const status = u['Status'] || 'Aktif';

  $('modalContent').innerHTML = `
    <h3>Edit Pengguna</h3>

    <form id="editUserForm">

      <label>
        Username
        <input
          id="editUsername"
          value="${esc(username)}"
          readonly>
      </label>

      <label>
        Nama
        <input
          id="editUserName"
          value="${esc(name)}"
          required>
      </label>

      <label>
        Password
        <input
          id="editUserPassword"
          type="password"
          placeholder="Kosongkan jika tidak diubah">
      </label>

      <label>
        Role
        <select id="editUserRole">
          <option value="admin" ${role === 'admin' ? 'selected' : ''}>
            Admin
          </option>
          <option value="gudang" ${role === 'gudang' ? 'selected' : ''}>
            Gudang
          </option>
          <option value="stok" ${role === 'stok' ? 'selected' : ''}>
            Stok
          </option>
        </select>
      </label>

      <label>
        Status
        <select id="editUserStatus">
          <option value="Aktif" ${String(status).toLowerCase() === 'aktif' ? 'selected' : ''}>
            Aktif
          </option>
          <option value="Nonaktif" ${String(status).toLowerCase() === 'nonaktif' ? 'selected' : ''}>
            Nonaktif
          </option>
        </select>
      </label>

      <div id="editUserMessage" class="message"></div>

      <button
        type="submit"
        id="editUserButton"
        class="primary">
        Simpan Perubahan
      </button>

    </form>
  `;

  $('modal').classList.remove('hidden');

  $('editUserForm').onsubmit = async function(e) {

    e.preventDefault();

    const button = $('editUserButton');
    const message = $('editUserMessage');

    button.disabled = true;
    button.textContent = 'Menyimpan...';
    message.textContent = '';

    try {

      const data = {
        username: $('editUsername').value.trim(),
        Name: $('editUserName').value.trim(),
        Role: $('editUserRole').value,
        Status: $('editUserStatus').value
      };

      const password =
        $('editUserPassword').value;

      if (password) {
        data.Password = password;
      }

      const r = await api('ubah_user', {
        token: token,
        data: data
      });

      console.log('HASIL EDIT USER:', r);

      if (!r.success) {
        message.textContent =
          '❌ ' + (r.message || 'Gagal mengubah user.');
        return;
      }

      message.textContent =
        '✅ ' + (r.message || 'User berhasil diubah.');

      await loadUsers();

      setTimeout(() => {
        $('modal').classList.add('hidden');
      }, 700);

    } catch (error) {

      console.error('EDIT USER ERROR:', error);

      message.textContent =
        '❌ ' +
        (error.message || 'Terjadi kesalahan koneksi.');

    } finally {

      button.disabled = false;
      button.textContent = 'Simpan Perubahan';
    }
  };
}

async function loadLog() {
  if (String(user?.role || '').toLowerCase() !== 'admin') {
    $('logTable').innerHTML =
      '<p>❌ Hanya Admin yang dapat melihat log.</p>';
    return;
  }

  try {
    const r = await api('log', { token });

    if (!r.success) {
      return apiError(r);
    }

    $('logTable').innerHTML = table(r.data || []);

  } catch (error) {
    console.error('LOAD LOG ERROR:', error);

    $('logTable').innerHTML =
      '<p>❌ Gagal memuat log.</p>';
  }
}

function loadBarangForTransaction(){
  if(!barangCache.length)loadBarang().then(renderItems);else renderItems();
}

function renderItems(){
  if(!$('trxItems'))return;
  const active=barangCache.filter(x=>String(x.Status||'').toLowerCase()==='aktif');
  if(!$('trxItems').children.length)addItem();
}

function addItem(){
  const box=$('trxItems');
  const row=document.createElement('div');row.className='item-row';
  const opts=barangCache.filter(x=>String(x.Status||'').toLowerCase()==='aktif').map(x=>`<option value="${esc(x['Kode Barang'])}">${esc(x['Kode Barang'])} - ${esc(x['Nama Barang'])}</option>`).join('');
  row.innerHTML=`<label>Barang<select class="item-code"><option value="">Pilih barang</option>${opts}</select></label><label>Keterangan item<input class="item-desc" placeholder="Opsional"></label><label>Qty<input class="item-qty" type="number" min="1" value="1"></label><button type="button" class="danger remove-item">×</button>`;
  row.querySelector('.remove-item').onclick=()=>row.remove();box.appendChild(row);
}

async function saveTransaction(){
  const rows=[...document.querySelectorAll('#trxItems .item-row')];
  const items=rows.map(r=>({kodeBarang:r.querySelector('.item-code').value,qty:Number(r.querySelector('.item-qty').value)})).filter(x=>x.kodeBarang);
  const msg=$('trxMessage');
  if(!items.length){msg.textContent='❌ Minimal satu barang.';return}
  if(items.some(x=>x.qty<=0)){msg.textContent='❌ Semua jumlah harus lebih dari 0.';return}
  $('saveTrxButton').disabled=true;
  try{
    const type=$('trxType').value;
    const action=type==='MASUK'?'barang_masuk_multi':'barang_keluar_multi';
    const r=await api(action,{token,data:{keterangan:$('trxNote').value.trim(),items}});
    if(!r.success){msg.textContent='❌ '+r.message;return}
    msg.textContent=`✅ ${r.message} Nomor: ${r.transaksi.id}`;
    $('trxNote').value='';$('trxItems').innerHTML='';addItem();loadDashboard();
  }catch(e){console.error(e);msg.textContent='❌ Terjadi kesalahan koneksi.'}
  finally{$('saveTrxButton').disabled=false}
}

async function loadAdjustmentBarang() {
  try {
    const r = await api('barang', { token });

    if (!r.success) {
      return apiError(r);
    }

    const select = $('adjustCode');

    if (!select) return;

    const items = (r.data || []).filter(
      x => String(x.Status || '').toLowerCase() === 'aktif'
    );

    select.innerHTML =
      '<option value="">Pilih barang</option>' +
      items.map(x => `
        <option value="${esc(x['Kode Barang'])}">
          ${esc(x['Kode Barang'])} - ${esc(x['Nama Barang'])}
        </option>
      `).join('');

  } catch (error) {
    console.error('LOAD BARANG PENYESUAIAN:', error);

    const select = $('adjustCode');

    if (select) {
      select.innerHTML =
        '<option value="">Gagal memuat barang</option>';
    }
  }
}

async function saveAdjustment(e){
  e.preventDefault();
  const r=await api('penyesuaian_stok',{token,data:{kodeBarang:$('adjustCode').value.trim(),stokBaru:Number($('adjustQty').value),keterangan:$('adjustNote').value.trim()}});
  $('adjustMessage').textContent=r.success?'✅ '+r.message:'❌ '+r.message;
  if(r.success){e.target.reset();loadDashboard();loadStok()}
}

function openUserModal(){
  $('modalContent').innerHTML=`<h3>Tambah Pengguna</h3><form id="userForm"><label>Username<input id="newUsername" required></label><label>Nama<input id="newName" required></label><label>Password<input id="newPassword" required></label><label>Role<select id="newRole"><option>admin</option><option>gudang</option><option>stok</option></select></label><button class="primary">Simpan</button></form>`;
  $('modal').classList.remove('hidden');
  $('userForm').onsubmit=async e=>{e.preventDefault();const r=await api('tambah_user',{token,data:{username:$('newUsername').value,nama:$('newName').value,password:$('newPassword').value,role:$('newRole').value,status:'Aktif'}});alert(r.message);if(r.success){$('modal').classList.add('hidden');loadUsers()}};
}

function openBarangModal(){
  $('modalContent').innerHTML=`<h3>Tambah Barang</h3><form id="barangForm"><label>Kode Barang<input id="newCode" required></label><label>Nama Barang<input id="newBarangName" required></label><label>Kategori<input id="newKategori"></label><label>Satuan<input id="newSatuan" value="PCS" required></label><label>Stok Minimum<input id="newMinimum" type="number" min="0" value="0"></label><button class="primary">Simpan</button></form>`;
  $('modal').classList.remove('hidden');
  $('barangForm').onsubmit=async e=>{e.preventDefault();const r=await api('tambah_barang',{token,data:{kodeBarang:$('newCode').value,namaBarang:$('newBarangName').value,kategori:$('newKategori').value,satuan:$('newSatuan').value,stokMinimum:Number($('newMinimum').value),status:'Aktif'}});alert(r.message);if(r.success){$('modal').classList.add('hidden');loadBarang()}};
}

function openEditBarangModal(index) {
  const barang = barangCache[index];

  if (!barang) {
    alert('Data barang tidak ditemukan.');
    return;
  }

  $('modalContent').innerHTML = `
    <h3>Edit Barang</h3>

    <form id="editBarangForm">

      <label>
        Kode Barang
        <input
          id="editCode"
          value="${esc(barang['Kode Barang'])}"
          readonly
        >
      </label>

      <label>
        Nama Barang
        <input
          id="editBarangName"
          value="${esc(barang['Nama Barang'])}"
          required
        >
      </label>

      <label>
        Kategori
        <input
          id="editKategori"
          value="${esc(barang['Kategori'])}"
        >
      </label>

      <label>
        Satuan
        <input
          id="editSatuan"
          value="${esc(barang['Satuan'])}"
          required
        >
      </label>

      <label>
        Stok Minimum
        <input
          id="editMinimum"
          type="number"
          min="0"
          value="${Number(barang['Stok Minimum'] || 0)}"
        >
      </label>

      <label>
        Status
        <select id="editStatus">
          <option value="Aktif"
            ${String(barang['Status']).toLowerCase() === 'aktif' ? 'selected' : ''}>
            Aktif
          </option>

          <option value="Nonaktif"
            ${String(barang['Status']).toLowerCase() === 'nonaktif' ? 'selected' : ''}>
            Nonaktif
          </option>
        </select>
      </label>

      <div id="editBarangMessage" class="message"></div>

      <button type="submit" class="primary">
        Simpan Perubahan
      </button>

    </form>
  `;

  $('modal').classList.remove('hidden');

  $('editBarangForm').onsubmit = async function(e) {
    e.preventDefault();

    const message = $('editBarangMessage');
    const button = e.target.querySelector('button[type="submit"]');

    button.disabled = true;
    button.textContent = 'Menyimpan...';
    message.textContent = '';

    try {
      const data = {
        kodeBarang: $('editCode').value.trim(),
        namaBarang: $('editBarangName').value.trim(),
        kategori: $('editKategori').value.trim(),
        satuan: $('editSatuan').value.trim(),
        stokMinimum: Number($('editMinimum').value),
        status: $('editStatus').value
      };

      if (!data.namaBarang) {
        message.textContent = '❌ Nama barang wajib diisi.';
        return;
      }

      if (!data.satuan) {
        message.textContent = '❌ Satuan wajib diisi.';
        return;
      }

      if (data.stokMinimum < 0) {
        message.textContent = '❌ Stok minimum tidak boleh negatif.';
        return;
      }

      const r = await api('edit_barang', {
        token: token,
        data: data
      });

      console.log('EDIT BARANG:', r);

      if (!r.success) {
        message.textContent =
          '❌ ' + (r.message || 'Gagal mengubah barang.');
        return;
      }

      message.textContent =
        '✅ ' + (r.message || 'Barang berhasil diubah.');

      await loadBarang();

      setTimeout(() => {
        $('modal').classList.add('hidden');
      }, 700);

    } catch (error) {
      console.error('EDIT BARANG ERROR:', error);

      message.textContent =
        '❌ ' + error.message;

    } finally {
      button.disabled = false;
      button.textContent = 'Simpan Perubahan';
    }
  };
}

function apiError(r){
  if((r.message||'').toLowerCase().includes('sesi')){logout();return}
  alert(r.message||'Akses ditolak.');
}

$('loginForm').addEventListener('submit',login);
$('logoutButton').addEventListener('click',logout);
document.querySelectorAll('.nav').forEach(n=>n.addEventListener('click',()=>go(n.dataset.page)));
$('addItemButton').addEventListener('click',addItem);
$('saveTrxButton').addEventListener('click',saveTransaction);
$('adjustForm').addEventListener('submit',saveAdjustment);
$('addUserButton').addEventListener('click',openUserModal);
$('addBarangButton').addEventListener('click',openBarangModal);
$('closeModal').addEventListener('click',()=>$('modal').classList.add('hidden'));
$('modal').addEventListener('click',e=>{if(e.target.id==='modal')$('modal').classList.add('hidden')});

if(token&&user)showApp();
