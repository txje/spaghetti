
/*
 * Check WebGL compatibility
 */

var webgl_enabled = true;
try {
  canvas = document.createElement('canvas');
  ctx = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
}
catch (e) {
  console.log("WebGL not available");
  webgl_enabled = false;
}


var first_clicked_read = null;
var second_clicked_read = null;
var alignment_graph; // populated later with .m4 file data
var graph, arbor_graph, viva_graph;


/*
 * File loading
 */

function load_file(file) {
  $("#graph_box").hide();
  if (!file) {
    return null;
  }
  if(file == "data/pr_pr_bn32.m4") {
    // short-circuit loading this file, since it may take a long time over github (it takes just a couple seconds to load locally on a standard desktop)
    $.getJSON("data/pr_pr_bn32.json", null, function(data, status) {
      if(status == "success") {
        file_loaded(file, data, true);
      } else {
        file_loaded(file, null, false);
      }
    });
  } else if (typeof file == "string") {
    $("#status").text("Loading sample file '" + file + "'...");
    $.get(file, {}, function(data, textStatus) {
      if(textStatus != "success") {
        file_loaded(file, null, false);
        return;
      }
      file_loaded(file, data, true);
    });
  } else { // typeof file == File
    $("#status").text("Loading local file '" + file.name + "'...");
    var reader = new FileReader();
    reader.onload = function (event) {
      file_loaded(file.name, event.target.result, true);
    }
    reader.onerror = function (event) {
      file_loaded(file.name, null, false);
    }
    reader.readAsText(file);
  }
}

function file_loaded(fname, content, success) {
  if (success) {
    var file_type = fname.substring(fname.lastIndexOf('.') + 1).toLowerCase();
    $("#status").text("Reading " + file_type + " file...");
    console.log("Reading " + file_type + " file...");
    var edges;
    if(fname == "data/pr_pr_bn32.m4") {
      // short-circuit loading this file, since it may take a long time over github (it takes just a couple seconds to load locally on a standard desktop)
      // $.getJSON loaded and parsed JSON already
      edges = content["edges"];
    } else {
      if (file_type == "m4") {
        edges = m4(content);
      } else if (file_type == "maf") {
        edges = maf(content);
      } else if (file_type == "sam") {
        edges = sam(content);
      }
    }
    $("#status").text("Creating alignment graph...");
    console.log("Creating alignment graph...");
    alignment_graph = new AlignmentGraph(edges);
    $("#status").text(fname + " loaded");
    console.log(fname + " loaded");
    update();
  } else {
    $("#status").text("Error parsing file '" + fname + "', see HELP! at the bottom of the page");
  }
}

function update(event, ui) {
  $("#warning").hide();
  if(graph) {
    graph.empty();
  }

  alignment_graph.identity = parseFloat($("#identity").text()) / 100;
  alignment_graph.overlap = parseInt($("#overlap").text());
  alignment_graph.edge_dist = ($("#edges").prop("checked") ? parseInt($("#edge_threshold").text()) : null);
  alignment_graph.filter();

  /*
   * This will save the filtered edges as a loadable JSON file
   * IF there are few enough edges
   * OTHERWISE it will just crash your browser
   * Godspeed.
   *
  var data = JSON.stringify({"edges":alignment_graph.filtered_edges});
  var url = 'data:text/json;charset=utf8,' + encodeURIComponent(data);
  window.open(url, '_blank');
  window.focus();
   */

  if(alignment_graph.num_edges < 1000) {
    $("#arbor_container").show();
    $("#viva_container").hide();
    $("#alignment_box").show();
    graph = arbor_graph;
    $("#arbor_help").show();
    $("#viva_help").hide();
  } else if (webgl_enabled) {
    $("#arbor_container").hide();
    $("#viva_container").show();
    $("#alignment_box").hide();
    graph = viva_graph;
    $("#arbor_help").hide();
    $("#viva_help").show();
  } else {
    warn("You are attempting to render too many edges (" + alignment_graph.num_edges + ") and your browser does not support fast WebGL rendering. Try using a modern WebGl-enabled browser, use a smaller file, or more restrictive filters");
    return;
  }
  $("#graph_box").show();
  if (!graph.running) {
    graph.init();
  }

  for(var i = 0; i < alignment_graph.num_edges; i++) {
    var e = alignment_graph.filtered_edges[i];
    graph.addEdge(e.query.name, e.target.name, {weight: e.weight});
  }
}

