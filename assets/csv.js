window.ArkCSV = (function(){
  function parse(text) {
    var rows = [];
    var lines = text.split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      var row = [], cur = '', inQuote = false;
      for (var j = 0; j < line.length; j++) {
        var c = line[j];
        if (c === '"') { inQuote = !inQuote; }
        else if (c === ',' && !inQuote) { row.push(cur); cur = ''; }
        else { cur += c; }
      }
      row.push(cur);
      rows.push(row);
    }
    return rows;
  }
  return { parse };
})();
