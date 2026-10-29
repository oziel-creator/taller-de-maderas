(async function () {
  'use strict';
  const { api, esc, fecha, dinero, urlArchivo, opcionesSelect } = TDM;
  const estado = await TDM.iniciar('cotizaciones', 'Cotizaciones');
  const EST = estado.estatusCotizacion;
  document.querySelectorAll('.maxmb').forEach((e) => { e.textContent = estado.maxMb; });
  document.getElementById('accionesTopbar').innerHTML =
    '<button class="btn btn-primary btn-sm" id="btnNuevo"><i class="bi bi-plus-lg me-1"></i><span class="d-none d-sm-inline">Nueva cotización</span></button>';

  const modal = new bootstrap.Modal(document.getElementById('modalCot'));
  const form = document.getElementById('formCot');
  const buscar = document.getElementById('buscar');
  const filtroEst = document.getElementById('filtroEstatus');
  const cuerpoConceptos = document.getElementById('conceptos');
  filtroEst.innerHTML += EST.map((e) => `<option value="${e}">${e[0].toUpperCase() + e.slice(1)}</option>`).join('');
  document.getElementById('cEstatus').innerHTML = EST.map((e) => `<option value="${e}">${e[0].toUpperCase() + e.slice(1)}</option>`).join('');

  let lista = [];
  let levantamientos = [];
  let quitarPdf = false;

  function pintar() {
    const q = buscar.value.trim().toLowerCase();
    const est = filtroEst.value;
    const filas = lista.filter((c) => (!est || c.estatus === est) && (!q || c.folio.toLowerCase().includes(q) || c.cliente.toLowerCase().includes(q)));
    document.getElementById('conteo').textContent = `${filas.length} de ${lista.length}`;
    const cont = document.getElementById('lista');
    if (!filas.length) {
      cont.innerHTML = `<div class="vacio"><i class="bi bi-receipt"></i>${lista.length ? 'Sin resultados.' : 'Aún no hay cotizaciones.'}</div>`;
      return;
    }
    cont.innerHTML = `<table class="table table-hover mb-0"><thead><tr>
      <th class="ps-3">Folio</th><th>Cliente</th><th>Levantamiento</th><th>Fecha</th><th class="text-end">Total</th><th>Estatus</th><th>PDF</th><th class="text-end pe-3">Acciones</th></tr></thead><tbody>
      ${filas.map((c) => `<tr>
        <td class="ps-3 fw-semibold text-nowrap">${esc(c.folio)}</td>
        <td>${esc(c.cliente)}</td>
        <td class="text-nowrap">${esc(c.levantamiento_folio || '—')}</td>
        <td class="text-nowrap">${fecha(c.fecha)}</td>
        <td class="text-end text-nowrap fw-semibold">${dinero(c.total)}</td>
        <td><span class="badge badge-cot ${c.estatus}">${c.estatus}</span></td>
        <td>${c.pdf ? `<a class="btn btn-sm btn-madera" href="${urlArchivo(c.pdf)}" target="_blank" rel="noopener" title="Abrir PDF"><i class="bi bi-file-earmark-pdf"></i></a>` : '<span class="text-suave">—</span>'}</td>
        <td class="text-end text-nowrap pe-3">
          ${c.instalacion_id ? `<a class="btn btn-sm btn-outline-primary" href="instalacion.html?id=${c.instalacion_id}"><i class="bi bi-kanban me-1"></i>Ver instalación</a>`
            : c.estatus === 'aceptada' ? `<button class="btn btn-sm btn-primary" data-crear="${c.id}"><i class="bi bi-hammer me-1"></i>Crear instalación</button>` : ''}
          <div class="btn-group btn-group-sm">
            <button class="btn btn-madera" data-editar="${c.id}" title="Editar"><i class="bi bi-pencil"></i></button>
            <button class="btn btn-outline-danger" data-borrar="${c.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
          </div></td></tr>`).join('')}
      </tbody></table>`;
  }

  async function cargar() {
    try { lista = await api('/api/cotizaciones'); pintar(); } catch (e) { TDM.error(e); }
  }

  // ----- Conceptos -----
  function filaConcepto(c = {}) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input class="form-control form-control-sm c-desc" maxlength="500" value="${esc(c.descripcion || '')}" placeholder="Ej. Mueble de cocina inferior"></td>
      <td><input class="form-control form-control-sm c-cant" type="number" min="0" step="any" value="${c.cantidad ?? 1}"></td>
      <td><div class="input-group input-group-sm"><span class="input-group-text">$</span><input class="form-control c-precio" type="number" min="0" step="0.01" value="${c.precio ?? ''}"></div></td>
      <td class="text-end c-importe text-nowrap"></td>
      <td><button type="button" class="btn btn-sm btn-outline-danger c-quitar" title="Quitar concepto"><i class="bi bi-x-lg"></i></button></td>`;
    cuerpoConceptos.appendChild(tr);
  }
  function leerConceptos() {
    return [...cuerpoConceptos.querySelectorAll('tr')].map((tr) => ({
      descripcion: tr.querySelector('.c-desc').value,
      cantidad: tr.querySelector('.c-cant').value,
      precio: tr.querySelector('.c-precio').value
    }));
  }
  function recalcular() {
    let total = 0;
    cuerpoConceptos.querySelectorAll('tr').forEach((tr) => {
      const imp = (Number(tr.querySelector('.c-cant').value) || 0) * (Number(tr.querySelector('.c-precio').value) || 0);
      total += imp;
      tr.querySelector('.c-importe').textContent = dinero(imp);
    });
    document.getElementById('total').textContent = dinero(total);
  }
  cuerpoConceptos.addEventListener('input', recalcular);
  cuerpoConceptos.addEventListener('click', (ev) => {
    if (ev.target.closest('.c-quitar')) { ev.target.closest('tr').remove(); if (!cuerpoConceptos.children.length) filaConcepto(); recalcular(); }
  });
  document.getElementById('btnConcepto').addEventListener('click', () => { filaConcepto(); recalcular(); cuerpoConceptos.lastElementChild.querySelector('.c-desc').focus(); });

  function pintarPdfActual(c) {
    const cont = document.getElementById('pdfActual');
    if (c && c.pdf && !quitarPdf) {
      cont.innerHTML = `<a href="${urlArchivo(c.pdf)}" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf me-1"></i>Archivo actual</a>
        <button type="button" class="btn btn-sm btn-link text-danger" id="btnQuitarPdf">Quitar</button>`;
      document.getElementById('btnQuitarPdf').onclick = () => { quitarPdf = true; pintarPdfActual(c); };
    } else cont.innerHTML = quitarPdf ? '<span class="small text-danger">El archivo se quitará al guardar.</span>' : '';
  }

  const selLev = document.getElementById('cLev');
  selLev.addEventListener('change', () => {
    const l = levantamientos.find((x) => String(x.id) === selLev.value);
    if (l && !form.cliente.value) form.cliente.value = l.cliente;
  });

  async function abrir(c, levPre) {
    try { levantamientos = await api('/api/levantamientos'); } catch (e) { TDM.error(e); }
    form.reset();
    quitarPdf = false;
    form.registro_id.value = c ? c.id : '';
    document.getElementById('tituloModal').textContent = c ? `Editar ${c.folio}` : 'Nueva cotización';
    document.getElementById('folio').value = c ? c.folio : '';
    selLev.innerHTML = opcionesSelect(levantamientos, c ? c.levantamiento_id : levPre, { vacio: '— Sin levantamiento —', texto: (l) => `${l.folio} · ${l.cliente}` });
    form.cliente.value = c ? c.cliente : '';
    form.fecha.value = c ? c.fecha || '' : TDM.hoy();
    form.estatus.value = c ? c.estatus : 'borrador';
    form.notas.value = c ? c.notas || '' : '';
    cuerpoConceptos.innerHTML = '';
    (c && c.conceptos.length ? c.conceptos : [{}]).forEach(filaConcepto);
    recalcular();
    pintarPdfActual(c);
    if (!c && levPre) selLev.dispatchEvent(new Event('change'));
    modal.show();
  }

  document.getElementById('btnNuevo').addEventListener('click', () => abrir(null));
  buscar.addEventListener('input', pintar);
  filtroEst.addEventListener('change', pintar);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!form.cliente.value.trim()) { TDM.aviso('Escribe el nombre del cliente.', 'error'); return; }
    const f = form.pdf.files[0];
    if (f && f.size > estado.maxMb * 1024 * 1024) { TDM.aviso(`El archivo pesa más de ${estado.maxMb} MB.`, 'error'); return; }
    const fd = new FormData(form);
    const rid = fd.get('registro_id'); fd.delete('registro_id');
    if (!f) fd.delete('pdf');
    if (quitarPdf) fd.append('quitar_pdf', '1');
    fd.append('conceptos', JSON.stringify(leerConceptos()));
    try {
      await TDM.conBoton(form.querySelector('[type=submit]'), () =>
        api(rid ? `/api/cotizaciones/${rid}` : '/api/cotizaciones', { method: rid ? 'PUT' : 'POST', body: fd }));
      modal.hide();
      TDM.aviso('Cotización guardada');
      cargar();
    } catch (e) { TDM.error(e); }
  });

  document.getElementById('lista').addEventListener('click', async (ev) => {
    const ed = ev.target.closest('[data-editar]');
    const br = ev.target.closest('[data-borrar]');
    const cr = ev.target.closest('[data-crear]');
    try {
      if (ed) abrir(await api(`/api/cotizaciones/${ed.dataset.editar}`));
      if (br) {
        const c = lista.find((x) => x.id === Number(br.dataset.borrar));
        if (!(await TDM.confirmar(`Se eliminará la cotización ${c.folio} de "${c.cliente}".`, { titulo: 'Eliminar cotización' }))) return;
        await api(`/api/cotizaciones/${c.id}`, { method: 'DELETE' });
        TDM.aviso('Cotización eliminada');
        cargar();
      }
      if (cr) {
        const c = lista.find((x) => x.id === Number(cr.dataset.crear));
        if (!(await TDM.confirmar(`Se creará una instalación para "${c.cliente}" en la columna “En lista de diseño”.`, { titulo: 'Crear instalación', boton: 'Crear instalación', peligro: false }))) return;
        const r = await api(`/api/cotizaciones/${c.id}/crear-instalacion`, { method: 'POST' });
        location.href = `instalacion.html?id=${r.id}`;
      }
    } catch (e) { TDM.error(e); }
  });

  await cargar();
  const pre = new URLSearchParams(location.search).get('levantamiento');
  if (pre) abrir(null, pre);
})();
