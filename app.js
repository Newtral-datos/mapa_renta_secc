document.addEventListener("DOMContentLoaded", function () {
  mapboxgl.accessToken = 'pk.eyJ1IjoibmV3dHJhbCIsImEiOiJjazJrcDY4Y2gxMmg3M2JvazU4OXV6NHZqIn0.VO5GkvBq_PSJHvX7T8H9jQ';
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/newtral/cmfcdokcl006f01sd20984lhq',
    center: [-3.7038, 40.4168],
    zoom: 5
  });

  map.on('error', (e) => {
    const msg = (e && (e.error?.message || e.message)) || e;
    console.error('Mapbox GL JS error:', msg);
  });

  map.on('load', function () {
    const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, className: 'tooltip' });

    const TEXTO_SUP = 'Renta bruta<br>por hogar (2023)';
    const TEXTO_INF = 'Variación<br>en el último lustro';

    const COLORS = ['#c62c58', '#bc5674', '#b3808f', '#aaaaaa', '#87cdbd', '#5fd8ba', '#39e3b7', '#1cf0b5', '#01f3b3'];
    const MIN = 25000, MID = 40000, MAX = 60000;
    const FRACTIONS = [0.00, 0.09, 0.18, 0.27, (MID - MIN) / (MAX - MIN), 0.62, 0.78, 0.90, 1.00];
    const STOPS = FRACTIONS.map(f => MIN + (MAX - MIN) * f);

    const fillColorExpr = ['interpolate', ['linear'], ['to-number', ['get', 'RentaBrHogar23']], ...STOPS.flatMap((s, i) => [s, COLORS[i]])];

    const capa = {
      source: 'geodata_renta_secc-8w75do',
      url: 'mapbox://newtral.dskpc2e1',
      sourceLayer: 'geodata_renta_secc',
      id: 'ispa',
      type: 'fill',
      paint: {
        'fill-color': fillColorExpr,
        'fill-opacity': 0.8,
        'fill-outline-color': '#494949'
      }
    };

    if (!map.getSource(capa.source)) map.addSource(capa.source, { type: 'vector', url: capa.url });
    map.addLayer({ id: capa.id, type: capa.type, source: capa.source, 'source-layer': capa.sourceLayer, paint: capa.paint });

    const capaMono = {
      source: 'no_rentasecc-6qtd9i',
      url: 'mapbox://newtral.5t3ozm8g',
      sourceLayer: 'no_match_renta_secc',
      id: 'mono-gray',
      type: 'fill',
      paint: {
        'fill-color': '#aaaaaa',
        'fill-opacity': 1,
        'fill-outline-color': '#9b9b9b'
      }
    };

    if (!map.getSource(capaMono.source)) map.addSource(capaMono.source, { type: 'vector', url: capaMono.url });
    map.addLayer({ id: capaMono.id, type: capaMono.type, source: capaMono.source, 'source-layer': capaMono.sourceLayer, paint: capaMono.paint }, capa.id);

    const toNum = v => {
      if (v == null) return null;
      const n = parseFloat(String(v).replace(',', '.'));
      return Number.isFinite(n) ? n : null;
    };
    const fmtEuro = v => {
      const n = toNum(v);
      return n == null ? '—' : n.toLocaleString('es-ES', { maximumFractionDigits: 0 }) + ' €';
    };
    const fmtPctSigned = (v, d = 1) => {
      const n = toNum(v);
      if (n == null) return '—';
      const sign = n > 0 ? '+' : (n < 0 ? '−' : '');
      return `${sign}${Math.abs(n).toLocaleString('es-ES', { maximumFractionDigits: d, minimumFractionDigits: d })}%`;
    };

    const hexToRgb = hex => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0];
    };
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
    const lerp = (a, b, t) => a + (b - a) * t;

    function colorForValue(v) {
      if (v == null || !isFinite(v)) return COLORS[3];
      if (v <= STOPS[0]) return COLORS[0];
      if (v >= STOPS[STOPS.length - 1]) return COLORS[COLORS.length - 1];
      for (let i = 0; i < STOPS.length - 1; i++) {
        const s0 = STOPS[i], s1 = STOPS[i + 1];
        if (v >= s0 && v <= s1) {
          const t = (v - s0) / (s1 - s0);
          const [r0, g0, b0] = hexToRgb(COLORS[i]);
          const [r1, g1, b1] = hexToRgb(COLORS[i + 1]);
          return rgbToHex(lerp(r0, r1, t), lerp(g0, g1, t), lerp(b0, b1, t));
        }
      }
      return COLORS[3];
    }

    function textColorForBg(hex) {
      const [r, g, b] = hexToRgb(hex).map(v => v / 255);
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return l < 0.55 ? '#fff' : '#052b1a';
    }

    (function buildLegend() {
      const el = document.getElementById('legend');
      const content = document.getElementById('legend-content');
      if (!el || !content) return;
      const stopsPct = FRACTIONS.map(f => Math.round(f * 100));
      let parts = COLORS.map((c, i) => `${c} ${stopsPct[i]}%`);
      parts[parts.length - 1] = `${COLORS[COLORS.length - 1]} ${stopsPct[stopsPct.length - 1]}%, ${COLORS[COLORS.length - 1]} 100%`;
      const gradient = `linear-gradient(to right, ${parts.join(', ')})`;
      content.innerHTML = `
        <div class="legend-title">Renta bruta por hogar (2023)</div>
        <div class="legend-subtitle">€ por hogar</div>
        <div class="legend-strip" style="background:${gradient};background-repeat:no-repeat"></div>
        <div class="legend-labels">
          <span>${fmtEuro(MIN)}</span><span>${fmtEuro(MID)}</span><span>${fmtEuro(MAX)}</span>
        </div>`;
      el.classList.remove('hidden');
    })();

    (function initSlider() {
      const wrap = document.getElementById('filter');
      const range = document.getElementById('filter-range');
      const out = document.getElementById('filter-value');
      if (!wrap || !range || !out) return;
      wrap.classList.remove('hidden');
      const apply = (val) => {
        const v = Number(val);
        out.textContent = v <= 0 ? 'Todos' : fmtEuro(v);
        if (v <= 0) {
          map.setFilter(capa.id, null);
        } else {
          map.setFilter(capa.id, [
            '>=', ['to-number', ['get', 'RentaBrHogar23']], v
          ]);
        }
      };
      range.addEventListener('input', (e) => apply(e.target.value));
      range.addEventListener('change', (e) => apply(e.target.value));
      apply(range.value);
    })();

    function buildPopupHTML(p, eLngLat) {
      const nombre = p.NOMBRE ?? '—';
      const provincia = p.PROVINCIA ?? '—';
      const poblacion = p.POBLACION_TXT ?? '—';
      const distrito = p.DISTRITO ?? '—';
      const seccion = p.SECCION ?? '—';
      const rentaHogarNum = toNum(p.RentaBrHogar23);
      const rentaHogar = fmtEuro(rentaHogarNum);
      const varRentaHogar = fmtPctSigned(p['VarRentaHogar_%']);
      const pctVal = toNum(p.PERCENTIL_RentaBrHogar23);
      const rentBlockBg = colorForValue(rentaHogarNum);
      const rentBlockFg = textColorForBg(rentBlockBg);
      let pctLinea = '—';
      if (pctVal !== null) {
        const pct = Math.max(0, Math.min(100, pctVal));
        if (pct < 50) {
          pctLinea = `Está entre el ${Math.round(pct)}% más pobres de España`;
        } else if (pct > 50) {
          const pctRicos = Math.round(100 - pct);
          pctLinea = `Está entre el ${pctRicos === 0 ? 1 : pctRicos}% más ricos de España`;
        } else {
          pctLinea = 'Se mantiene en la mediana nacional';
        }
      }
      const html = `
        <div class="popup-card" style="max-width:270px;padding:9px;">
          <div class="popup-header" style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:8px;">
            <h3 class="popup-title" style="font-size:17px;line-height:1.2;margin:0;flex:1;max-width:70%;word-break:break-word;">${nombre}</h3>
            <div class="popup-provincia" style="font-size:11.5px;margin-top:2px;white-space:nowrap;flex-shrink:0;">${provincia}</div>
          </div>
          <div class="popup-sub" style="font-size:11px;margin-bottom:4px;">
            <div>(${distrito} - ${seccion})</div>
            <div>${poblacion} hab.</div>
            <div style="height:1px;background:#ddd;margin-top:4px;"></div>
          </div>
          <div class="popup-body" style="display:grid;grid-template-columns:1fr 68px;grid-auto-rows:68px;gap:5px;align-items:center;">
            <div class="popup-texto" style="font-size:12px;line-height:1.2;">${TEXTO_SUP}</div>
            <div class="value-block" style="width:68px;height:68px;border-radius:3px;display:flex;align-items:center;justify-content:center;background:${rentBlockBg};color:${rentBlockFg};">
              <div style="font-size:13.5px;font-weight:800;">${rentaHogar}</div>
            </div>
            <div class="popup-texto" style="font-size:12px;line-height:1.2;">${TEXTO_INF}</div>
            <div class="value-block" style="width:68px;height:68px;border-radius:3px;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;">
              <div style="font-size:13.5px;">${varRentaHogar}</div>
            </div>
          </div>
          <div class="popup-footer" style="font-size:12px;padding:5px 7px;margin-top:6px;background:#3f3f3f;color:#fff;border-radius:3px;text-align:center;">
            ${pctLinea}
          </div>
        </div>
      `;
      popup.setLngLat(eLngLat).setHTML(html).addTo(map);
    }

    function attachPopup(layerId) {
      map.on('mousemove', layerId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        map.getCanvas().style.cursor = 'pointer';
        buildPopupHTML(f.properties || {}, e.lngLat);
      });
      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
      });
    }

    attachPopup(capa.id);
    attachPopup(capaMono.id);

    if (typeof MapboxGeocoder === 'function') {
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken,
        mapboxgl,
        placeholder: "         Buscar municipio…",
        marker: false
      });
      map.addControl(geocoder, 'top-right');
    }
  });
});