function warn(txt) {
  $("#warning").text(txt);
  $("#warning").show();
}


// ----- init -----
$(function () {

  /*
   * Create tutorial image (SVG)
   */

  //<text x="6" y="6" alignment-baseline="hanging" style="fill:rgb(0,0,0); font-family:Cutive Mono; font-size:14px;" > ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGGGCCTT </text>
  var $top = $("#svg_top_seq");
  var top_seq = "ACGTACGTACGTACGTACGTACGTACGTACGTACGTACGGGCCTT";
  drawSVGseq($top, top_seq);

  //<text x="6" y="6" alignment-baseline="hanging" style="fill:rgb(0,0,0); font-family:Cutive Mono; font-size:14px;" > ACACGGTCC-TGTACGTACGTACGTACGTACGTACGTACGTACGT </text>
  var $bottom = $("#svg_bottom_seq");
  var bottom_seq = "ACACGGTCC-TGTACGTACGTACGTACGTACGTACGTACGTACGT";
  drawSVGseq($bottom, bottom_seq);

  //<text x="6" y="6" alignment-baseline="hanging" style="fill:rgb(0,0,0); font-family:Cutive Mono; font-size:14px;" > |||| || | </text>
  var aln = "|||| || |";
  var $aln = $("#svg_alignment");
  drawSVGseq($aln, aln);

  /*
   * Create both graph drivers, will sit inactive until needed
   */

  // arbor.js
  arbor_graph = new ArborGrapher($("#arbor_canvas"));
  arbor_graph.register_click(nodeSelected);

  // VivaGraph
  viva_graph = new VivaGrapher($("#viva_container")[0]);
  viva_graph.register_click(nodeSelected);


  $("#identity_slider").slider({
    min:0,
    max:100,
    value:98,
    change: update,
    slide: function(event, ui) {
      $("#identity").text(ui.value);
    }
  });

  $("#overlap_slider").slider({
    min:0,
    max:1000,
    value:0,
    change: update,
    slide: function(event, ui) {
      $("#overlap").text(ui.value);
    }
  });

  $("#edge_threshold_slider").slider({
    min:0,
    max:1000,
    value:50,
    change: update,
    slide: function(event, ui) {
      $("#edge_threshold").text(ui.value);
    }
  });
});

var adjacencies = []; // global for access by arbor_interface
function nodeSelected(node) {
  var read = node.name;
  console.log(read, "clicked");
  if(first_clicked_read == read) {
    first_clicked_read = null;
    second_clicked_read = null;
    adjacencies = [];
  } else if(second_clicked_read == read) {
    second_clicked_read = null;
  } else if(adjacencies.indexOf(read) > -1) { // second read must be adjacent to the first
    second_clicked_read = read;
    drawAlignment(first_clicked_read, second_clicked_read, alignment_graph.filtered_edges);
  } else { // any non-adjacent read becomes new 1st read
    first_clicked_read = read;
    second_clicked_read = null;
    adjacencies = alignment_graph.adjacencies(read);
  }
}

function drawSVGseq(root, seq) {
  var NS = "http://www.w3.org/2000/svg";

  var char_width = 10;

  for(var s = 0; s < seq.length; s++) {
    var txt = $(document.createElementNS(NS, "text"));
    txt.attr("x", 6+(s*char_width));
    txt.attr("y", 6);
    txt.attr("alignment-baseline", "hanging");
    txt.css("fill", "#000000");
    txt.css("font-size", "14px");
    txt.text(seq.charAt(s));
    root.append(txt);
  }
}
