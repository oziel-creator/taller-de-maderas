(async function () {
  'use strict';
  const { api, esc } = TDM;
  await TDM.iniciar('proveedores', 'Proveedores');
  document.getElementById('accionesTopbar').innerHTML =
    '<button class="btn btn-primary btn-sm" id="btnNuevo"><i class="bi bi-plus-lg me-1"></i><span class="d-none d-sm-inline">Nuevo proveedor</span></button>';
  const modal = new bootstrap.Modal(document.getElementById('modalProv'));
  const form = document.getElementById('formProv');
  const buscar = document.getElementById('buscar');
  let lista = [];

  function pintar() {
    const q = buscar.value.trim().toLowerCase();
    const filas = lista.filter((p) => !q || [p.nombre, p.contacto, p.telefono, p.notas].some((x) => (x || '').toLowerCase().includes(q)));
    document.getElementById('conteo').textContent = `${filas.length} de ${lista.length}`;
    const cont = document.getElementById('lista');
    if (!filas.length) {
      cont.innerHTML = `<div class="vacio"><i class="bi bi-truck"></i>${lista.length ? 'Sin resultados.' : 'Aún no hay proveedores. Agrega los proveedores con los que trabajas.'}</div>`;
      return;
    }
    cont.innerHTML = `<table class="table table-hover mb-0"><thead><tr><th class="ps-3">Nombre</th><th>Contacto</th><th>Teléfono</th><th>Notas</th><th>Pedidos</th><th class="text-end pe-3">Acciones</th></tr></thead><tbody>
      ${filas.map((p) => `<tr>
        <td class="ps-3 fw-semibold">${esc(p.nombre)}</td><td>${esc(p.contacto || '—')}</td>
        <td class="text-nowrap">${p.telefono ? `<a href="tel:${esc(p.telefono)}">${esc(p.telefono)}</a>` : '—'}</td>
        <td class="small" style="min-width:180px">${esc(p.notas || '')}</td><td>${p.pedidos}</td>
        <td class="text-end text-nowrap pe-3"><div class="btn-group btn-group-sm">
          <button class="btn btn-madera" data-editar="${p.id}" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-outline-danger" data-borrar="${p.id}" title="Eliminar"><i class="bi bi-trash"></i></button></div></td></tr>`).join('')}
      </tbody></table>`;
  }
  async function cargar() { try { lista = await api('/api/proveedores'); pintar(); } catch (e) { TDM.error(e); } }

  function abrir(p) {
    form.reset();
    form.registro_id.value = p ? p.id : '';
    document.getElementById('tituloModal').textContent = p ? 'Editar proveedor' : 'Nuevo proveedor';
    if (p) for (const k of ['nombre', 'contacto', 'telefono', 'notas']) form[k].value = p[k] || '';
    modal.show();
  }
  document.getElementById('btnNuevo').addEventListener('click', () => abrir(null));
  buscar.addEventListener('input', pintar);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = TDM.formJson(form);
    if (!d.nombre.trim()) { TDM.aviso('Escribe el nombre del proveedor.', 'error'); return; }
    const rid = d.registro_id; delete d.registro_id;
    try {
      await TDM.conBoton(form.querySelector('[type=submit]'), () => api(rid ? `/api/proveedores/${rid}` : '/api/proveedores', { method: rid ? 'PUT' : 'POST', body: d }));
      modal.hide(); TDM.aviso('Proveedor guardado'); cargar();
    } catch (e) { TDM.error(e); }
  });

  document.getElementById('lista').addEventListener('click', async (ev) => {
    const ed = ev.target.closest('[data-editar]');
    const br = ev.target.closest('[data-borrar]');
    if (ed) abrir(lista.find((p) => p.id === Number(ed.dataset.editar)));
    if (br) {
      const p = lista.find((x) => x.id === Number(br.dataset.borrar));
      const extra = p.pedidos ? ` Aparece en ${p.pedidos} pedido(s); esos pedidos se quedarán sin proveedor.` : '';
      if (!(await TDM.confirmar(`Se eliminará el proveedor "${p.nombre}".${extra}`, { titulo: 'Eliminar proveedor' }))) return;
      try { await api(`/api/proveedores/${p.id}`, { method: 'DELETE' }); TDM.aviso('Proveedor eliminado'); cargar(); } catch (e) { TDM.error(e); }
    }
  });
  await cargar();
})();
