$(function () {

    var sendTo = '';
    var socket = io.connect();
    var finalMessage = "";
    var addUser = "";
    var dialog;
    var scrollValue = new Date().getTime().toString();
    
    function safe(str) {
        return str.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;');
    }

    $("#all").click( function(){        
        if($('#sendmessageto').val()){
            $("#chatarea").text('');        
            $('#sendmessageto').val("");
            socket.emit('retrive history');
        }        
    });
   
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

    
    socket.on('send history', function(docs){
        $.each(docs.reverse(), function(key, value){
            displayMsg(value);
        });
    });
    
    socket.on("update messages", function (data) {
        if(!$('#sendmessageto').val()){
            displayMsg(data);
        }        
    });


    function displayMsg(data){
/*         if !($('#sendmessageto')) */
        finalMessage = $("<li style='display: block;' ><b>" + data.sendingUserName + "</b> в " + data.timeMsg + ": " + data.message + "</li>");

        $("#chatarea").append(finalMessage);
        $('#chatarea').scrollTop("99999");
    }

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
            addUser.attr("id",value.replace(/\s/g,'').replace(".",""));
            addUser.click(function () {
                /* dialog.dialog("open"); */ //Отказ в пользу одного окна                                
                if($('#sendmessageto').val()!=this.innerText){
                    $('#sendmessageto').val(this.innerText);
                    $("#chatarea").text('');
                    $(this).css('background','white');
                    socket.emit("retrive private history", this.innerText, curUser)
                }                                
                if($('#sendmessageto').val()==curUser){
                    $('#sendmessageto').val('');
                    $("#chatarea").text('');
                    socket.emit('retrive history');
                }
                //sendTo = this.innerText;
                //$('button[title="Close"]').text(""); пофиксить текст 'Close'
            });
            $('#userlist').append(addUser);
        });
    });

    function sendDirectMessage(to, from) {
        mess = $("#dmsg_text").val();
        socket.emit("send direct message", to, safe(mess), from);
        $("#dmsg_text").val("");
        $("#dmsg_text").focus();
    }

    socket.on("connected",function(serv, msg, date){
        if(!$('#sendmessageto').val()){
            finalMessage = $("<li style='display: block;' ><b>" + serv + "</b> " + msg + ": " + date + "</li>");
            $("#chatarea").append(finalMessage);
            $('#chatarea').scrollTop("99999");
        }        
    });

    socket.on('update direct message', function (data) {
        var selector = '#'+data.sendingUserName.replace(/\s/g,'').replace(".","");
        if($('#sendmessageto').val() != data.sendingUserName) {
            $(selector).css('background','yellowgreen');
        }
        else {
            displayMsg(data);            
        }
    });

    socket.on('disconnected', function(serv, msg, date){
        finalMessage = $("<li style='display: block;' ><b>" + serv + "</b> " + msg + ": " + date + "</li>");
        $("#chatarea").append(finalMessage);
        $('#chatarea').scrollTop("99999");        
    });

    socket.on('self update message', function(data){
        finalMessage = $("<li style='display: block;' ><b>"+data.sendingUserName+"</b> в " + data.timeMsg + ": "+ data.message + "</li>");
        $("#chatarea").append(finalMessage);
        $('#chatarea').scrollTop("99999");
    });

    $("form#chat").submit(function (e) {
        e.preventDefault();
        //console.log(socket);
        mess = $("#msg_text").val();
        messTo = $("#sendmessageto").val();        
        socket.emit("send message", safe(mess), messTo, curUser);
        $("form#chat #msg_text").val("");
        $("#msg_text").focus();
    });
})

