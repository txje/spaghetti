
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
  $("#graph_block").hide();
  if (!file) {
    return null;
  }
  if (typeof file == "string") {
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
    if (file_type == "m4") {
      edges = m4(content);
    } else if (file_type == "maf") {
      edges = maf(content);
    } else if (file_type == "sam") {
      edges = sam(content);
    }
    $("#status").text("Creating alignment graph...");
    console.log("Creating alignment graph...");
    console.log(edges);
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

  if(alignment_graph.num_edges < 1000) {
    $("#arbor_container").show();
    $("#viva_container").hide();
    graph = arbor_graph;
    $("#arbor_help").show();
    $("#viva_help").hide();
  } else if (webgl_enabled) {
    $("#arbor_container").hide();
    $("#viva_container").show();
    graph = viva_graph;
    $("#arbor_help").hide();
    $("#viva_help").show();
  } else {
    warn("You are attempting to render too many edges (" + alignment_graph.num_edges + ") and your browser does not support fast WebGL rendering. Try using a modern WebGl-enabled browser, use a smaller file, or more restrictive filters");
    return;
  }
  $("#graph_block").show();
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
    adjacencies = alignment_graph.adjacencies(read);
  }
}

