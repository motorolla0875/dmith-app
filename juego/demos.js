// Datos de ejemplo: los usa la portada (demos en vivo) y el editor (punto de partida de cada plantilla).
window.DEMOS = {
  amor: {
    para: 'Sofi', de: 'Diego', titulo: '', objeto: 'corazon', meta: 15,
    color: '#ff4f7b', fondo1: '#2b0f3a', fondo2: '#7a1f5c', tema: 'noche',
    frases: ['¡Vas bien!', 'Ya casi...', '¡Último empujón!'],
    mensaje: 'Cada día con vos es mi parte favorita.\nGracias por hacerme reír y por elegirme.\nTe amo.',
    pregunta: '¿Querés salir a cenar conmigo este sábado?', respuesta_si: '¡Sábado 21 hs, te paso a buscar!',
    foto: '/juego/img/demo-amor.jpg'
  },
  cumple: {
    para: 'Tomi', de: 'tu familia', titulo: '', objeto: 'globo', meta: 15,
    color: '#ff9f1c', fondo1: '#10224a', fondo2: '#2f4fa8', tema: 'fiesta',
    frases: ['¡Bien ahí!', '¡Seguí así!', '¡Ya casi!'],
    mensaje: '¡Feliz cumple!\nQue este año te traiga mucha risa, aventuras y torta.\nTe queremos un montón.',
    pregunta: '', respuesta_si: '',
    foto: '/juego/img/demo-cumple.jpg'
  },
  ruleta: {
    local: 'Café Aurora', titulo: 'Girá y ganá', color: '#f2b65a', fondo: '#2b1a12', instagram: '',
    prefijo: 'AUR', vence: 'Válido hoy, presentando esta pantalla en caja.', una_por_dia: true,
    premios: [
      { texto: '10% OFF', peso: 30 }, { texto: 'Café gratis', peso: 6 }, { texto: 'Seguí participando', peso: 25, pierde: true },
      { texto: '2x1 medialunas', peso: 15 }, { texto: '15% OFF', peso: 10 }, { texto: 'Seguí participando', peso: 25, pierde: true },
      { texto: 'Torta del día', peso: 3 }, { texto: 'Topping gratis', peso: 20 }
    ],
    logo: '/juego/img/demo-logo.png'
  }
};
window.PRECIOS = {
  amor:   { nombre: 'Juego de amor', precio: 14990, linea: 'Su foto atrapa corazones y al final aparece tu mensaje. Con pregunta incluida: el NO se escapa.' },
  cumple: { nombre: 'Juego de cumpleaños', precio: 12990, linea: 'Atrapa globos con su cara y gana su saludo, con confeti y todo.' },
  ruleta: { nombre: 'Ruleta de premios', precio: 24990, mensual: true, linea: 'Para tu local: los clientes escanean un QR, giran y ganan un cupón. Vos elegís los premios.' }
};
window.pesos = n => '$' + n.toLocaleString('es-AR');
