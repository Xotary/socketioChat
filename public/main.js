$(function () {

    var sendTo = '';
    var socket = io.connect();
    var finalMessage = "";
    var addUser = "";
    var dialog;
    var scrollValue = new Date().getTime().toString();
   
    Number.prototype.round = function(places) {
        return +(Math.round(this + "e+" + places)  + "e-" + places);
      }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }
    var me = getRandomArbitrary(1, 100).round(3);

    var curUser = "CRM user "+ me;

    socket.on('connect', function () {
        // call the server-side function 'adduser' and send one parameter (value of prompt)
        socket.emit('join', curUser);

    });

    socket.on("update messages", function (username, data, curDate) {
        finalMessage = $("<li style='display: block;' ><b>" + username + "</b> в " + curDate + ": " + data + "</li>");

        $("#chatarea").append(finalMessage);
        $('#chatarea').scrollTop("99999");
    });

    dialog = $("#dialog-form").dialog({
        autoOpen: false,
        height: 400,
        width: 450,
        modal: false
    });


    form = dialog.find("form#directchat").on("submit", function (event) {
        event.preventDefault();
        sendDirectMessage(sendTo, curUser);
    });

    socket.on('updateusers', function (data) {
        $('#userlist').empty();
        $.each(data, function (key, value) {
            addUser = $("<li style='display: block;'>" + value + "</li>");
            addUser.attr("id",value);
            addUser.click(function () {
                dialog.dialog("open");
                sendTo = this.innerText;
                //$('button[title="Close"]').text(""); пофиксить текст 'Close'
            });
            $('#userlist').append(addUser);
        });
    });


    function sendDirectMessage(to, from) {
        mess = $("#dmsg_text").val();
        socket.emit("send direct message", to, mess, from);
        $("#dmsg_text").val("");
        $("#dmsg_text").focus();
    }

    socket.on('update direct chat', function (data, userName) {
        //console.log(sd);
        if(!$('#dialog-form').dialog('isOpen')){
            dialog.dialog("open");    
        }
        sendTo = userName;
        finalMessage = $("<li style='display: block;' >От <b>" + userName + ": </b> " + data + "</li>");
        $("#directchatarea").append(finalMessage);
        $('#directchatarea').scrollTop("99999");
    });

    socket.on('sefl update message', function(data){
        finalMessage = $("<li style='display: block;' ><b>Я</b> " + data + "</li>");
        $("#directchatarea").append(finalMessage);
        $('#directchatarea').scrollTop("99999");
    });

    $("form#chat").submit(function (e) {
        e.preventDefault();
        console.log(socket);
        mess = $("#msg_text").val();
        socket.emit("sendChat", mess);
        $("form#chat #msg_text").val("");
        $("#msg_text").focus();
    });
})

