
function m4(filedata) {
  this.parse = function(filedata) {
    var lines = filedata.split('\n');

    var edges = [];
    for(var f = 0; f < lines.length; f++) {
      if(lines[f].length == 0) continue;
      var e = m4Alignment(lines[f]);
      if (e) {
        edges.push(e);
      }
    }
    return edges;
  }

  return this.parse(filedata);
}

function m4Alignment(data) {

  var fields = data.split(' ');

  var qname = fields[0];
  var tname = fields[1];

  // remove /0_<len> from self-alignment names
  if(qname.lastIndexOf('/0_') > -1) {
    qname = qname.substring(0, qname.lastIndexOf('/0_'));
  }

  if(qname == tname) {
    // perfect self-alignment
    return null;
  }

  // Edge(qname, qstrand, qstart, qend, qlen, tname, tstrand, tstart, tend, tlen, score, identity)
  var e = new Edge(
    qname,
    parseInt(fields[4]),  // qstrand
    parseInt(fields[5]),  // qstart
    parseInt(fields[6]),  // qend
    parseInt(fields[7]),  // qlen
    tname,
    parseInt(fields[8]),  // tstrand
    parseInt(fields[9]),  // tstart
    parseInt(fields[10]), // tend
    parseInt(fields[11]), // tlen
    parseInt(fields[2]),  // score
    parseFloat(fields[3]) // pctSimilarity
  );

  return e;
}
