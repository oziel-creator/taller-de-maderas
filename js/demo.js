// Modo demostración: simula el servidor para ver las pantallas desde el celular.
(function(){
  var real = window.fetch;
  var usuario = {id:1, nombre:'Demo', usuario:'demo', rol:'admin'};
  window.fetch = function(url, o){
    url = String(url);
    if (url.indexOf('/api/') === -1) return real.apply(this, arguments);
    var m = (o && o.method) || 'GET', d;
    if (url.indexOf('/api/estado') !== -1) d = {usuario: usuario, demo: true};
    else if (m === 'GET') d = [];
    else d = {ok: true, usuario: usuario};
    return Promise.resolve(new Response(JSON.stringify(d), {status:200, headers:{'Content-Type':'application/json'}}));
  };
})();
