const API_URL='https://script.google.com/macros/s/AKfycbx1DTb7OiIarQLyaRAUy0cNbYvnMUt0m3WPaXBjCks-FwAW5ZaJhoWp8fpQ_PDZANptBQ/exec'; 

let token=localStorage.getItem('stok_token')||'';
let user=JSON.parse(localStorage.getItem('stok_user')||'null');
let barangCache=[];

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

function showApp(){
  $('loginPage').classList.add('hidden');
  $('appPage').classList.remove('hidden');
  $('userName').textContent=user?.nama||user?.username||'-';
  $('userRole').textContent=user?.role||'-';
  const role=(user?.role||'').toLowerCase();
  document.querySelectorAll('.admin-only').forEach(e=>e.classList.toggle('hidden',role!=='admin'));
  document.querySelectorAll('.stok-only').forEach(e=>e.classList.toggle('hidden',!['admin','stok'].includes(role)));
  document.querySelectorAll('.transaction-nav').forEach(e=>e.classList.toggle('hidden',!['admin','gudang'].includes(role)));
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

  message.textContent = '';
  button.disabled = true;
  button.textContent = 'Memproses...';

  try {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
      message.textContent = '❌ Username dan password wajib diisi.';
      return;
    }

    console.log('Mengirim login...');

    const result = await api('login', {
      username: username,
      password: password
    });

    console.log('Hasil login:', result);

    if (!result || !result.success) {
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
    console.error(error);

    message.textContent =
      '❌ ' + (error.message || 'Terjadi kesalahan koneksi.');

  } finally {
    button.disabled = false;
    button.textContent = 'Masuk';
  }
}
document.getElementById('loginForm').addEventListener('submit', login);

function go(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  const target=$('page-'+page);if(target)target.classList.remove('hidden');
  document.querySelectorAll('.nav').forEach(n=>n.classList.toggle('active',n.dataset.page===page));
  if(page==='dashboard')loadDashboard();
  if(page==='barang')loadBarang();
  if(page==='stok')loadStok();
  if(page==='transaksi')loadBarangForTransaction();
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

async function loadBarang(){
  const r=await api('barang',{token});if(!r.success)return apiError(r);barangCache=r.data||[];$('barangTable').innerHTML=table(r.data);
}

async function loadStok(){
  const r=await api('stok',{token});if(!r.success)return apiError(r);$('stokTable').innerHTML=table(r.data);
}

async function loadUsers(){
  const r=await api('users',{token});if(!r.success)return apiError(r);$('usersTable').innerHTML=table(r.data);
}

async function loadLog(){
  const r=await api('log',{token});if(!r.success)return apiError(r);$('logTable').innerHTML=table(r.data);
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
