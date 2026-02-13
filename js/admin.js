/* =========================================================
   Pollería El Pollón - admin.js (ACTUALIZADO PRO)
   - Exportar PDF (imprimir listado filtrado)
   - Imprimir ticket profesional 80mm
========================================================= */

const ADMIN_PASSWORD = "1234"; // 🔐 cámbiala

const adminOpenBtn = document.getElementById('admin-open-btn');
const adminPanelModal = document.getElementById('admin-panel-modal');

const adminPassword = document.getElementById('admin-password');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLoginError = document.getElementById('admin-login-error');

const stTotal = document.getElementById('st-total');
const stToday = document.getElementById('st-today');
const stSales = document.getElementById('st-sales');
const stPending = document.getElementById('st-pending');
const stRate = document.getElementById('st-rate');
const stAvg = document.getElementById('st-avg');
const stEta = document.getElementById('st-eta');

const fltFrom = document.getElementById('flt-from');
const fltTo = document.getElementById('flt-to');
const fltStatus = document.getElementById('flt-status');
const fltQ = document.getElementById('flt-q');

const tb = document.getElementById('admin-orders-tbody');

const copyBtn = document.getElementById('admin-copy-btn');
const pdfBtn = document.getElementById('admin-pdf-btn');
const refreshBtn = document.getElementById('admin-refresh-btn');
const clearBtn = document.getElementById('admin-clear-btn');

const adminClosePanelBtn = document.getElementById('admin-close-panel');
adminClosePanelBtn?.addEventListener('click', ()=>{
  closeAdminDrawer();
  closeModal('#admin-panel-modal');
});

// Panel lateral (drawer) móvil/tablet: abrir/cerrar
const adminDrawer = document.getElementById('adminp-drawer');
const adminToggleDrawerBtn = document.getElementById('admin-toggle-drawer');
const adminDrawerCloseBtn = document.getElementById('admin-drawer-close');
const adminClosePanelDrawerBtn = document.getElementById('admin-close-panel-drawer');

function openAdminDrawer(){
  adminDrawer?.classList.add('open');
  adminDrawer?.setAttribute('aria-hidden', 'false');
}
function closeAdminDrawer(){
  adminDrawer?.classList.remove('open');
  adminDrawer?.setAttribute('aria-hidden', 'true');
}

adminToggleDrawerBtn?.addEventListener('click', openAdminDrawer);
adminDrawerCloseBtn?.addEventListener('click', closeAdminDrawer);

// Hamburguesa izquierda: mostrar/ocultar filtros y chips en móvil
document.getElementById('admin-toggle-filters')?.addEventListener('click', ()=>{
  document.querySelector('.adminp-card')?.classList.toggle('adminp-filters-visible');
});
adminClosePanelDrawerBtn?.addEventListener('click', ()=>{
  closeAdminDrawer();
  closeModal('#admin-panel-modal');
});

// Botones del drawer: ejecutan la misma acción que los principales
document.getElementById('admin-copy-btn-drawer')?.addEventListener('click', ()=>{ copyBtn?.click(); closeAdminDrawer(); });
document.getElementById('admin-refresh-btn-drawer')?.addEventListener('click', ()=>{ refreshBtn?.click(); closeAdminDrawer(); });
document.getElementById('admin-clear-btn-drawer')?.addEventListener('click', ()=>{ clearBtn?.click(); closeAdminDrawer(); });
document.getElementById('admin-pdf-btn-drawer')?.addEventListener('click', ()=>{ pdfBtn?.click(); closeAdminDrawer(); });
document.getElementById('enable-sound-btn-drawer')?.addEventListener('click', ()=>{ document.getElementById('enable-sound-btn')?.click(); closeAdminDrawer(); });


function openModal(sel){ document.querySelector(sel)?.classList.add('active'); }
function closeModal(sel){ document.querySelector(sel)?.classList.remove('active'); }

function isAdminOpen(){
  return adminPanelModal?.classList.contains('active');
}
window.isAdminOpen = isAdminOpen;

adminOpenBtn?.addEventListener('click', ()=>{
  if (adminPassword) adminPassword.value = '';
  adminLoginError?.classList.add('hidden');
  openModal('#admin-login-modal');
});

