var JSONRPCClient; ///< The core JSONRPC WebSocket client.

var canvas, ctx,
    painting = false,
    lastPos,
    color;

function addError(error) {
    console.log(error);
}

function onWebSocketOpen(ws) {
    console.log("on open");
    console.log(ws);
}

function onWebSocketMessage(evt) {
    console.log("on message:");
    console.log(evt.data);
}

function onWebSocketClose() {
    console.log("on close");
    $("#message").html("<strong>Erro!</strong> Não consegui conectar. Tente reiniciar a página.");
    $("#message").show();
}

function onWebSocketError() {
    console.log("onWebSocketError");
    $("#message").html("<strong>Erro!</strong> Não consegui conectar. Tente reiniciar a página.");
    $("#message").show();
}

function getXY(evt, element) {
    var rect = element.getBoundingClientRect();
    var scrollTop = document.documentElement.scrollTop?
                    document.documentElement.scrollTop:document.body.scrollTop;
    var scrollLeft = document.documentElement.scrollLeft?                   
                    document.documentElement.scrollLeft:document.body.scrollLeft;
    var elementLeft = rect.left+scrollLeft;  
    var elementTop = rect.top+scrollTop;

    var obj = evt;
    if(evt.type.indexOf("touch")>=0) obj = evt.originalEvent.touches[0];

    x = obj.pageX-elementLeft;
    y = obj.pageY-elementTop;

    return {x:x, y:y};
}

function getRGB(str){
  var match = str.match(/rgba?\((\d{1,3}), ?(\d{1,3}), ?(\d{1,3})\)?(?:, ?(\d(?:\.\d?))\))?/);
  return match ? {
    r: match[1],
    g: match[2],
    b: match[3]
  } : {};
}

function loop() {
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fillRect(0, 0, canvas[0].width, canvas[0].height);
    window.requestAnimationFrame(loop);
}

function send(x1, y1, x2, y2, color, size){
  JSONRPCClient.call(
    'set-text',
    '{"x1":' + x1 + ', "y1": ' + y1 + ', "x2":' + x2 + ', "y2":' + y2 + ', "color":{"r":' + color.r + ', "g":' + color.g + ', "b":' + color.b + '}, "size":' + size + '}',
    function(result) {

    },
    function(error) {
        addError(error);
    }
  );
}

function resize(){
  var w = canvas.parent().width()-2;
  var h = 3/4*w;

  if(h > $( window ).height()-$(".controls").height()-30) {
    h = parseInt($( window ).height()-$(".controls").height()-30);
    w = parseInt(4/3*h);
  }

  if(w!=canvas[0].width || h!=canvas[0].height){
    canvas[0].width = w;
    canvas[0].height = h;

    ctx.fillStyle = "rgb(0,0,0)";
    ctx.fillRect(0, 0, canvas[0].width, canvas[0].height);
  }
}

function startDraw(){
  canvas = $("#canvas");

  ctx = canvas[0].getContext("2d");

  color = $(".selected").css("background-color");

  $(window).on('resize', resize);
  resize();

  canvas.bind('mousedown touchstart', function(e) {
      lastPos=getXY(e, this);
      
      painting = true;
  });

  canvas.bind('mousemove touchmove', function(e) {
      if (painting) {
          var m=getXY(e, this);
          var size = $("#size").val();
          
          ctx.beginPath();
          ctx.strokeStyle = "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
          ctx.lineWidth = size;
          ctx.stroke();
          ctx.moveTo(lastPos.x, lastPos.y);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();

          var x1 = m.x/canvas[0].width;
          var y1 = m.y/canvas[0].height;
          var x2 = lastPos.x/canvas[0].width;
          var y2 = lastPos.y/canvas[0].height;
          send(x1.toFixed(4), y1.toFixed(4), x2.toFixed(4), y2.toFixed(4), color, size);

          lastPos.x = m.x;
          lastPos.y = m.y;
      }
  });

  canvas.bind('mouseup touchend', function (e) {
      painting = false;
  });

  loop();

  //When clicking on control list items
  $(".colors").on("click", ".color", function(){
    $(this).siblings().removeClass("selected");
    $(this).addClass("selected");
    color = getRGB($(this).css("background-color"));
  });
  $(".color").first().trigger( "click" );


  //When "New Color" is pressed
  $("#revealColorSelect").click(function(){
    $("#red").val(255*Math.random());
    $("#green").val(255*Math.random());
    $("#blue").val(255*Math.random());
    changeColor();
    $("#colorSelect").toggle();
  });

  //update the new color span
  function changeColor() {
    var r = $("#red").val();
    var g = $("#green").val();
    var b = $("#blue").val();

    $("#newColor").css("background-color", "rgb(" + r + "," + g + ", " + b + ")");
  }

  //When color sliders change
  $("input[type=range]").change(changeColor)

  //When "Add Color" is pressed
  $("#addNewColor").click(function(){
    //Append the color to the controls ul
    var $newColor = $("<div class='color'></div>");
    $newColor.css("background-color", $("#newColor").css("background-color"));
    $(".colors").append($newColor);
    //Select the new color
    $newColor.click();
    $("#colorSelect").toggle();
    resize();
  });
}

$(document).ready(function() {
    // Initialize our JSONRPCClient
    JSONRPCClient = new $.JsonRpcClient({
        ajaxUrl: getDefaultPostURL(),
        socketUrl: getDefaultWebSocketURL(), // get a websocket for the localhost
        onmessage: onWebSocketMessage,
        onopen: onWebSocketOpen,
        onclose: onWebSocketClose,
        onerror: onWebSocketError
    });

    startDraw();

    var url = new URL(window.location);
    var debug = url.searchParams.get("debug");
    if(debug==="true"){
      console.log("Simulating clicks.");
      painting = true;
      lastPos = {x:0, y:0};
      function simulate(){
        var event = jQuery.Event( "mousemove" );
        event.pageX = canvas[0].width*Math.random();
        event.pageY = canvas[0].height*Math.random();
        canvas.trigger( event );
      }
      setInterval(simulate, 100);
    }
});