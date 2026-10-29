(async function () {
  'use strict';
  const { api, esc, fecha, diasHasta } = TDM;
  const estado = await TDM.iniciar('inicio', 'Inicio');
  document.getElementById('accionesTopbar').innerHTML =
    '<a class="btn btn-primary btn-sm" href="instalacion.html"><i class="bi bi-plus-lg me-1"></i><span class="d-none d-sm-inline">Nueva instalación</span></a>';

  let r;
  try { r = await api('/api/resumen'); } catch (e) { return TDM.error(e); }

  const stats = [
    { n: r.activas, etq: 'Instalaciones activas', icono: 'bi-hammer', url: 'tablero.html' },
    { n: r.atrasadas, etq: 'Entregas atrasadas', icono: 'bi-exclamation-triangle', url: 'tablero.html', alerta: r.atrasadas > 0 },
    { n: r.levantamientos, etq: 'Levantamientos', icono: 'bi-rulers', url: 'levantamientos.html' },
    { n: r.cotizaciones.aceptada, etq: 'Cotizaciones aceptadas', icono: 'bi-check2-circle', url: 'cotizaciones.html' }
  ];
  document.getElementById('stats').innerHTML = stats.map((s) => `
    <div class="col-6 col-lg-3"><a href="${s.url}" class="text-decoration-none">
      <div class="tdm-card stat h-100 ${s.alerta ? 'border-danger' : ''}">
        <div class="d-flex align-items-start"><div class="num ${s.alerta ? 'text-danger' : ''}">${s.n}</div>
        <i class="bi ${s.icono} ms-auto fs-4" style="color:var(--miel)"></i></div>
        <div class="etq">${s.etq}</div></div></a></div>`).join('');

  document.getElementById('porEstatus').innerHTML = estado.estatusInstalacion.map((e) => `
    <div class="col-sm-6 col-md-4"><a class="estatus-tile" href="tablero.html?estatus=${encodeURIComponent(e.nombre)}">
      <span class="punto" style="background:${e.color}"></span><span class="small">${esc(e.nombre)}</span>
      <span class="n">${r.porEstatus[e.nombre] || 0}</span></a></div>`).join('');

  const cont = document.getElementById('proximas');
  if (!r.proximas.length) {
    cont.innerHTML = '<div class="vacio"><i class="bi bi-calendar-check"></i>No hay entregas próximas.</div>';
  } else {
    cont.innerHTML = '<div class="list-group list-group-flush">' + r.proximas.map((p) => {
      const d = diasHasta(p.fecha_entrega);
      const etq = d < 0 ? `<span class="badge text-bg-danger">Atrasada ${-d} día${d === -1 ? '' : 's'}</span>`
        : d === 0 ? '<span class="badge text-bg-warning">Hoy</span>'
        : `<span class="badge text-bg-light border">En ${d} día${d === 1 ? '' : 's'}</span>`;
      return `<a class="list-group-item list-group-item-action d-flex align-items-center gap-2 bg-transparent" href="instalacion.html?id=${p.id}">
        <div class="flex-grow-1 min-w-0"><div class="fw-semibold text-truncate">${esc(p.cliente)}</div>
        <div class="small text-suave">${esc(p.folio)} · ${esc(p.estatus)}</div></div>
        <div class="text-end small"><div>${fecha(p.fecha_entrega)}</div>${etq}</div></a>`;
    }).join('') + '</div>';
  }

  document.getElementById('cotizaciones').innerHTML = estado.estatusCotizacion.map((e) => `
    <div class="col-6 col-md-3"><div class="estatus-tile"><span class="badge badge-cot ${e}">${e}</span>
    <span class="n">${r.cotizaciones[e] || 0}</span></div></div>`).join('');
})();
