(async function () {
  'use strict';
  const { api, esc, fecha, diasHasta, urlArchivo } = TDM;
  const estado = await TDM.iniciar('tablero', 'Tablero de instalaciones');
  const ESTATUS = estado.estatusInstalacion;
  document.getElementById('accionesTopbar').innerHTML =
    '<a class="btn btn-primary btn-sm" href="instalacion.html"><i class="bi bi-plus-lg me-1"></i><span class="d-none d-sm-inline">Nueva instalación</span></a>';

  const tablero = document.getElementById('tablero');
  const inputBuscar = document.getElementById('buscar');
  let instalaciones = [];

  // ----- Filtro de estatus (se recuerda en este navegador) -----
  const CLAVE = 'tdm.filtroEstatus';
  let visibles;
  const param = new URLSearchParams(location.search).get('estatus');
  if (param && ESTATUS.some((e) => e.nombre === param)) {
    visibles = new Set([param]);
  } else {
    try { visibles = new Set(JSON.parse(localStorage.getItem(CLAVE)) || ESTATUS.map((e) => e.nombre)); } catch { visibles = new Set(ESTATUS.map((e) => e.nombre)); }
  }
  function guardarFiltro() { localStorage.setItem(CLAVE, JSON.stringify([...visibles])); }

  const cajaFiltros = document.getElementById('filtros');
  cajaFiltros.innerHTML = ESTATUS.map((e, i) => `
    <div class="form-check">
      <input class="form-check-input filtro" type="checkbox" id="f${i}" value="${esc(e.nombre)}">
      <label class="form-check-label d-flex align-items-center gap-2" for="f${i}">
        <span class="rounded-circle d-inline-block" style="width:10px;height:10px;background:${e.color}"></span>${esc(e.nombre)}
        <span class="badge rounded-pill text-bg-light border ms-auto" data-cuenta="${esc(e.nombre)}">0</span></label>
    </div>`).join('');
  function pintarFiltros() {
    cajaFiltros.querySelectorAll('.filtro').forEach((c) => { c.checked = visibles.has(c.value); });
    document.getElementById('numFiltro').textContent = visibles.size === ESTATUS.length ? '' : `${visibles.size}/${ESTATUS.length}`;
    document.querySelectorAll('.columna').forEach((col) => col.classList.toggle('oculta', !visibles.has(col.dataset.estatus)));
  }
  cajaFiltros.addEventListener('change', (ev) => {
    if (!ev.target.classList.contains('filtro')) return;
    ev.target.checked ? visibles.add(ev.target.value) : visibles.delete(ev.target.value);
    guardarFiltro(); pintarFiltros();
  });
  document.getElementById('filtroTodos').onclick = () => { visibles = new Set(ESTATUS.map((e) => e.nombre)); guardarFiltro(); pintarFiltros(); };
  document.getElementById('filtroActivos').onclick = () => { visibles = new Set(ESTATUS.slice(0, -1).map((e) => e.nombre)); guardarFiltro(); pintarFiltros(); };
  document.getElementById('filtroNinguno').onclick = () => { visibles = new Set(); guardarFiltro(); pintarFiltros(); };

  // ----- Columnas -----
  tablero.innerHTML = ESTATUS.map((e) => `
    <section class="columna" data-estatus="${esc(e.nombre)}" style="--c:${e.color}">
      <div class="columna-cab"><h3>${esc(e.nombre)}</h3><span class="badge rounded-pill cuenta">0</span></div>
      <div class="columna-lista" data-estatus="${esc(e.nombre)}"></div>
    </section>`).join('');

  function botonArchivo(nombre, icono, titulo) {
    const url = urlArchivo(nombre);
    return url
      ? `<a class="btn btn-sm" href="${url}" target="_blank" rel="noopener" title="${titulo}" aria-label="${titulo}"><i class="bi ${icono}"></i></a>`
      : `<button class="btn btn-sm" disabled title="${titulo} (sin archivo)" aria-label="${titulo} (sin archivo)"><i class="bi ${icono}"></i></button>`;
  }

  function tarjeta(i) {
    const d = diasHasta(i.fecha_entrega);
    const final = i.estatus === 'Finalizado';
    const vencida = d !== null && d < 0 && !final;
    const pronto = d !== null && d >= 0 && d <= 3 && !final;
    const fechaHtml = i.fecha_entrega
      ? `<span class="fecha ${vencida ? 'vencida' : pronto ? 'pronto' : ''}" title="Fecha de entrega"><i class="bi bi-calendar3"></i>${fecha(i.fecha_entrega)}${vencida ? ' · atrasada' : ''}</span>`
      : '<span class="fecha text-suave"><i class="bi bi-calendar3"></i>Sin fecha</span>';
    return `<article class="tarjeta ${vencida ? 'atrasada' : ''}" data-id="${i.id}">
      <div class="folio">${esc(i.folio)} · #${i.id}</div>
      <div class="cliente">${esc(i.cliente)}</div>
      ${i.descripcion ? `<div class="desc">${esc(i.descripcion)}</div>` : ''}
      ${fechaHtml}
      <div class="acciones">
        ${botonArchivo(i.pdf_cotizacion, 'bi-receipt', 'Cotización PDF')}
        ${botonArchivo(i.pdf_levantamiento, 'bi-rulers', 'Levantamiento PDF')}
        ${botonArchivo(i.doc_validacion, 'bi-patch-check', 'Documento de validación')}
        ${botonArchivo(i.croquis, 'bi-pencil-square', 'Croquis')}
        <a class="btn btn-sm ms-auto" href="instalacion.html?id=${i.id}" title="Editar" aria-label="Editar"><i class="bi bi-pencil"></i></a>
        <button class="btn btn-sm borrar" data-borrar="${i.id}" title="Eliminar" aria-label="Eliminar"><i class="bi bi-trash"></i></button>
      </div>
    </article>`;
  }

  function coincide(i, q) {
    if (!q) return true;
    q = q.toLowerCase().trim();
    return String(i.id) === q.replace('#', '') || i.folio.toLowerCase().includes(q) || i.cliente.toLowerCase().includes(q);
  }

  function pintar() {
    const q = inputBuscar.value;
    const cuentas = {};
    document.querySelectorAll('.columna-lista').forEach((lista) => {
      const est = lista.dataset.estatus;
      const items = instalaciones.filter((i) => i.estatus === est);
      cuentas[est] = items.length;
      const filtrados = items.filter((i) => coincide(i, q));
      lista.innerHTML = filtrados.map(tarjeta).join('') ||
        `<div class="text-center small text-suave py-3 vacia">${q ? 'Sin resultados' : 'Sin instalaciones'}</div>`;
      lista.closest('.columna').querySelector('.cuenta').textContent = q && filtrados.length !== items.length ? `${filtrados.length}/${items.length}` : items.length;
    });
    document.querySelectorAll('[data-cuenta]').forEach((b) => { b.textContent = cuentas[b.dataset.cuenta] || 0; });
    pintarFiltros();
  }

  async function cargar() {
    try { instalaciones = await api('/api/instalaciones'); pintar(); } catch (e) { TDM.error(e); }
  }

  // ----- Arrastrar y soltar -----
  document.querySelectorAll('.columna-lista').forEach((lista) => {
    Sortable.create(lista, {
      group: 'tablero',
      animation: 150,
      draggable: '.tarjeta',
      filter: '.acciones, .vacia',
      preventOnFilter: false,
      ghostClass: 'tarjeta-fantasma',
      chosenClass: 'tarjeta-elegida',
      delay: 180,
      delayOnTouchOnly: true,
      onEnd: async (ev) => {
        const id = Number(ev.item.dataset.id);
        const destino = ev.to.dataset.estatus;
        if (ev.from === ev.to && ev.oldIndex === ev.newIndex) return;
        // Orden completo de la columna destino (incluye tarjetas ocultas por la búsqueda, al final)
        const visiblesIds = [...ev.to.querySelectorAll('.tarjeta')].map((t) => Number(t.dataset.id));
        const ocultos = instalaciones.filter((i) => i.estatus === destino && !visiblesIds.includes(i.id)).map((i) => i.id);
        const orden = [...visiblesIds, ...ocultos];
        try {
          await api(`/api/instalaciones/${id}/mover`, { method: 'POST', body: { estatus: destino, orden } });
          const inst = instalaciones.find((i) => i.id === id);
          if (inst && inst.estatus !== destino) TDM.aviso(`${inst.cliente} → ${destino}`);
          // Actualiza los datos locales
          if (inst) inst.estatus = destino;
          orden.forEach((x, n) => { const i = instalaciones.find((k) => k.id === x); if (i) i.orden = n; });
          instalaciones.sort((a, b) => a.orden - b.orden || a.id - b.id);
          pintar();
        } catch (e) { TDM.error(e); cargar(); }
      }
    });
  });

  tablero.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-borrar]');
    if (!b) return;
    const inst = instalaciones.find((i) => i.id === Number(b.dataset.borrar));
    if (!inst) return;
    const ok = await TDM.confirmar(`Se eliminará la instalación ${inst.folio} de "${inst.cliente}" junto con sus archivos, pedidos y fotos. Esta acción no se puede deshacer.`, { titulo: 'Eliminar instalación' });
    if (!ok) return;
    try {
      await api(`/api/instalaciones/${inst.id}`, { method: 'DELETE' });
      instalaciones = instalaciones.filter((i) => i.id !== inst.id);
      pintar();
      TDM.aviso('Instalación eliminada');
    } catch (e) { TDM.error(e); }
  });

  tablero.addEventListener('dblclick', (ev) => {
    const t = ev.target.closest('.tarjeta');
    if (t && !ev.target.closest('.acciones')) location.href = `instalacion.html?id=${t.dataset.id}`;
  });

  let temporizador;
  inputBuscar.addEventListener('input', () => { clearTimeout(temporizador); temporizador = setTimeout(pintar, 120); });

  await cargar();
})();
