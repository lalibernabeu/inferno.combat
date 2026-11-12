/* ===== INFERNO COMBAT APP ===== */

const CONFIG = {
  telefono: '5492617078248',
  mensaje: '¡Hola! Quisiera consultar por las clases de Inferno Combat.',
  horariosURL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSoAWyYrDN7ZTbr_KVn-xP7pxzD90NhHKFYxbBUa32RY2gnxCJa7g6XjFNHC_qlhyM_VqVewIxPiTmG/pub?gid=1745678176&single=true&output=csv',
  profesURL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ7AReUWDs5xp5zwsVSd18zhgxEXE5lQwB4M55TLEamudoYUod2Udz8LdBhGp9akK9sX2dHv130KxFd/pub?gid=1251663318&single=true&output=csv'
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function el(tag, props = {}, ...hijos) {
  const e = document.createElement(tag);
  for (const k in props) {
    k === 'class' ? e.className = props[k] : e.setAttribute(k, props[k]);
  }
  hijos.forEach(h => {
    if (h != null) e.append(h);
  });
  return e;
}

function parseCSV(t) {
  const rows = [];
  let row = [], f = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') { f += '"'; i++; } else q = false;
      } else f += c;
    } else if (c === '"') {
      q = true;
    } else if (c === ',') {
      row.push(f); f = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(f); f = ''; rows.push(row); row = [];
    } else {
      f += c;
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...r] = rows.filter(x => x.some(v => v.trim()));
  if (!h) return [];
  const keys = h.map(k => norm(k));
  return r.map(x => Object.fromEntries(keys.map((k, i) => [k, (x[i] || '').trim()])));
}

async function cargar(url, local) {
  const r = await fetch(url || local, { cache: 'no-store' });
  if (!r.ok) throw new Error(r.status);
  return parseCSV(await r.text());
}

/* WhatsApp */
function initWhatsApp() {
  document.querySelectorAll('[data-wa]').forEach(a => {
    const msg = a.dataset.msg || CONFIG.mensaje;
    a.href = `https://wa.me/${CONFIG.telefono}?text=${encodeURIComponent(msg)}`;
    a.target = '_blank';
    a.rel = 'noopener';
  });
}

/* Horarios */
const tipo = c => {
  const n = norm(c);
  if (/nin|kid/.test(n)) return 'kids';
  if (/kick/.test(n)) return 'kick';
  if (/box/.test(n)) return 'box';
  if (/hook/.test(n)) return 'hook';
  if (/k-?1/.test(n)) return 'k1';
  if (/muay/.test(n)) return 'muay';
  return 'otro';
};

const hora = h => {
  const [a, b = '00'] = h.split(':');
  return a.padStart(2, '0') + ':' + b.padStart(2, '0');
};

const mas1 = h => String((parseInt(h, 10) + 1) % 24).padStart(2, '0') + h.slice(2);

function pintarHorarios(filas) {
  const porDia = {};
  DIAS.forEach(d => porDia[norm(d)] = []);
  filas.forEach(f => {
    const k = norm(f.dia || '');
    if (porDia[k] && f.clase) porDia[k].push({ ...f, hora: hora(f.hora) });
  });
  Object.values(porDia).forEach(l => l.sort((a, b) => a.hora.localeCompare(b.hora)));

  const hoy = new Date().getDay();
  let activo = hoy === 0 ? 0 : hoy - 1;
  const tabs = document.getElementById('dias');
  const lista = document.getElementById('clases');
  if (!tabs || !lista) return;

  function mostrar(i) {
    activo = i;
    [...tabs.children].forEach((b, j) => b.setAttribute('aria-selected', j === i));
    lista.replaceChildren();
    const clases = porDia[norm(DIAS[i])];
    if (!clases.length) {
      lista.append(el('li', { class: 'vacio' }, 'Este día no hay clases.'));
      return;
    }
    clases.forEach(c => {
      const info = el('div', {}, el('strong', {}, c.clase));
      if (c.profe) info.append(el('em', {}, 'Profe: ' + c.profe));
      lista.append(el('li', { class: 'clase', 'data-tipo': tipo(c.clase) },
        el('div', { class: 'hora' }, c.hora, el('span', {}, 'a ' + mas1(c.hora))), info));
    });
  }

  DIAS.forEach((d, i) => {
    const b = el('button', { role: 'tab', type: 'button' }, d);
    if (i === (hoy === 0 ? 0 : hoy - 1) && hoy !== 0) b.append(el('small', {}, 'hoy'));
    b.addEventListener('click', () => mostrar(i));
    tabs.append(b);
  });
  mostrar(activo);
}

