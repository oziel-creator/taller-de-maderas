(async function () {
  'use strict';
  const { api, esc, fechaHora } = TDM;
  const estado = await TDM.iniciar('usuarios', 'Usuarios');
  const yo = estado.usuario;
  document.getElementById('accionesTopbar').innerHTML =
    '<button class="btn btn-primary btn-sm" id="btnNuevo"><i class="bi bi-person-plus me-1"></i><span class="d-none d-sm-inline">Nuevo usuario</span></button>';
  const modalU = new bootstrap.Modal(document.getElementById('modalUsuario'));
  const modalC = new bootstrap.Modal(document.getElementById('modalContrasena'));
  const formU = document.getElementById('formUsuario');
  const formC = document.getElementById('formContrasena');
  let lista = [];

  function pintar() {
    document.getElementById('lista').innerHTML = `<table class="table table-hover mb-0"><thead><tr><th class="ps-3">Nombre</th><th>Usuario</th><th>Correo</th><th>Estado</th><th>Creado</th><th class="text-end pe-3">Acciones</th></tr></thead><tbody>
      ${lista.map((u) => `<tr class="${u.activo ? '' : 'text-suave'}">
        <td class="ps-3 fw-semibold">${esc(u.nombre)}${u.id === yo.id ? ' <span class="badge text-bg-light border">Tú</span>' : ''}</td>
        <td>@${esc(u.usuario)}</td><td>${esc(u.correo || '—')}</td>
        <td>${u.activo ? '<span class="badge text-bg-success">Activo</span>' : '<span class="badge text-bg-secondary">Desactivado</span>'}</td>
        <td class="small text-nowrap">${fechaHora(u.creado)}</td>
        <td class="text-end text-nowrap pe-3"><div class="btn-group btn-group-sm">
          <button class="btn btn-madera" data-editar="${u.id}" title="Editar"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-madera" data-contrasena="${u.id}" title="Cambiar contraseña"><i class="bi bi-key"></i></button>
          ${u.id === yo.id ? '' : u.activo
            ? `<button class="btn btn-outline-danger" data-activo="${u.id}" data-valor="0" title="Desactivar"><i class="bi bi-person-slash me-1"></i>Desactivar</button>`
            : `<button class="btn btn-outline-success" data-activo="${u.id}" data-valor="1" title="Activar"><i class="bi bi-person-check me-1"></i>Activar</button>`}
        </div></td></tr>`).join('')}</tbody></table>`;
  }
  async function cargar() { try { lista = await api('/api/usuarios'); pintar(); } catch (e) { TDM.error(e); } }

  function abrir(u) {
    formU.reset();
    formU.registro_id.value = u ? u.id : '';
    document.getElementById('tituloModal').textContent = u ? 'Editar usuario' : 'Nuevo usuario';
    document.getElementById('grupoContrasena').hidden = !!u;
    if (u) for (const k of ['nombre', 'usuario', 'correo']) formU[k].value = u[k] || '';
    modalU.show();
  }
  document.getElementById('btnNuevo').addEventListener('click', () => abrir(null));

  formU.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = TDM.formJson(formU);
    const rid = d.registro_id; delete d.registro_id;
    if (rid) delete d.contrasena;
    try {
      await TDM.conBoton(formU.querySelector('[type=submit]'), () => api(rid ? `/api/usuarios/${rid}` : '/api/usuarios', { method: rid ? 'PUT' : 'POST', body: d }));
      modalU.hide(); TDM.aviso('Usuario guardado'); cargar();
    } catch (e) { TDM.error(e); }
  });

  formC.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const d = TDM.formJson(formC);
    if (d.contrasena !== document.getElementById('cNueva2').value) { TDM.aviso('Las contraseñas no coinciden.', 'error'); return; }
    try {
      await TDM.conBoton(formC.querySelector('[type=submit]'), () => api(`/api/usuarios/${d.registro_id}/contrasena`, { method: 'PUT', body: { contrasena: d.contrasena } }));
      modalC.hide(); TDM.aviso('Contraseña actualizada');
    } catch (e) { TDM.error(e); }
  });

  document.getElementById('lista').addEventListener('click', async (ev) => {
    const ed = ev.target.closest('[data-editar]');
    const pw = ev.target.closest('[data-contrasena]');
    const ac = ev.target.closest('[data-activo]');
    if (ed) abrir(lista.find((u) => u.id === Number(ed.dataset.editar)));
    if (pw) {
      const u = lista.find((x) => x.id === Number(pw.dataset.contrasena));
      formC.reset(); formC.registro_id.value = u.id;
      document.getElementById('contrasenaDe').textContent = `Cuenta: ${u.nombre} (@${u.usuario})`;
      modalC.show();
    }
    if (ac) {
      const u = lista.find((x) => x.id === Number(ac.dataset.activo));
      const activar = ac.dataset.valor === '1';
      if (!activar && !(await TDM.confirmar(`${u.nombre} ya no podrá entrar al sistema hasta que alguien vuelva a activar su cuenta.`, { titulo: 'Desactivar cuenta', boton: 'Sí, desactivar' }))) return;
      try { await api(`/api/usuarios/${u.id}/activo`, { method: 'PUT', body: { activo: activar } }); TDM.aviso(activar ? 'Cuenta activada' : 'Cuenta desactivada'); cargar(); } catch (e) { TDM.error(e); }
    }
  });
  await cargar();
})();
