
function AlignmentGraph(raw_edges) {

  this.identity = 0.98;
  this.overlap = 1;
  this.edge_dist = 50;
  this.containment_tolerance = 50;

  /*
   * Filter out nodes largely (if not completely) contained within
   * other nodes
   * - at the same time, count existing nodes before and after filter
   */

  this.filter_contained = function(edges) {
    var nodes = {};
    var n = 0;
    var contained = {};
    var c = 0;

    for(var e = 0; e < edges.length; e++) {

      if(!nodes[edges[e].query.name]) {
        nodes[edges[e].query.name] = true;
        n += 1;
      }
      if(!nodes[edges[e].target.name]) {
        nodes[edges[e].target.name] = true;
        n += 1;
      }
      if (!contained[edges[e].query.name] && edges[e].query.length - (edges[e].query.alignEnd - edges[e].query.alignStart) < this.containment_tolerance) {
        contained[edges[e].query.name] = true;
        c += 1;
      }
      if (!contained[edges[e].target.name] && edges[e].target.length - (edges[e].target.alignEnd - edges[e].target.alignStart) < this.containment_tolerance) {
        contained[edges[e].target.name] = true;
        c += 1;
      }
    }

    console.log(n + " total nodes");
    console.log(c + " contained nodes");
    console.log((n-c) + " remaining");

    uncontained = [];
    for(var e = 0; e < edges.length; e++) {
      if(!contained[edges[e].query.name] && !contained[edges[e].target.name]) {
        uncontained.push(edges[e]);
      }
    }

    return uncontained;
  }


  /*
   * Symmetricalize
   * - create mirror image target/query edges
   * and
   * Normalize
   * - move query to reference strand, adjusting target to match
   */

  this.normalize_symmetricalize = function(edges) {
    var overlaps = {};
    for (var e = 0; e < edges.length; e++) {
      var al = edges[e];
      if (!overlaps[al.query.name]) {
        overlaps[al.query.name] = [];
      }
      overlaps[al.query.name].push(al);
      if (!overlaps[al.target.name]) {
        overlaps[al.target.name] = [];
      }
      overlaps[al.target.name].push(new Edge(
        al.target.name,       // qname
        (al.target.strand == 1 ? 0 : 1),     // qstrand
        (al.target.strand == 1 ? al.target.length - al.target.alignEnd : al.target.alignStart), // qstart
        (al.target.strand == 1 ? al.target.length - al.target.alignStart : al.target.alignEnd),   // qend
        al.target.length,     // qlen
        al.query.name,        // tname
        (al.target.strand == 1 ? 1 - al.query.strand : al.query.strand),     // tstrand
        (al.target.strand == 1 ? al.query.length - al.query.alignEnd : al.query.alignStart), // tstart
        (al.target.strand == 1 ? al.query.length - al.query.alignStart : al.query.alignEnd),   // tend
        al.query.length,     // tlen
        al.score,            // score
        al.identity          // pctSimilarity
      ));
    }
    return overlaps;
  }


  /*
   * Create filtered set of edges, depending on threshold values
   */

  this.filter = function() {
    console.log("Filtering edges");

    this.filtered_edges = [];

    for(query in overlaps) {

      var edges = overlaps[query];
      targets_3prime = [];
      targets_5prime = [];
      for(var e = 0; e < edges.length; e++) {
        if (edges[e].identity < this.identity || edges[e].overlap < this.overlap) {
          continue;
        }
        if (this.edge_dist == null || edges[e].target.alignStart < this.edge_dist) {
          targets_3prime.push(edges[e]);
        }
        if (this.edge_dist == null || edges[e].query.alignStart < this.edge_dist) {
          targets_5prime.push(edges[e]);
        }
      }

      // -------- CHOOSE ONLY THE BEST ON EACH END BY *SCORE* --------
      // lower score is better (like in m4 files)

      targets_3prime.sort(function(a,b) {return a.score - b.score});
      targets_5prime.sort(function(a,b) {return a.score - b.score});

      if(targets_3prime.length > 0) {
        this.filtered_edges.push(targets_3prime[0]);
      }
      if(targets_5prime.length > 0) {
        this.filtered_edges.push(targets_5prime[0]);
      }
    }

    this.num_edges = this.filtered_edges.length;
    console.log(this.num_edges + " edges to render");
  }


  /*
   * Get all reads adjacent to the given read
   */

  this.adjacencies = function(node) {
    var adjacencies = [];
    for(var e = 0; e < this.filtered_edges.length; e++) {
      var edge = this.filtered_edges[e];
      var a;
      if(edge.query.name == node && edge.target.name != node) {
        adjacencies.push(edge.target.name);
      } else if(edge.target.name == node && edge.query.name != node) {
        adjacencies.push(edge.query.name);
      }
    }
    return adjacencies;
  }

  
  /*
   * Perform necessary filters when data is loaded
   */

  console.log("Removing contained nodes");
  var uncontained_edges = this.filter_contained(raw_edges);

  console.log("Normalizing, symmetricalizing, detecting overlaps");
  var overlaps = this.normalize_symmetricalize(uncontained_edges);
}


/*
 * Generic Edge class
 */

function Edge(qname, qstrand, qstart, qend, qlen, tname, tstrand, tstart, tend, tlen, score, identity) {
  this.query = {
    name: qname,
    strand: qstrand,
    alignStart: qstart,
    alignEnd: qend,
    length: qlen,
    alignedLength: qend - qstart
  }
  this.target = {
    name: tname,
    strand: tstrand,
    alignStart: tstart,
    alignEnd: tend,
    length: tlen,
    alignedLength: tend - tstart
  }
  this.score = score;
  this.identity = identity;

  this.match = (this.query.alignedLength + this.target.alignedLength) * this.identity;
  this.weight = this.match / (this.query.length + this.target.length) * 100;
  this.overlap = (this.query.alignedLength < this.target.alignedLength ? this.query.alignedLength : this.target.alignedLength);
  
  /*
  this.toString = function() {
    return "q " + this.query.alignStart + ":" + this.query.alignEnd + " <-> t " + this.target.alignStart + ":" + this.target.alignEnd + " (matches: " + this.match + ")"
  }
  */
}