/* Procesar fotos (admite archivos locales, URLs directas y enlaces comunes de Google Drive) */
function procesarFoto(url, nombre) {
  const fotosPorDefecto = {
    'esteban diaz': 'images/profes/profeToro.png',
    'abdon toledo': 'images/profes/profeLudus.png',
    'victoria perez': 'images/profes/profeVicky.png'
  };

  if (!url) {
    return fotosPorDefecto[norm(nombre)] || null;
  }

  url = url.trim();

  // Si pegan cualquier link de Google Drive, extraemos el ID automáticamente
  const matchDrive = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchDrive && matchDrive[1]) {
    return `https://lh3.googleusercontent.com/d/${matchDrive[1]}`;
  }

  // Si ya es una URL externa completa
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Si es una ruta relativa con carpeta
  if (url.includes('/')) {
    return url;
  }

  // Si es solo el nombre de archivo (ej: 'profeToro.png')
  return 'images/profes/' + url;
}

/* Profesores - Estilo glorioso */
function pintarProfes(filas) {
  const cont = document.getElementById('profes');
  if (!cont) return;
  cont.replaceChildren();

  filas.filter(p => p.nombre).forEach(p => {
    const fotoSrc = procesarFoto(p.foto, p.nombre);

    let foto;
    if (fotoSrc) {
      foto = el('img', { class: 'foto', src: fotoSrc, alt: 'Foto de ' + p.nombre, loading: 'lazy' });
      // Si por alguna razón la imagen externa falla o se borra, mostramos las iniciales con estilo
      foto.addEventListener('error', () => {
        const iniciales = p.nombre.split(' ').map(x => x[0]).slice(0, 2).join('');
        const fallback = el('div', { class: 'foto', 'aria-hidden': 'true' }, iniciales);
        foto.replaceWith(fallback);
      });
    } else {
      foto = el('div', { class: 'foto', 'aria-hidden': 'true' }, p.nombre.split(' ').map(x => x[0]).slice(0, 2).join(''));
    }

    const card = el('article', { class: 'profe' });

    // Foto envuelta en ring
    const fotoWrap = el('div', { class: 'foto-wrap' }, foto);
    card.append(fotoWrap);

    // Cabecera con nombre y apodo
    const headerInfo = el('div', { class: 'profe-header' });
    headerInfo.append(el('h3', {}, p.nombre));
    if (p.apodo) {
      headerInfo.append(el('p', { class: 'apodo' }, '“' + p.apodo + '”'));
    }
    card.append(headerInfo);

    // Palmarés / Títulos gloriosos con iconos temáticos
    const titulos = (p.titulo || '').split('|').map(t => t.trim()).filter(Boolean);
    if (titulos.length) {
      const logrosWrap = el('div', { class: 'profe-logros' });
      const ul = el('ul', { class: 'lista-logros' });
      titulos.forEach(t => {
        let icono = '🏆';
        const tMin = t.toLowerCase();
        if (tMin.includes('cinturón') || tMin.includes('cinturon')) icono = '🥋';
        else if (tMin.includes('boxeo') || tMin.includes('guante')) icono = '🥊';
        else if (tMin.includes('dirección') || tMin.includes('entrenador') || tMin.includes('profesor')) icono = '⚡';

        ul.append(el('li', {},
          el('span', { class: 'logro-ico' }, icono),
          el('span', { class: 'logro-txt' }, t)
        ));
      });
      logrosWrap.append(ul);
      card.append(logrosWrap);
    }

    // Disciplinas en tags/chips
    if (p.disciplinas) {
      const chips = p.disciplinas.split(/[·,]/).map(d => d.trim()).filter(Boolean);
      if (chips.length) {
        const chipsWrap = el('div', { class: 'profe-chips' });
        chips.forEach(c => chipsWrap.append(el('span', { class: 'chip' }, c)));
        card.append(chipsWrap);
      }
    }

    cont.append(card);
  });
}

