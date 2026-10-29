(async function () {
  'use strict';
  const { api, esc, fecha, fechaHora, urlArchivo, esImagen, opcionesSelect } = TDM;
  const estado = await TDM.iniciar('tablero', 'Instalación');
  const ESTATUS = estado.estatusInstalacion;
  const MAX_BYTES = estado.maxMb * 1024 * 1024;

  let instId = Number(new URLSearchParams(location.search).get('id')) || null;
  let inst = null;
  let levantamientos = [];
  let cotizaciones = [];
  let proveedores = [];

  const form = document.getElementById('formDatos');
  const selLev = document.getElementById('levantamiento_id');
  const selCot = document.getElementById('cotizacion_id');

  function revisarTamano(input) {
    for (const f of input.files || []) {
      if (f.size > MAX_BYTES) throw new Error(`"${f.name}" pesa más de ${estado.maxMb} MB.`);
    }
  }

  function enlace(nombre, texto, icono = 'bi-file-earmark') {
    if (!nombre) return '<span class="text-suave small">Sin archivo</span>';
    return `<a href="${urlArchivo(nombre)}" target="_blank" rel="noopener"><i class="bi ${esImagen(nombre) ? 'bi-file-earmark-image' : icono} me-1"></i>${esc(texto)}</a>`;
  }

  // ---------- Catálogos ----------
  async function cargarCatalogos() {
    [levantamientos, cotizaciones, proveedores] = await Promise.all([
      api('/api/levantamientos'), api('/api/cotizaciones'), api('/api/proveedores')
    ]);
  }

  function pintarSelects() {
    selLev.innerHTML = opcionesSelect(levantamientos, inst ? inst.levantamiento_id : null, { vacio: '— Sin levantamiento —', texto: (l) => `${l.folio} · ${l.cliente}` });
    selCot.innerHTML = opcionesSelect(cotizaciones, inst ? inst.cotizacion_id : null, { vacio: '— Sin cotización —', texto: (c) => `${c.folio} · ${c.cliente} (${c.estatus})` });
    document.getElementById('estatus').innerHTML = opcionesSelect(ESTATUS, inst ? inst.estatus : ESTATUS[0].nombre, { vacio: null, texto: (e) => e.nombre, valor: (e) => e.nombre });
  }

  selLev.addEventListener('change', () => {
    const l = levantamientos.find((x) => String(x.id) === selLev.value);
    if (!l) return;
    if (!form.cliente.value) form.cliente.value = l.cliente;
    if (!form.direccion.value && l.direccion) form.direccion.value = l.direccion;
  });
  selCot.addEventListener('change', () => {
    const c = cotizaciones.find((x) => String(x.id) === selCot.value);
    if (!c) return;
    if (!form.cliente.value) form.cliente.value = c.cliente;
    if (!selLev.value && c.levantamiento_id) { selLev.value = c.levantamiento_id; selLev.dispatchEvent(new Event('change')); }
  });

  // ---------- Pintar ----------
  function pintar() {
    const nueva = !inst;
    document.getElementById('seccionesExtra').hidden = nueva;
    document.getElementById('avisoNueva').hidden = !nueva;
    document.getElementById('btnEliminar').hidden = nueva;
    document.getElementById('cajaHistorial').hidden = nueva;
    document.getElementById('cajaVinculos').hidden = nueva;
    pintarSelects();
    if (nueva) {
      document.getElementById('encabezado').textContent = 'Nueva instalación';
      return;
    }
    document.title = `${inst.folio} · ${inst.cliente} · Taller de Maderas`;
    document.getElementById('encabezado').textContent = `${inst.folio} · ${inst.cliente}`;
    const e = ESTATUS.find((x) => x.nombre === inst.estatus);
    const badge = document.getElementById('badgeEstatus');
    badge.textContent = inst.estatus;
    badge.style.background = e ? e.color : '';
    form.cliente.value = inst.cliente || '';
    form.direccion.value = inst.direccion || '';
    form.fecha_entrega.value = inst.fecha_entrega || '';
    form.descripcion.value = inst.descripcion || '';

    // Vínculos
    document.getElementById('vinculos').innerHTML = `
      <div class="mb-2"><div class="small text-suave">Levantamiento</div>
        ${inst.levantamiento_id ? `<div>${esc(inst.levantamiento_folio)}</div>${enlace(inst.pdf_levantamiento, 'PDF del levantamiento', 'bi-file-earmark-pdf')}` : '<span class="text-suave small">Sin levantamiento</span>'}</div>
      <div class="mb-2"><div class="small text-suave">Cotización</div>
        ${inst.cotizacion ? `<div>${esc(inst.cotizacion.folio)} · ${TDM.dinero(inst.cotizacion.total)}</div>` : ''}
        ${enlace(inst.pdf_cotizacion, 'PDF de la cotización', 'bi-file-earmark-pdf')}</div>
      <div class="small text-suave mt-3">Creada: ${fechaHora(inst.creado)}<br>Actualizada: ${fechaHora(inst.actualizado)}</div>`;

    // Documentos
    const docs = [
      { campo: 'croquis', titulo: 'Croquis', icono: 'bi-pencil-square' },
      { campo: 'planos', titulo: 'Planos para producción', icono: 'bi-rulers' },
      { campo: 'carta', titulo: 'Carta compromiso', icono: 'bi-file-earmark-text' }
    ];
    document.getElementById('documentos').innerHTML = docs.map((d) => `
      <div class="col-md-4"><div class="doc-slot">
        <div class="titulo mb-1"><i class="bi ${d.icono} me-1"></i>${d.titulo}</div>
        <div class="mb-2">${inst[d.campo] && esImagen(inst[d.campo])
          ? `<a href="${urlArchivo(inst[d.campo])}" target="_blank" rel="noopener"><img class="miniatura" style="width:100%;height:90px" src="${urlArchivo(inst[d.campo])}" alt="${d.titulo}"></a>`
          : enlace(inst[d.campo], 'Ver archivo', 'bi-file-earmark-pdf')}</div>
        <input class="form-control form-control-sm mb-2" type="file" data-doc="${d.campo}" accept="application/pdf,image/jpeg,image/png,image/webp,image/gif" aria-label="${d.titulo}">
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-primary" data-subir-doc="${d.campo}" type="button"><i class="bi bi-upload me-1"></i>${inst[d.campo] ? 'Reemplazar' : 'Subir'}</button>
          ${inst[d.campo] ? `<button class="btn btn-sm btn-outline-danger" data-quitar-doc="${d.campo}" type="button" title="Quitar"><i class="bi bi-x-lg"></i></button>` : ''}
        </div>
      </div></div>`).join('');

    // Validaciones
    const lv = document.getElementById('listaValidaciones');
    lv.innerHTML = inst.validaciones.length ? `<div class="table-responsive"><table class="table table-sm align-middle mb-0">
      <thead><tr><th>Versión</th><th>Fecha</th><th>Descripción</th><th>Archivo</th><th>Render</th><th></th></tr></thead><tbody>
      ${inst.validaciones.map((v) => `<tr>
        <td><span class="badge text-bg-secondary">v${v.version}</span></td>
        <td class="text-nowrap">${fecha(v.fecha)}</td>
        <td>${esc(v.descripcion || '')}</td>
        <td>${enlace(v.archivo, 'Abrir', 'bi-file-earmark-pdf')}</td>
        <td>${v.render ? `<a href="${urlArchivo(v.render)}" target="_blank" rel="noopener"><img class="miniatura" src="${urlArchivo(v.render)}" alt="Render v${v.version}"></a>` : '<span class="text-suave small">—</span>'}</td>
        <td class="text-end"><button class="btn btn-sm btn-outline-danger" data-borrar-val="${v.id}" title="Eliminar versión"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="text-suave small">Aún no hay versiones de validación.</div>';
    document.getElementById('vFecha').value = TDM.hoy();

    // Pedidos
    const lp = document.getElementById('listaPedidos');
    lp.innerHTML = inst.pedidos.length ? `<table class="table table-hover table-sm mb-0">
      <thead><tr><th class="ps-3">Pedido</th><th>Factura</th><th>Proveedor</th><th>Material</th><th>Fecha de pago</th><th>Enchapes</th><th>Activo</th><th></th></tr></thead><tbody>
      ${inst.pedidos.map((p) => `<tr class="${p.activo ? '' : 'text-suave'}">
        <td class="ps-3">${esc(p.numero_pedido || '—')}</td><td>${esc(p.numero_factura || '—')}</td>
        <td>${esc(p.proveedor_nombre || '—')}</td><td style="min-width:160px">${esc(p.material || '')}</td>
        <td class="text-nowrap">${fecha(p.fecha_pago) || '—'}</td>
        <td class="small">${p.enchape_primario ? esc(p.enchape_primario) : '—'}${p.enchape_secundario ? '<br>' + esc(p.enchape_secundario) : ''}</td>
        <td>${p.activo ? '<span class="badge text-bg-success">Sí</span>' : '<span class="badge text-bg-secondary">No</span>'}</td>
        <td class="text-end text-nowrap pe-3"><button class="btn btn-sm btn-madera" data-editar-ped="${p.id}" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger" data-borrar-ped="${p.id}" title="Eliminar"><i class="bi bi-trash"></i></button></td>
      </tr>`).join('')}</tbody></table>` : '<div class="vacio"><i class="bi bi-box-seam"></i>Sin pedidos de material.</div>';

    // Fotos
    document.getElementById('galeria').innerHTML = inst.fotos.length ? inst.fotos.map((f) => `
      <div class="foto"><img src="${urlArchivo(f.archivo)}" data-ver-foto="${esc(f.archivo)}" alt="Foto del resultado" loading="lazy">
      <button class="btn btn-sm btn-danger" data-borrar-foto="${f.id}" title="Eliminar foto"><i class="bi bi-trash"></i></button></div>`).join('')
      : '<div class="text-suave small">Aún no hay fotos.</div>';

    // Historial
    document.getElementById('historial').innerHTML = inst.historial.map((h) => `
      <li><div>${h.de_estatus ? `${esc(h.de_estatus)} <i class="bi bi-arrow-right"></i> ` : 'Creada en '}<strong>${esc(h.a_estatus)}</strong></div>
      <div class="small text-suave">${fechaHora(h.fecha)}${h.usuario_nombre ? ' · ' + esc(h.usuario_nombre) : ''}</div></li>`).join('');
  }

  async function recargar() {
    inst = await api(`/api/instalaciones/${instId}`);
    pintar();
  }

  // ---------- Guardar datos generales ----------
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const datos = TDM.formJson(form);
    if (!datos.cliente.trim()) { TDM.aviso('Escribe el nombre del cliente.', 'error'); form.cliente.focus(); return; }
    await TDM.conBoton(document.getElementById('btnGuardar'), async () => {
      try {
        if (instId) {
          inst = await api(`/api/instalaciones/${instId}`, { method: 'PUT', body: datos });
        } else {
          inst = await api('/api/instalaciones', { method: 'POST', body: datos });
          instId = inst.id;
          history.replaceState(null, '', `instalacion.html?id=${instId}`);
        }
        pintar();
        TDM.aviso('Instalación guardada');
      } catch (e) { TDM.error(e); }
    });
  });

  document.getElementById('btnEliminar').addEventListener('click', async () => {
    const ok = await TDM.confirmar(`Se eliminará la instalación ${inst.folio} de "${inst.cliente}" con todos sus archivos, pedidos y fotos. Esta acción no se puede deshacer.`, { titulo: 'Eliminar instalación' });
    if (!ok) return;
    try { await api(`/api/instalaciones/${instId}`, { method: 'DELETE' }); location.href = 'tablero.html'; } catch (e) { TDM.error(e); }
  });

  // ---------- Documentos ----------
  document.getElementById('documentos').addEventListener('click', async (ev) => {
    const subirBtn = ev.target.closest('[data-subir-doc]');
    const quitarBtn = ev.target.closest('[data-quitar-doc]');
    try {
      if (subirBtn) {
        const campo = subirBtn.dataset.subirDoc;
        const input = document.querySelector(`[data-doc="${campo}"]`);
        if (!input.files.length) { TDM.aviso('Primero elige un archivo.', 'error'); return; }
        revisarTamano(input);
        const fd = new FormData();
        fd.append(campo, input.files[0]);
        await TDM.conBoton(subirBtn, async () => { inst = await api(`/api/instalaciones/${instId}/documentos`, { method: 'POST', body: fd }); });
        pintar();
        TDM.aviso('Archivo subido');
      } else if (quitarBtn) {
        if (!(await TDM.confirmar('¿Quitar este archivo?', { titulo: 'Quitar archivo', boton: 'Sí, quitar' }))) return;
        inst = await api(`/api/instalaciones/${instId}/documentos/${quitarBtn.dataset.quitarDoc}`, { method: 'DELETE' });
        pintar();
      }
    } catch (e) { TDM.error(e); }
  });

  // ---------- Validaciones ----------
  const formVal = document.getElementById('formValidacion');
  formVal.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try {
      revisarTamano(formVal.archivo); revisarTamano(formVal.render);
      const fd = new FormData(formVal);
      if (!formVal.archivo.files.length) fd.delete('archivo');
      if (!formVal.render.files.length) fd.delete('render');
      await TDM.conBoton(formVal.querySelector('[type=submit]'), async () => {
        inst = await api(`/api/instalaciones/${instId}/validaciones`, { method: 'POST', body: fd });
      });
      formVal.reset();
      pintar();
      TDM.aviso('Versión agregada');
    } catch (e) { TDM.error(e); }
  });
  document.getElementById('listaValidaciones').addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-borrar-val]');
    if (!b) return;
    if (!(await TDM.confirmar('Se eliminará esta versión y sus archivos.', { titulo: 'Eliminar versión' }))) return;
    try { inst = await api(`/api/instalaciones/${instId}/validaciones/${b.dataset.borrarVal}`, { method: 'DELETE' }); pintar(); } catch (e) { TDM.error(e); }
  });

  // ---------- Pedidos ----------
  const modalPedido = new bootstrap.Modal(document.getElementById('modalPedido'));
  const formPed = document.getElementById('formPedido');
  async function abrirPedido(p) {
    try { proveedores = await api('/api/proveedores'); } catch (e) { TDM.error(e); }
    formPed.reset();
    formPed.pedido_id.value = p ? p.id : '';
    document.getElementById('pProveedor').innerHTML = opcionesSelect(proveedores, p ? p.proveedor_id : null, { vacio: '— Sin proveedor —', texto: (x) => x.nombre });
    document.getElementById('sinProveedores').hidden = proveedores.length > 0;
    if (p) {
      for (const k of ['numero_pedido', 'numero_factura', 'material', 'fecha_pago', 'enchape_primario', 'enchape_secundario']) formPed[k].value = p[k] || '';
      formPed.activo.checked = !!p.activo;
    }
    modalPedido.show();
  }
  document.getElementById('btnNuevoPedido').addEventListener('click', () => abrirPedido(null));
  formPed.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const datos = TDM.formJson(formPed);
    datos.activo = formPed.activo.checked;
    const pid = datos.pedido_id; delete datos.pedido_id;
    try {
      await TDM.conBoton(formPed.querySelector('[type=submit]'), async () => {
        inst = pid
          ? await api(`/api/instalaciones/${instId}/pedidos/${pid}`, { method: 'PUT', body: datos })
          : await api(`/api/instalaciones/${instId}/pedidos`, { method: 'POST', body: datos });
      });
      modalPedido.hide();
      pintar();
      TDM.aviso('Pedido guardado');
    } catch (e) { TDM.error(e); }
  });
  document.getElementById('listaPedidos').addEventListener('click', async (ev) => {
    const ed = ev.target.closest('[data-editar-ped]');
    const br = ev.target.closest('[data-borrar-ped]');
    if (ed) abrirPedido(inst.pedidos.find((p) => p.id === Number(ed.dataset.editarPed)));
    if (br) {
      if (!(await TDM.confirmar('¿Eliminar este pedido de material?', { titulo: 'Eliminar pedido' }))) return;
      try { inst = await api(`/api/instalaciones/${instId}/pedidos/${br.dataset.borrarPed}`, { method: 'DELETE' }); pintar(); } catch (e) { TDM.error(e); }
    }
  });

  // ---------- Fotos ----------
  const formFotos = document.getElementById('formFotos');
  formFotos.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const input = document.getElementById('inputFotos');
    try {
      if (!input.files.length) throw new Error('Elige una o varias fotos.');
      revisarTamano(input);
      const fd = new FormData();
      for (const f of input.files) fd.append('fotos', f);
      await TDM.conBoton(formFotos.querySelector('[type=submit]'), async () => {
        inst = await api(`/api/instalaciones/${instId}/fotos`, { method: 'POST', body: fd });
      });
      formFotos.reset();
      pintar();
      TDM.aviso('Fotos subidas');
    } catch (e) { TDM.error(e); }
  });
  const modalFoto = new bootstrap.Modal(document.getElementById('modalFoto'));
  document.getElementById('galeria').addEventListener('click', async (ev) => {
    const ver = ev.target.closest('[data-ver-foto]');
    const br = ev.target.closest('[data-borrar-foto]');
    if (br) {
      if (!(await TDM.confirmar('¿Eliminar esta foto?', { titulo: 'Eliminar foto' }))) return;
      try { inst = await api(`/api/instalaciones/${instId}/fotos/${br.dataset.borrarFoto}`, { method: 'DELETE' }); pintar(); } catch (e) { TDM.error(e); }
    } else if (ver) {
      const url = urlArchivo(ver.dataset.verFoto);
      document.getElementById('fotoGrande').src = url;
      document.getElementById('fotoAbrir').href = url;
      modalFoto.show();
    }
  });

  // ---------- Inicio ----------
  try {
    await cargarCatalogos();
    if (instId) await recargar();
    else {
      // Permite precargar desde un levantamiento: /instalacion?levantamiento=ID
      pintar();
      const pre = new URLSearchParams(location.search).get('levantamiento');
      if (pre) { selLev.value = pre; selLev.dispatchEvent(new Event('change')); }
    }
  } catch (e) {
    TDM.error(e);
    if (instId) document.getElementById('encabezado').textContent = 'No se encontró la instalación';
  }
})();
