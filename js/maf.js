
function maf(filedata) {
  this.parse = function(filedata) {
    var lines = filedata.split('\n');

    var edges = [];
    var score = null;
    var query = null;

    for(var f = 0; f < lines.length; f++) {
      if(lines[f].length == 0 || lines[f].charAt(0) == '#') continue;

      var fields = lines[f].split(/\s+/); // indeterminate whitespace

      if (fields.length == 0) {
        score = null;
        query = null;
        continue;
      }

      if(fields[0] == 'a') {
        for(var i = 1; i < fields.length; i++) {
          if(fields[i].length > 6 && fields[i].substring(0,6) == "score=") {
            score = -1 * parseInt(fields[1].substring(6)); // reverse scores so that lower is better
            query = null;
            break;
          }
        }
        continue;
      }

      if(fields[0] == 's') {
        var name = fields[1];
        var start = parseInt(fields[2]);
        var end = start + parseInt(fields[3]);
        var strand = (fields[4] == '+' ? 0 : 1);
        var length = parseInt(fields[5]);

        if (!query) {
          query = [name, start, end, strand, length];
          continue;
        }

        if(score != null && query != null) {
          if(name == query[0]) {
            // perfect self-alignment
            score = null;
            query = null;
            continue
          }

          // Edge(qname, qstrand, qstart, qend, qlen, tname, tstrand, tstart, tend, tlen, score, identity)
          var e = new Edge(
            query[0],
            query[3],  // qstrand
            query[1],  // qstart
            query[2],  // qend
            query[4],  // qlen
            name,
            strand,  // tstrand
            start,  // tstart
            end, // tend
            length, // tlen
            score,  // score
            // have to scan through the alignment strings to find this out, don't do it right now.
            100 // pctSimilarity
          );

          edges.push(e);

          score = null;
          query = null;
        }
      }
    }
    return edges;
  }

  return this.parse(filedata);
}
