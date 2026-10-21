/* ==========================================================================
   Mini grafico a linea in SVG puro, senza librerie esterne.
   ========================================================================== */
(function (global) {
  'use strict';

  function lineChart(points, dateKey, valueKey, unit) {
    var data = (points || [])
      .map(function (p) { return { d: p[dateKey], v: parseFloat(p[valueKey]) }; })
      .filter(function (p) { return p.d && !isNaN(p.v); });

    if (data.length < 2) {
      if (data.length === 1) {
        return '<p style="color:var(--txt-mute);font-size:.85rem">Ultimo valore: ' + data[0].v + ' ' + (unit || '') +
          ' (' + data[0].d + '). Servono almeno 2 misurazioni per il grafico.</p>';
      }
      return '<p style="color:var(--txt-mute);font-size:.85rem">Nessun dato ancora disponibile.</p>';
    }

    var W = 600, H = 200, PAD = 30;
    var values = data.map(function (p) { return p.v; });
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (min === max) { min -= 1; max += 1; }

    var stepX = (W - PAD * 2) / (data.length - 1);
    var coords = data.map(function (p, i) {
      var x = PAD + i * stepX;
      var y = H - PAD - ((p.v - min) / (max - min)) * (H - PAD * 2);
      return { x: x, y: y, v: p.v, d: p.d };
    });

    var pathD = coords.map(function (c, i) { return (i === 0 ? 'M' : 'L') + c.x.toFixed(1) + ',' + c.y.toFixed(1); }).join(' ');

    var dots = coords.map(function (c) {
      return '<circle cx="' + c.x.toFixed(1) + '" cy="' + c.y.toFixed(1) + '" r="4" fill="#FF4A16">' +
        '<title>' + c.d + ': ' + c.v + ' ' + (unit || '') + '</title></circle>';
    }).join('');

    var firstLabel = '<text x="' + PAD + '" y="' + (H - 6) + '" font-size="10" fill="#8E8E9A">' + coords[0].d + '</text>';
    var lastLabel = '<text x="' + (W - PAD) + '" y="' + (H - 6) + '" font-size="10" fill="#8E8E9A" text-anchor="end">' + coords[coords.length - 1].d + '</text>';

    return '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;max-width:640px;height:auto">' +
      '<path d="' + pathD + '" fill="none" stroke="#FF4A16" stroke-width="2.5"/>' +
      dots + firstLabel + lastLabel + '</svg>';
  }

  global.DTCharts = { lineChart: lineChart };
})(window);
