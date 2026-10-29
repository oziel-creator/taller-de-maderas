(async function () {
  'use strict';
  const { api } = TDM;
  const formLogin = document.getElementById('formLogin');
  const formSetup = document.getElementById('formSetup');

  function mostrarError(el, msg) { el.textContent = msg; el.hidden = !msg; }

  let estado;
  try { estado = await api('/api/estado', { sinRedireccion: true }); } catch (e) { alert(e.message); return; }
  if (estado.usuario) { location.href = 'inicio.html'; return; }

  if (estado.necesitaConfiguracion) {
    document.getElementById('subtitulo').textContent = 'Configuración inicial';
    formSetup.hidden = false;
    document.getElementById('sNombre').focus();
  } else {
    formLogin.hidden = false;
    document.getElementById('lUsuario').focus();
  }

  formLogin.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = document.getElementById('errorLogin');
    mostrarError(err, '');
    const datos = TDM.formJson(formLogin);
    if (!datos.usuario || !datos.contrasena) return mostrarError(err, 'Escribe tu usuario y contraseña.');
    try {
      await api('/api/login', { method: 'POST', body: datos, sinRedireccion: true });
      location.href = 'tablero.html';
    } catch (e) { mostrarError(err, e.message); }
  });

  formSetup.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const err = document.getElementById('errorSetup');
    mostrarError(err, '');
    const datos = TDM.formJson(formSetup);
    if (datos.contrasena !== document.getElementById('sContrasena2').value) return mostrarError(err, 'Las contraseñas no coinciden.');
    try {
      await api('/api/configuracion-inicial', { method: 'POST', body: datos, sinRedireccion: true });
      location.href = 'inicio.html';
    } catch (e) { mostrarError(err, e.message); }
  });
})();
