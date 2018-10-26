var socket = io.connect();
var final_message = "";

$(final_message).click(function(){

});

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
  }

socket.on('connect', function(){
    // call the server-side function 'adduser' and send one parameter (value of prompt)
    socket.emit('join', "Получить имя из CRM "+ getRandomArbitrary(1,100));

});



socket.on("update messages", function (username, data) {
    final_message = $("<li style='display: block;' ><b>"+ username +":</b> "+ data+"</li>");
    $(final_message).attr("id",id);
    $("#chatarea").append(final_message);
    $('#chatarea').scrollTop(new Date().getTime());
});

socket.on('updateusers', function(data) {
    $('#userlist').empty();
    $.each(data, function(key, value) {
        $('#userlist').append("<li style='display: block;'>"+ value +"</li>");

    });
});

/* $("ul#userlist")
.mouseover(function(){
    $(this).css('cursor','pointer');   

})
.moseout(function(){
    $(this).css('cursor','normal');   
}); */

$("form#chat").submit(function (e) {
    e.preventDefault();
    mess = $(this).find("#msg_text").val()
    socket.emit("sendchat", mess);
    $("form#chat #msg_text").val("");
    $("#msg_text").focus();
});