/* Lightbox para Instalaciones y Equipamientos */
function initLightbox() {
  const items = document.querySelectorAll('.galeria-item');
  if (!items.length) return;

  // Crear lightbox en el DOM si no existe
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = el('div', { id: 'lightbox', class: 'lightbox', role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true' },
      el('div', { class: 'lightbox-backdrop' }),
      el('div', { class: 'lightbox-contenido' },
        el('button', { class: 'lightbox-cerrar', type: 'button', 'aria-label': 'Cerrar (Esc)' }, '×'),
        el('button', { class: 'lightbox-nav lightbox-prev', type: 'button', 'aria-label': 'Anterior' }, '❮'),
        el('button', { class: 'lightbox-nav lightbox-next', type: 'button', 'aria-label': 'Siguiente' }, '❯'),
        el('img', { class: 'lightbox-img', src: '', alt: '' }),
        el('div', { class: 'lightbox-caption' },
          el('strong', { class: 'lightbox-titulo' }),
          el('span', { class: 'lightbox-bajada' })
        )
      )
    );
    document.body.append(lb);
  }

  const lbImg = lb.querySelector('.lightbox-img');
  const lbTitulo = lb.querySelector('.lightbox-titulo');
  const lbBajada = lb.querySelector('.lightbox-bajada');
  const btnCerrar = lb.querySelector('.lightbox-cerrar');
  const btnPrev = lb.querySelector('.lightbox-prev');
  const btnNext = lb.querySelector('.lightbox-next');
  const backdrop = lb.querySelector('.lightbox-backdrop');

  let indiceActual = 0;

  function mostrarImagen(i) {
    if (i < 0) i = items.length - 1;
    if (i >= items.length) i = 0;
    indiceActual = i;

    const item = items[indiceActual];
    const img = item.querySelector('img');
    const titulo = item.querySelector('figcaption strong');
    const bajada = item.querySelector('figcaption span');

    if (img) {
      lbImg.src = img.src;
      lbImg.alt = img.alt || '';
    }
    lbTitulo.textContent = titulo ? titulo.textContent : '';
    lbBajada.textContent = bajada ? bajada.textContent : '';
  }

  function abrir(i) {
    mostrarImagen(i);
    lb.classList.add('activo');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function cerrar() {
    lb.classList.remove('activo');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  items.forEach((item, i) => {
    item.addEventListener('click', () => abrir(i));
  });

  btnCerrar.addEventListener('click', cerrar);
  backdrop.addEventListener('click', cerrar);
  btnPrev.addEventListener('click', (e) => { e.stopPropagation(); mostrarImagen(indiceActual - 1); });
  btnNext.addEventListener('click', (e) => { e.stopPropagation(); mostrarImagen(indiceActual + 1); });

  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('activo')) return;
    if (e.key === 'Escape') cerrar();
    if (e.key === 'ArrowLeft') mostrarImagen(indiceActual - 1);
    if (e.key === 'ArrowRight') mostrarImagen(indiceActual + 1);
  });
}

/* Inicialización */
document.addEventListener('DOMContentLoaded', () => {
  initWhatsApp();
  initLightbox();

  cargar(CONFIG.horariosURL, 'horarios.csv')
    .then(pintarHorarios)
    .catch(() => {
      const lista = document.getElementById('clases');
      if (lista) lista.append(el('li', { class: 'vacio' }, 'No pudimos cargar los horarios. Escribinos por WhatsApp y te los pasamos.'));
    });

  cargar(CONFIG.profesURL, 'profes.csv')
    .then(pintarProfes)
    .catch(() => {
      const cont = document.getElementById('profes');
      if (cont) cont.append(el('p', { class: 'vacio' }, 'No pudimos cargar los profesores.'));
    });
});