adminLoginBtn?.addEventListener('click', ()=>{
  const pass = (adminPassword?.value || '').trim();
  if(pass !== ADMIN_PASSWORD){
    if (adminLoginError) {
      adminLoginError.textContent = 'Contraseña incorrecta.';
      adminLoginError.classList.remove('hidden');
    }
    return;
  }
  closeModal('#admin-login-modal');
  closeAdminDrawer();
  openModal('#admin-panel-modal');
  document.querySelector('#admin-panel-modal .adminp-card')?.classList.add('adminp-filters-visible');
  renderAdmin();
});

refreshBtn?.addEventListener('click', renderAdmin);

clearBtn?.addEventListener('click', ()=>{
  if (fltFrom) fltFrom.value = '';
  if (fltTo) fltTo.value = '';
  if (fltStatus) fltStatus.value = '';
  if (fltQ) fltQ.value = '';
  renderAdmin();
});

document.querySelectorAll('.adminp-chip').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const st = btn.dataset.chipstatus || '';
    
    // activar visual
    document.querySelectorAll('.adminp-chip').forEach(b=> b.classList.remove('is-on'));
    btn.classList.add('is-on');

    // aplicar filtro real
    if (fltStatus) fltStatus.value = st;
    renderAdmin();
  });
});


copyBtn?.addEventListener('click', async ()=>{
  const rows = getFilteredOrders().map(o=>{
    return [
      o.createdAt,
      o.ticketNumber,
      o.customer?.name || '',
      o.customer?.phone || '',
      o.customer?.address || '',
      o.customer?.comment || '',
      o.total || 0,
      o.status || ''
    ];
  });

  const header = ['createdAt','ticket','name','phone','address','comment','total','status'];
  const csv = [header, ...rows].map(r=> r.map(v => `"${String(v).replaceAll('"','""')}"`).join('\t')).join('\n');

  try{
    await navigator.clipboard.writeText(csv);
    alert('Copiado ✅ (pega en Excel/Sheets)');
  }catch{
    alert('No se pudo copiar. Tu navegador bloqueó el portapapeles.');
  }
});

