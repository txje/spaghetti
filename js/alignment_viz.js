
function drawAlignment(query, target, alignments) {
  $("#alignment_block").show();
  var $parent = $("#alignment");

  // get all alignments between these reads
  var als = [];
  var longest = null;
  for(var i = 0; i < alignments.length; i++) {
    if(alignments[i].query.name == query && alignments[i].target.name == target) {
      als.push(alignments[i]);
      if(longest == null || alignments[i].query.alignedLength > als[longest].query.alignedLength) {
        longest = als.length - 1;
      }
    }
    if(alignments[i].query.name == target && alignments[i].target.name == query) {
      // swap
      var tmp = alignments[i].query;
      alignments[i].query = alignments[i].target;
      alignments[i].target = tmp;

      als.push(alignments[i]);
      if(longest == null || alignments[i].query.alignedLength > als[longest].query.alignedLength) {
        longest = als.length - 1;
      }
    }
  }

  // line up reads by longest aligned region
  if(als[longest].query.alignStart > als[longest].target.alignStart) {
    var queryOffset = 0;
    var targetOffset = als[longest].query.alignStart - als[longest].target.alignStart;
  } else {
    var targetOffset = 0;
    var queryOffset = als[longest].target.alignStart - als[longest].query.alignStart;
  }

  // drawing constants
  var padding = 10;
  var read_height = 40;

  var window_width = Math.max(queryOffset + als[0].query.length, targetOffset + als[0].target.length);
  var hscale = window_width / ($parent.width() - padding * 2);

  var canvas = $parent.get(0)
  var ctx = canvas.getContext("2d");
  ctx.clearRect(0,0,$parent.width(),$parent.height());

  ctx.strokeStyle = "#333333";
  ctx.fillStyle = "#333333";
  ctx.strokeWidth = 0;
  ctx.fillRect(padding + queryOffset / hscale, padding, als[0].query.length / hscale, read_height);
  ctx.fillRect(padding + targetOffset / hscale, $parent.height() - padding - read_height, als[0].target.length / hscale, read_height);

  ctx.strokeWidth = 1;
  for(var i = 0; i < als.length; i++) {
    // color from red to green by % identity
    var iden = als[i].identity;
    var c = colormap(redgreen_colormap, iden);
    console.log("alignment identity:", iden, "color:", c);
    ctx.fillStyle = c;
    ctx.fillRect(padding + (queryOffset + als[i].query.alignStart) / hscale, padding, als[i].query.alignedLength / hscale, read_height);
    ctx.fillRect(padding + (targetOffset + als[i].target.alignStart) / hscale, $parent.height() - padding - read_height, als[i].target.alignedLength / hscale, read_height);

    ctx.beginPath();
    ctx.moveTo(padding + (queryOffset + als[i].query.alignStart) / hscale, padding + read_height);
    ctx.lineTo(padding + (targetOffset + als[i].target.alignStart) / hscale, $parent.height() - padding - read_height);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(padding + (queryOffset + als[i].query.alignEnd) / hscale, padding + read_height);
    ctx.lineTo(padding + (targetOffset + als[i].target.alignEnd) / hscale, $parent.height() - padding - read_height);
    ctx.closePath();
    ctx.stroke();
  }
}


var redgreen_colormap = [[[255,0,0], 0.5], [[255,255,0], 0.75], [[0,255,0], 1.0]];
function colormap(map, val) {
  var last = map.length - 1;
  if(val < map[0][1]) return "rgb(" + map[0][0][0] + "," + map[0][0][1] + "," + map[0][0][2] + ")";
  if(val > map[last][1]) return "rgb(" + map[last][0][0] + "," + map[last][0][1] + "," + map[last][0][2] + ")";
  for(var i = 0; i < last; i++) {
    if(val >= map[i][1] && val <= map[i+1][1]) {
      var pct = (val - map[i][1]) / (map[i+1][1] - map[i][1])
      var r = parseInt(map[i][0][0] + pct * (map[i+1][0][0] - map[i][0][0]));
      var g = parseInt(map[i][0][1] + pct * (map[i+1][0][1] - map[i][0][1]));
      var b = parseInt(map[i][0][2] + pct * (map[i+1][0][2] - map[i][0][2]));
      return "rgb(" + r + "," + g + "," + b + ")";
    }
  }
}
