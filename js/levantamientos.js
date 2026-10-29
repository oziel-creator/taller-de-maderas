(async function () {
  'use strict';
  const { api, esc, fecha, urlArchivo } = TDM;
  const estado = await TDM.iniciar('levantamientos', 'Levantamientos');
  document.querySelectorAll('.maxmb').forEach((e) => { e.textContent = estado.maxMb; });
  document.getElementById('accionesTopbar').innerHTML =
    '<button class="btn btn-primary btn-sm" id="btnNuevo"><i class="bi bi-plus-lg me-1"></i><span class="d-none d-sm-inline">Nuevo levantamiento</span></button>';

  const modal = new bootstrap.Modal(document.getElementById('modalLev'));
  const form = document.getElementById('formLev');
  const buscar = document.getElementById('buscar');
  let lista = [];
  let quitarPdf = false;

  function pintar() {
    const q = buscar.value.trim().toLowerCase();
    const filas = lista.filter((l) => !q || [l.folio, l.cliente, l.direccion, l.telefono].some((x) => (x || '').toLowerCase().includes(q)));
    document.getElementById('conteo').textContent = `${filas.length} de ${lista.length}`;
    const cont = document.getElementById('lista');
    if (!filas.length) {
      cont.innerHTML = `<div class="vacio"><i class="bi bi-rulers"></i>${lista.length ? 'Sin resultados.' : 'Aún no hay levantamientos. Crea el primero con el botón “Nuevo levantamiento”.'}</div>`;
      return;
    }
    cont.innerHTML = `<table class="table table-hover mb-0"><thead><tr>
      <th class="ps-3">Folio</th><th>Cliente</th><th>Teléfono</th><th>Fecha</th><th>Dirección</th><th>PDF</th><th class="text-end pe-3">Acciones</th></tr></thead><tbody>
      ${filas.map((l) => `<tr>
        <td class="ps-3 fw-semibold text-nowrap">${esc(l.folio)}</td>
        <td>${esc(l.cliente)}</td>
        <td class="text-nowrap">${l.telefono ? `<a href="tel:${esc(l.telefono)}">${esc(l.telefono)}</a>` : '—'}</td>
        <td class="text-nowrap">${fecha(l.fecha) || '—'}</td>
        <td class="small" style="min-width:160px">${esc(l.direccion || '—')}</td>
        <td>${l.pdf ? `<a class="btn btn-sm btn-madera" href="${urlArchivo(l.pdf)}" target="_blank" rel="noopener" title="Abrir PDF"><i class="bi bi-file-earmark-pdf"></i></a>` : '<span class="text-suave">—</span>'}</td>
        <td class="text-end text-nowrap pe-3">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-madera" data-editar="${l.id}" title="Editar"><i class="bi bi-pencil"></i></button>
            <a class="btn btn-madera" href="cotizaciones.html?levantamiento=${l.id}" title="Nueva cotización"><i class="bi bi-receipt"></i></a>
            <a class="btn btn-madera" href="instalacion.html?levantamiento=${l.id}" title="Nueva instalación"><i class="bi bi-kanban"></i></a>
            <button class="btn btn-outline-danger" data-borrar="${l.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
          </div></td></tr>`).join('')}
      </tbody></table>`;
  }

  async function cargar() {
    try { lista = await api('/api/levantamientos'); pintar(); } catch (e) { TDM.error(e); }
  }

  function pintarPdfActual(l) {
    const c = document.getElementById('pdfActual');
    if (l && l.pdf && !quitarPdf) {
      c.innerHTML = `<a href="${urlArchivo(l.pdf)}" target="_blank" rel="noopener"><i class="bi bi-file-earmark-pdf me-1"></i>Archivo actual</a>
        <button type="button" class="btn btn-sm btn-link text-danger" id="btnQuitarPdf">Quitar</button>`;
      document.getElementById('btnQuitarPdf').onclick = () => { quitarPdf = true; pintarPdfActual(l); };
    } else c.innerHTML = quitarPdf ? '<span class="small text-danger">El archivo se quitará al guardar.</span>' : '';
  }

  function abrir(l) {
    form.reset();
    quitarPdf = false;
    form.registro_id.value = l ? l.id : '';
    document.getElementById('tituloModal').textContent = l ? `Editar ${l.folio}` : 'Nuevo levantamiento';
    document.getElementById('folio').value = l ? l.folio : '';
    if (l) for (const k of ['cliente', 'telefono', 'direccion', 'fecha', 'notas']) form[k].value = l[k] || '';
    else form.fecha.value = TDM.hoy();
    pintarPdfActual(l);
    modal.show();
  }

  document.getElementById('btnNuevo').addEventListener('click', () => abrir(null));
  buscar.addEventListener('input', pintar);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!form.cliente.value.trim()) { TDM.aviso('Escribe el nombre del cliente.', 'error'); return; }
    const f = form.pdf.files[0];
    if (f && f.size > estado.maxMb * 1024 * 1024) { TDM.aviso(`El archivo pesa más de ${estado.maxMb} MB.`, 'error'); return; }
    const fd = new FormData(form);
    const rid = fd.get('registro_id'); fd.delete('registro_id');
    if (!f) fd.delete('pdf');
    if (quitarPdf) fd.append('quitar_pdf', '1');
    try {
      await TDM.conBoton(form.querySelector('[type=submit]'), () =>
        api(rid ? `/api/levantamientos/${rid}` : '/api/levantamientos', { method: rid ? 'PUT' : 'POST', body: fd }));
      modal.hide();
      TDM.aviso('Levantamiento guardado');
      cargar();
    } catch (e) { TDM.error(e); }
  });

  document.getElementById('lista').addEventListener('click', async (ev) => {
    const ed = ev.target.closest('[data-editar]');
    const br = ev.target.closest('[data-borrar]');
    if (ed) {
      try { abrir(await api(`/api/levantamientos/${ed.dataset.editar}`)); } catch (e) { TDM.error(e); }
    }
    if (br) {
      const l = lista.find((x) => x.id === Number(br.dataset.borrar));
      const extra = l.cotizaciones || l.instalaciones ? ` Tiene ${l.cotizaciones} cotización(es) y ${l.instalaciones} instalación(es) vinculadas; esas no se borran, solo se desvinculan.` : '';
      if (!(await TDM.confirmar(`Se eliminará el levantamiento ${l.folio} de "${l.cliente}".${extra}`, { titulo: 'Eliminar levantamiento' }))) return;
      try { await api(`/api/levantamientos/${l.id}`, { method: 'DELETE' }); TDM.aviso('Levantamiento eliminado'); cargar(); } catch (e) { TDM.error(e); }
    }
  });

  await cargar();
  if (new URLSearchParams(location.search).get('nuevo')) abrir(null);
})();
