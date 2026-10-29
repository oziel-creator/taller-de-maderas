/* Taller de Maderas — utilidades compartidas del navegador */
(function () {
  'use strict';

  const MENU = [
    { id: 'inicio', texto: 'Inicio', icono: 'bi-house-door', url: 'inicio.html' },
    { id: 'tablero', texto: 'Tablero', icono: 'bi-kanban', url: 'tablero.html' },
    { id: 'levantamientos', texto: 'Levantamientos', icono: 'bi-rulers', url: 'levantamientos.html' },
    { id: 'cotizaciones', texto: 'Cotizaciones', icono: 'bi-receipt', url: 'cotizaciones.html' },
    { id: 'proveedores', texto: 'Proveedores', icono: 'bi-truck', url: 'proveedores.html' },
    { id: 'usuarios', texto: 'Usuarios', icono: 'bi-people', url: 'usuarios.html' }
  ];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function api(url, opciones = {}) {
    const o = { method: opciones.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opciones.body instanceof FormData) {
      o.body = opciones.body;
    } else if (opciones.body !== undefined) {
      o.headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(opciones.body);
    }
    let r;
    try {
      r = await fetch(url, o);
    } catch (e) {
      throw new Error('No hay conexión con el programa. ¿Sigue abierta la ventana negra del servidor?');
    }
    let datos = null;
    try { datos = await r.json(); } catch { /* sin cuerpo */ }
    if (r.status === 401 && !opciones.sinRedireccion) {
      location.href = 'acceso.html';
      throw new Error((datos && datos.error) || 'Sesión terminada');
    }
    if (!r.ok) throw new Error((datos && datos.error) || `Error ${r.status}`);
    return datos;
  }

  function hoy() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha(f) {
    if (!f) return '';
    const [a, m, d] = String(f).slice(0, 10).split('-');
    if (!d) return esc(f);
    return `${Number(d)} ${MESES[Number(m) - 1]} ${a}`;
  }
  function fechaHora(f) {
    if (!f) return '';
    const s = String(f);
    return fecha(s.slice(0, 10)) + (s.length > 10 ? ' ' + s.slice(11, 16) : '');
  }
  function diasHasta(f) {
    if (!f) return null;
    const a = new Date(f + 'T00:00:00');
    const b = new Date(hoy() + 'T00:00:00');
    return Math.round((a - b) / 86400000);
  }

  const formatoDinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  function dinero(n) { return formatoDinero.format(Number(n) || 0); }

  function urlArchivo(nombre) { return nombre ? '/archivos/' + encodeURIComponent(nombre) : null; }
  function esImagen(nombre) { return /\.(jpg|png|webp|gif)$/i.test(nombre || ''); }

  function contenedorAvisos() {
    let c = document.getElementById('avisos');
    if (!c) {
      c = document.createElement('div');
      c.id = 'avisos';
      c.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(c);
    }
    return c;
  }
  function aviso(mensaje, tipo = 'exito') {
    const colores = { exito: 'text-bg-success', error: 'text-bg-danger', info: 'text-bg-dark' };
    const el = document.createElement('div');
    el.className = `toast align-items-center border-0 ${colores[tipo] || colores.info}`;
    el.setAttribute('role', 'alert');
    el.innerHTML = `<div class="d-flex"><div class="toast-body">${esc(mensaje)}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Cerrar"></button></div>`;
    contenedorAvisos().appendChild(el);
    const t = new bootstrap.Toast(el, { delay: tipo === 'error' ? 6000 : 3000 });
    el.addEventListener('hidden.bs.toast', () => el.remove());
    t.show();
  }
  function error(e) { aviso(e && e.message ? e.message : String(e), 'error'); }

  let modalConfirmar = null;
  function confirmar(mensaje, { titulo = '¿Estás seguro?', boton = 'Sí, eliminar', peligro = true } = {}) {
    if (!modalConfirmar) {
      const div = document.createElement('div');
      div.className = 'modal fade';
      div.tabIndex = -1;
      div.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
        <div class="modal-header"><h5 class="modal-title"></h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button></div>
        <div class="modal-body"></div>
        <div class="modal-footer"><button type="button" class="btn btn-madera" data-bs-dismiss="modal">Cancelar</button>
        <button type="button" class="btn aceptar"></button></div></div></div>`;
      document.body.appendChild(div);
      modalConfirmar = { el: div, m: new bootstrap.Modal(div) };
    }
    const { el, m } = modalConfirmar;
    el.querySelector('.modal-title').textContent = titulo;
    el.querySelector('.modal-body').textContent = mensaje;
    const b = el.querySelector('.aceptar');
    b.textContent = boton;
    b.className = 'btn aceptar ' + (peligro ? 'btn-danger' : 'btn-primary');
    return new Promise((resolver) => {
      let ok = false;
      b.onclick = () => { ok = true; m.hide(); };
      el.addEventListener('hidden.bs.modal', () => resolver(ok), { once: true });
      m.show();
    });
  }

  // Deshabilita un botón mientras se ejecuta una acción
  async function conBoton(boton, fn) {
    const original = boton ? boton.innerHTML : '';
    if (boton) { boton.disabled = true; boton.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando…'; }
    try { return await fn(); } finally { if (boton) { boton.disabled = false; boton.innerHTML = original; } }
  }

  function formJson(form) {
    const o = {};
    new FormData(form).forEach((v, k) => { if (!(v instanceof File)) o[k] = v; });
    return o;
  }

  function opcionesSelect(lista, valorActual, { vacio = '— Ninguno —', texto, valor = (x) => x.id } = {}) {
    return (vacio !== null ? `<option value="">${esc(vacio)}</option>` : '') +
      lista.map((x) => `<option value="${esc(valor(x))}" ${String(valor(x)) === String(valorActual ?? '') ? 'selected' : ''}>${esc(texto(x))}</option>`).join('');
  }

  let estado = null;
  async function iniciar(paginaId, titulo) {
    estado = await api('/api/estado');
    if (!estado.usuario) { location.href = 'acceso.html'; return new Promise(() => {}); }
    const u = estado.usuario;
    const pagina = document.getElementById('pagina');
    const app = document.createElement('div');
    app.className = 'tdm-app';
    app.innerHTML = `
      <aside class="offcanvas-lg offcanvas-start tdm-sidebar" tabindex="-1" id="menuLateral" aria-label="Menú">
        <div class="offcanvas-header d-lg-none pb-0">
          <span></span><button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#menuLateral" aria-label="Cerrar"></button>
        </div>
        <div class="offcanvas-body">
          <a class="tdm-marca" href="inicio.html"><img src="img/logo.svg" alt=""><span>Taller de Maderas<small>Panel del taller</small></span></a>
          <ul class="tdm-nav">
            ${MENU.map((m) => `<li><a href="${m.url}" class="${m.id === paginaId ? 'activo' : ''}"><i class="bi ${m.icono}"></i>${m.texto}</a></li>`).join('')}
          </ul>
          <div class="tdm-pie-menu">
            <div class="d-flex align-items-center gap-2 mb-2"><i class="bi bi-person-circle fs-5"></i>
              <div class="text-truncate"><div class="fw-semibold text-truncate">${esc(u.nombre)}</div><div class="small opacity-75">@${esc(u.usuario)}</div></div></div>
            <button class="btn btn-sm btn-outline-light w-100" id="btnSalir"><i class="bi bi-box-arrow-right me-1"></i>Cerrar sesión</button>
          </div>
        </div>
      </aside>
      <div class="tdm-main">
        <header class="tdm-topbar">
          <button class="btn btn-madera d-lg-none" type="button" data-bs-toggle="offcanvas" data-bs-target="#menuLateral" aria-label="Abrir menú"><i class="bi bi-list"></i></button>
          <h1>${esc(titulo)}</h1>
          <div class="ms-auto" id="accionesTopbar"></div>
        </header>
        <main class="tdm-contenido" id="contenido"></main>
      </div>`;
    document.body.prepend(app);
    if (pagina) { document.getElementById('contenido').appendChild(pagina); pagina.hidden = false; }
    document.title = `${titulo} · Taller de Maderas`;
    document.getElementById('btnSalir').addEventListener('click', async () => {
      try { await api('/api/logout', { method: 'POST' }); } finally { location.href = 'acceso.html'; }
    });
    return estado;
  }

  window.TDM = { api, esc, hoy, fecha, fechaHora, diasHasta, dinero, urlArchivo, esImagen, aviso, error, confirmar, conBoton, formJson, opcionesSelect, iniciar, get estado() { return estado; } };
})();