pdfBtn?.addEventListener('click', ()=>{
  const filtered = getFilteredOrders();
  const w = window.open('', '_blank');
  const moneyFn = window.__POLLON__?.money || (v => String(v));
  const rowsHtml = filtered.map(o=>{
    const fecha = new Date(o.createdAt).toLocaleString('es-CL');
    const name = (o.customer?.name || '').replaceAll('\n','<br/>');
    const phone = (o.customer?.phone || '');
    const total = moneyFn(o.total || 0);
    const st = (o.status || 'Pendiente');
    return `
      <tr>
        <td>${fecha}</td>
        <td><b>${o.ticketNumber || ''}</b></td>
        <td>${name}</td>
        <td>${phone}</td>
        <td><b>${total}</b></td>
        <td><b>${st}</b></td>
      </tr>
    `;
  }).join('');

  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Pedidos (PDF)</title>
        <style>
          body{ font-family: Arial, sans-serif; padding:20px; }
          h1{ margin:0 0 10px; }
          table{ width:100%; border-collapse: collapse; }
          th, td{ border:1px solid #ddd; padding:8px; text-align:left; vertical-align:top; }
          th{ background:#111; color:#fff; }
        </style>
      </head>
      <body>
        <h1>Pedidos filtrados</h1>
        <p>Generado: ${new Date().toLocaleString('es-CL')}</p>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Ticket</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>${rowsHtml || `<tr><td colspan="6"><b>No hay pedidos con esos filtros.</b></td></tr>`}</tbody>
        </table>
        <script>window.print();</script>
      </body>
    </html>
  `);
  w.document.close();
});

function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(isoString){
  try{
    const d = new Date(isoString);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }catch{
    return '';
  }
}

function getFilteredOrders(){
  const orders = window.__POLLON__?.orders?.() || [];
  const from = fltFrom?.value ?? '';
  const to = fltTo?.value ?? '';
  const st = fltStatus?.value ?? '';
  const q = (fltQ?.value || '').trim().toLowerCase();

  return orders.filter(o=>{
    const day = parseDateOnly(o.createdAt);
    if(from && day < from) return false;
    if(to && day > to) return false;
    if(st && (o.status || '') !== st) return false;

    if(q){
      const name = (o.customer?.name || '').toLowerCase();
      const phone = (o.customer?.phone || '').toLowerCase();
      if(!name.includes(q) && !phone.includes(q)) return false;
    }
    return true;
  }).sort((a,b)=> (b.createdAt || '').localeCompare(a.createdAt || ''));
}

function cycleStatus(cur){
  const order = ['Pendiente','En preparación','En camino','Entregado','Cancelado'];
  const i = order.indexOf(cur);
  return order[(i + 1 + order.length) % order.length];
}

function renderStats(){
  const pollon = window.__POLLON__;
  const all = pollon?.orders?.() || [];
  const today = todayISO();

  const todayOrders = all.filter(o => parseDateOnly(o.createdAt) === today);
  const todaySales = todayOrders.reduce((acc,o)=> acc + (o.total||0), 0);

  const pending = all.filter(o => (o.status || '') !== 'Entregado' && (o.status || '') !== 'Cancelado').length;
  const delivered = all.filter(o => (o.status || '') === 'Entregado').length;

  if (stTotal) stTotal.textContent = String(all.length);
  if (stToday) stToday.textContent = String(todayOrders.length);
  if (stSales) stSales.textContent = pollon ? pollon.money(todaySales) : '$0';
  if (stPending) stPending.textContent = String(pending);

  const rate = all.length ? Math.round((delivered / all.length) * 100) : 0;
  if (stRate) stRate.textContent = `${rate}%`;

  const avg = all.length ? Math.round(all.reduce((acc,o)=> acc+(o.total||0),0) / all.length) : 0;
  if (stAvg) stAvg.textContent = pollon ? pollon.money(avg) : '$0';

  if (stEta) stEta.textContent = '35–50 min';
}

function printTicket80mm(order){
  const ticketHtml = window.__POLLON__?.buildTicketHtml80mm?.(order) ?? '';
  if (!ticketHtml) return;

  const width = 380;
  const height = 560;
  const left = 0;
  const top = 0;
  const features = `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes,toolbar=no,menubar=no`;
  const w = window.open('', 'pollonTicketPrint', features);
  if (!w) return;
  w.document.write(`
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Ticket ${order.ticketNumber}</title>
        <style>
          @page { size: 80mm auto; margin: 6mm; }
          body{ margin:0; padding:0; }
          .paper{
            width: 80mm;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
            font-size: 14px;
            line-height: 1.3;
            white-space: pre-wrap;
          }
          b{ font-weight: 900; }
        </style>
      </head>
      <body>
        <pre class="paper">${ticketHtml}</pre>
        <script>
          window.onafterprint = function(){ window.close(); };
          window.print();
        </script>
      </body>
    </html>
  `);
  w.document.close();
}


function statusBadgeClass(st){
  const s = (st || 'Pendiente').toLowerCase();
  if(s.includes('pend')) return 'pendiente';
  if(s.includes('prep')) return 'prep';
  if(s.includes('camino')) return 'camino';
  if(s.includes('entreg')) return 'entregado';
  if(s.includes('cancel')) return 'cancelado';
  return 'pendiente';
}

function renderAdminTable(){
  const filtered = getFilteredOrders();
  tb.innerHTML = '';

  // contador “Pedidos en el rango…”
  const rangeCount = document.getElementById('admin-range-count');
  if(rangeCount) rangeCount.textContent = `Pedidos en el rango seleccionado: ${filtered.length}`;

  if(filtered.length === 0){
    tb.innerHTML = `
      <tr class="adminp-row">
        <td class="adminp-cell"><b>No hay pedidos con esos filtros.</b></td>
      </tr>
    `;
    return;
  }

  const pollon = window.__POLLON__;
  filtered.forEach(o=>{
    const tr = document.createElement('tr');
    tr.className = 'adminp-row';

    const name = (o.customer?.name || '').replaceAll('\n',' ');
    const phone = o.customer?.phone || '';
    const total = pollon ? pollon.money(o.total || 0) : String(o.total || 0);
    const st = o.status || 'Pendiente';
    const badgeCls = statusBadgeClass(st);
    const fecha = new Date(o.createdAt).toLocaleString('es-CL');

    // Estructura visual tipo foto (ticket / nombre / fono / $ / badge / fecha / botones)
    tr.innerHTML = `
      <td class="adminp-cell adminp-muted">${o.id || ''}</td>
      <td class="adminp-cell"><b>${name}</b></td>
      <td class="adminp-cell adminp-muted">${phone}</td>
      <td class="adminp-cell adminp-money">${total}</td>
      <td class="adminp-cell">
        <span class="adminp-badge ${badgeCls}">${st}</span>
      </td>
      <td class="adminp-cell adminp-muted">${fecha}</td>
      <td class="adminp-cell">
        <div class="adminp-actions-mini"></div>
      </td>
    `;

    const actionsWrap = tr.querySelector('.adminp-actions-mini');

    const btnView = document.createElement('button');
    btnView.className = 'adminp-mini';
    btnView.type = 'button';
    btnView.textContent = 'Ver';
    btnView.addEventListener('click', ()=>{
      const text = window.__POLLON__?.buildWhatsappTextFromOrder?.(o) ?? JSON.stringify(o);
      alert(text);
    });

    const btnStatus = document.createElement('button');
    btnStatus.className = 'adminp-mini primary';
    btnStatus.type = 'button';
    btnStatus.textContent = 'Estado';
    btnStatus.addEventListener('click', ()=>{
      const all = window.__POLLON__?.orders?.() ?? [];
      const idx = all.findIndex(x => x.id === o.id);
      if(idx >= 0 && window.__POLLON__){
        all[idx].status = cycleStatus(all[idx].status || 'Pendiente');
        window.__POLLON__.saveOrders();
        renderAdmin();
      }
    });

    const btnWa = document.createElement('button');
    btnWa.className = 'adminp-mini wa';
    btnWa.type = 'button';
    btnWa.textContent = 'WhatsApp';
    btnWa.addEventListener('click', ()=>{
      const num = window.__POLLON__?.WHATSAPP_NUMBER || '';
      const msg = encodeURIComponent(`Hola ${name || ''}, sobre tu pedido Ticket ${o.ticketNumber}.`);
      if (num) window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    });

    const btnPrint = document.createElement('button');
    btnPrint.className = 'adminp-mini';
    btnPrint.type = 'button';
    btnPrint.textContent = 'Imprimir';
    btnPrint.addEventListener('click', ()=>{
      if (window.__POLLON__?.buildTicketHtml80mm) printTicket80mm(o);
    });

    actionsWrap.appendChild(btnView);
    actionsWrap.appendChild(btnStatus);
    actionsWrap.appendChild(btnWa);
    actionsWrap.appendChild(btnPrint);

    tb.appendChild(tr);
  });
}






function renderAdmin(){
  renderStats();
  renderAdminTable();
}
window.renderAdmin = renderAdmin;






// =========================================================
// 🔔 TIMBRE NUEVO PEDIDO (solo si admin está abierto)
// =========================================================
let soundEnabled = false;

function setupNewOrderSoundUI(){
  const btn = document.getElementById("enable-sound-btn");
  const audio = document.getElementById("new-order-sound");
  if(!btn || !audio) return;

  btn.addEventListener("click", async ()=>{
    try{
      // Desbloquear audio (Chrome/Android exige click)
      audio.currentTime = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;

      soundEnabled = true;
      btn.textContent = "🔔 Sonido activado";
    }catch(e){
      alert("El navegador bloqueó el sonido. Haz clic otra vez y revisa volumen.");
    }
  });
}

function playNewOrderSound(){
  if(!soundEnabled) return;
  // ✅ solo si el panel admin está abierto
  if(typeof window.isAdminOpen === "function" && !window.isAdminOpen()) return;

  const audio = document.getElementById("new-order-sound");
  if(!audio) return;

  audio.currentTime = 0;
  audio.play().catch(()=>{});
}

// ✅ Esta función la llamará app.js cuando llegue un pedido nuevo
window.onNewOrderArrived = function(){
  playNewOrderSound();
};

// Activar el botón de sonido (si el audio ya está en el DOM; si no, al terminar de cargar)
if (document.getElementById('new-order-sound')) {
  setupNewOrderSoundUI();
} else {
  document.addEventListener('DOMContentLoaded', setupNewOrderSoundUI);
}
