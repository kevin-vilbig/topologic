var setActiveDimension = Module.cwrap ('setActiveDimension', 'number', ['number']);
var forceRedraw = Module.cwrap('forceRedraw', null, []);
var setFlameColouring = Module.cwrap('setFlameColouring', null, ['number']);
var setViewportSize = Module.cwrap('setViewportSize', null, ['number','number']);
var resetColourMap = Module.cwrap('resetColourMap', null, []);
var getJSON = Module.cwrap('getJSON', 'string', []);
var getSVG = Module.cwrap('getSVG', 'string', []);
var parseJSON = Module.cwrap('parseJSON', null, ['string']);
var interpretDrag = Module.cwrap('interpretDrag', 'number', ['number','number','number']);
var getModels = Module.cwrap('getModels', 'string', []);
var initialiseGL = Module.cwrap('initialiseGL', 'number', []);

var topologicMaxDepth = 7;
var topologicActiveDimension=3;

var topologicFlameColouring=false;

var topologicIgnoreHashChange = false;
var originalSettings = JSON.parse(getJSON());
var settings = {};

function parseHash() {
  if (topologicIgnoreHashChange) return;

  var json = window.location.hash.substring(1);
  try {
    JSON.parse(json);
    parseJSON(json);
  } catch (e) {
    try {
      console.error(e);
      json = decodeURIComponent(json);
      JSON.parse(json);
      parseJSON(json);
    } catch (e) {
      console.log(e);
    }
  }
  forceRedraw();

  settings = JSON.parse(getJSON());

  for (s in settings) {
    $('#' + s).val(settings[s]);
  }

  try {
    $('input[data-type=range]').slider('refresh');
    $('select').selectmenu('refresh', true);
  } catch (e) {
    console.error(e);
  }
//  topologicIFSFlameColouring = val['flameColouring'];
}

$(window).hashchange(parseHash);

function topologicUpdateDimension() {
    var output = document.getElementById('activeDimension');
    if (output)
    {
        output.textContent=topologicActiveDimension;
    }
    setActiveDimension(topologicActiveDimension);
}

function topologicUpdateCurrentModel() {
    setFlameColouring(topologicFlameColouring);

    forceRedraw();

    topologicIgnoreHashChange = true;
    window.location.hash = getHash();
    topologicIgnoreHashChange = false;
}

function arrayEquals (a, b) {
  if (Array.isArray(a)) {
    if (Array.isArray(b)) {
      if (a.length === b.length) {
        for (j in a) {
          if (!arrayEquals(a[j], b[j])) {
            return false;
          }
        }
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  } else {
    return a == b;
  }
}

function getHash() {
  var data = JSON.parse(getJSON());

  for (i in data) {
    if (arrayEquals(originalSettings[i], data[i])) {
      delete data[i];
    } else if ((i === 'camera') || (i === 'transformation')) {
      var t = [];
      for (k in data[i]) {
        if (!arrayEquals(originalSettings[i][k], data[i][k])) {
          t.push(data[i][k]);
        }
      }
      data[i] = t;
    }
  }

  return JSON.stringify(data);
}

function updateHash(silent) {
    silent = typeof silent !== 'undefined' ? silent : true;

    topologicIgnoreHashChange = silent;
    window.location.hash = getHash();
    topologicIgnoreHashChange = !silent;
}

function getLink() {
  return 'https://dee.pe/r:' + encodeURIComponent(getHash());
}

function getEmbed() {
  return '<iframe height="720" width="1280" src=\'' + getLink() + '\'></iframe>'
       + '<!-- iframe code generated by Topologic/V10; hosted on https://ef.gy/ -->';
}

function updateSettings() {
  parseJSON(JSON.stringify(settings));
  updateHash();
}

function downloadFile(name, mime, data) {
  var link = document.createElement('a');
  link.setAttribute('href', 'data:' + name + ';charset=utf-8,' + encodeURIComponent(data));
  link.setAttribute('download', name);
  link.click();
}

function downloadSVG() {
  downloadFile(settings['depth'] + '-' + settings['model'] + '.svg', 'image/svg+xml', getSVG());
  $(window).resize();
}

function showSVG() {
  location.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(getSVG());
}

$(document).ready(function() {
  $('select').selectmenu();
  models = JSON.parse(getModels());
  models['models'].forEach(function(value) {
    $('#model').append($('<option></option>').text(value));
  });
  models['formats'].forEach(function(value) {
    $('#coordinateFormat').append($('<option></option>').text(value));
  });

  $('input[data-type=range]').slider();
  $('select').selectmenu('refresh');

  if (window.location.hash == '') {
    window.setTimeout(function(){$('#help').panel('open')},200);
  }
  parseHash();

  for (s in settings) (function(s) {
    $('#' + s).change(function() {
      console.log(s, '=', $(this).val());
      settings[s] = $(this).val();
      if (typeof originalSettings[s] === 'number') {
        settings[s] = parseFloat(settings[s]);
      }
      updateSettings();
    });
  })(s);

  var x, y;
  $('#canvas').on({ 'touchstart' : function(ev) {
    ev = ev.originalEvent.touches[0];
    x = ev.clientX;
    y = ev.clientY;
  }});

  $('#canvas').on({ 'touchmove' : function(ev) {
    ev = ev.originalEvent.touches[0];

    interpretDrag(ev.clientX - x, ev.clientY - y, 0);

    x = ev.clientX;
    y = ev.clientY;

    forceRedraw();
  }});

  $(window).resize(function() {
    var canvas = document.getElementById('canvas');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    setViewportSize(canvas.width, canvas.height);
  });

  /* try to find out if we have WebGL;
     see http://get.webgl.org/ for the source of this detection method. */

  var gl = null;
  try {
    gl = canvas.getContext("webgl");
  } catch (x) {
    gl = null;
  }

  if (gl == null) {
    try {
      gl = canvas.getContext("experimental-webgl");
      experimental = true;
    } catch (x) {
      gl = null;
    }
  }

  if (gl) {
    initialiseGL();
    $(window).resize();
  } else {
    /* uh-oh! */
    console.error('Sorry, it seems your browser does not support WebGL!');
    showSVG();
  }

  $(document).on('touchmove', function(e) {
    if (!$(e.target).parents('.ui-panel-inner')[0]) {
      e.preventDefault();
    }
  });
});
