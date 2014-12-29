
function sam(filedata) {
  this.parse = function(filedata) {
    var refs = {};

    var lines = filedata.split('\n');

    var edges = [];
    for(var f = 0; f < lines.length; f++) {
      if(lines[f].length == 0) continue;

      var fields = lines[f].split(/\s+/); // whitespace

      // parse headers, reference dictionary
      // @SQ SN:ref LN:45
      if (fields[0].charAt(0) == '@') {
        if (fields[0] == "@SQ") { // reference sequence
          var name = null;
          var len = null;
          for (var i = 1; i < fields.length; i++) {
            if (fields[i].substring(0,2) == "SN") {
              name = fields[i].substring(3);
            } else if (fields[i].substring(0,2) == "LN") {
              len = parseInt(fields[i].substring(3));
            }
            if (name != null && len != null) {
              refs[name] = len;
              break;
            }
          }
        }
        continue;
      }

      var flag = parseInt(fields[1]);
      if(flag & 3 != 3) { // bits 0 and 1 (paired and aligned)
        continue;
      }

      var qname = fields[0]; // QNAME
      var tname = fields[2]; // RNAME
      var pair_qname = fields[6]; // RNEXT

      // if names of paired reads don't match, make them match
      // in all likelihood, they are the same, or the same plus .1 and .2 or /1 and /2
      if(pair_qname != '=' && pair_qname != qname) {
        if(qname.substring(0, qname.length - 2) == pair_qname.substring(0, pair_qname.length - 2)) {
          qname = qname.substring(0, qname.length - 2);
        }
        else {
          console.log("Cannot match pair names: " + qname + ", " + pair_qname);
          continue;
        }
      }

      if(qname == tname) {
        // perfect self-alignment
        return null;
      }

      var qlen = fields[9].length; // SEQ

      var tstart = parseInt(fields[3]); // POS
      var tlen = parseInt(fields[8]); // TLEN
      var pos;
      if(tlen < 0) { // rightmost fragment
        tlen = -1 * tlen;
        pos = tlen - qlen;
      } else { // leftmost fragment
        pos = 0;
      }

      var strand = 0
      if(flag & Math.pow(2, 4) > 0) { // 5th bit, reverse?
        strand = 1;
      }

      var mapq = parseInt(fields[4]); // MAPQ (Phred quality)
      var identity = (1 - Math.pow(10, mapq/-10)) * 100; // % identity

      // Edge(qname, qstrand, qstart, qend, qlen, tname, tstrand, tstart, tend, tlen, score, identity)
      var e = new Edge(
        qname,
        strand,  // qstrand
        pos,  // qstart
        pos + qlen,  // qend
        tlen,  // qlen
        tname,
        0,  // tstrand (assumed reference-strand)
        tstart,  // tstart
        tstart + qlen, // tend
        refs[tname], // tlen
        mapq,  // score
        identity // pctSimilarity
      );

      if (e) {
        edges.push(e);
      }
    }
    return edges;
  }

  return this.parse(filedata);

}
