$(function () {
    //var me = getRandomArbitrary(1, 100).round(3);
    function sendNotification(title, options) {
        // Проверим, поддерживает ли браузер HTML5 Notifications
        if (!("Notification" in window)) {
            alert('Ваш браузер не поддерживает HTML Notifications, его необходимо обновить.');
        }

        // Проверим, есть ли права на отправку уведомлений
        else if (Notification.permission === "granted") {
            // Если права есть, отправим уведомление
            var notification = new Notification(title, options);

            function clickFunc() { alert('Пользователь кликнул на уведомление'); }

            notification.onclick = clickFunc;
        }

        // Если прав нет, пытаемся их получить
        else if (Notification.permission !== 'denied') {
            Notification.requestPermission(function (permission) {
                // Если права успешно получены, отправляем уведомление
                if (permission === "granted") {
                    var notification = new Notification(title, options);

                } else {
                    alert('Вы запретили показывать уведомления'); // Юзер отклонил наш запрос на показ уведомлений
                }
            });
        } else {
            // Пользователь ранее отклонил наш запрос на показ уведомлений
            // В этом месте мы можем, но не будем его беспокоить. Уважайте решения своих пользователей.
        }
    }
    var socket = io();
    var sendTo = '';
    var finalMessage = "";
    var addUser = "";
    var groupMsg = 0;

    var dialog, addDialog;
    //var scrollValue = new Date().getTime().toString();

    function safe(str) {
        return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    var idPattern = new RegExp(/[^a-zA-Z0-9а-яА-Я]/, 'g');
    var curUser = decodeURI(window.location.search.replace('?name=', ""));
    socket.emit('join', curUser);
    socket.emit('load usergropus', curUser);

    $("#all").click(function () { //renamed to Global
        $("#chatarea").text('');
        $('#sendmessageto').val("");
        socket.emit('retrive history');
        var oldGroup = localStorage.getItem('old group');
        $('li#user_' + oldGroup.replace(idPattern, '_')).remove();
        $('#search').val('');
        $.each($('#userlist li'), function () { $(this).show(); });
        groupMsg = 0;     
    }).css('cursor', 'pointer');

    function addRoom() {
        var usersInGroup = [];
        if ($('#groupname').val()) {
            $.each($('#group-user-container li'), function () {
                if ($(this).context.id) {
                    usersInGroup.push($(this).text())
                    var _this = this;
                    this.remove();
                    $('#userlist').prepend(_this);
                }
            });
            socket.emit('create new room', { curUser: curUser, groupName: $('#groupname').val(), usersInGroup: usersInGroup, groupOwner: curUser });
            dialog.dialog("close");
        } else alert('название не может быть пустым');
    }

    function addUsers() {
        var usersInGroup = [];
        var groupName = $(this).data('groupName');
        $.each($('#add-to-group-container li'), function () {
            if ($(this).context.id) {
                usersInGroup.push($(this).text())
                var _this = this;
                this.remove();
                $('#userlist').prepend(_this);
            }
        });
        socket.emit('add users in group', { curUser: curUser, groupName: groupName, usersInGroup: usersInGroup, groupOwner: curUser });
        addDialog.dialog("close");
    }

    dialog = $("#dialog-form").dialog({
        autoOpen: false,
        height: 400,
        width: 450,
        modal: false,
        buttons: {
            "Add room": addRoom,
            Cancel: function () {
                dialog.dialog("close");
            }
        },
        close: function () {
            $('#groupname').val('');
            $.each($('#group-user-container li'), function () {
                if ($(this).context.id) {

                    var _this = this;
                    this.remove();
                    $('#userlist').prepend(_this);
                }
            });
        }
    });

    addDialog = $("#add-dialog-form").dialog({
        autoOpen: false,
        height: 400,
        width: 450,
        modal: false,
        buttons: {
            "Add users": addUsers,
            Cancel: function () {
                addDialog.dialog("close");
            }
        },
        close: function () {
            $.each($('#add-to-group-container li'), function () {
                if ($(this).context.id) {
                    var _this = this;
                    this.remove();
                    $('#userlist').prepend(_this);
                }
            });
        }
    });

    $("#createroom").click(function () {
        dialog.dialog("open");
    });

    Number.prototype.round = function (places) {
        return +(Math.round(this + "e+" + places) + "e-" + places);
    }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    $('#userlist').sortable({
        connectWith: '#group-user-container,#add-to-group-container'
    });
    $('#group-user-container').sortable({
        connectWith: '#userlist'
    });
    $('#add-to-group-container').sortable({
        connectWith: '#userlist'
    });

    socket.on('append group', function (data) {
        appendGroup(data);
    });

    socket.on('append all groups', function (docs) {
        $.each(docs, function (key, value) {
            appendGroup(value);
        });
    });

    socket.on("de append group", function (groupName) {
        $('li#gr_el_' + groupName.replace(idPattern, '_')).remove();
        $('#sendmessageto').val('');
        $("#chatarea").text('');
        socket.emit('retrive history');
        groupMsg = 0;
    });

    socket.on('send history', function (docs) {
        $.each(docs.reverse(), function (key, value) {
            displayMsg(value);
        });
    });

    socket.on("update messages", function (data) {
        if (!$('#sendmessageto').val()) {
            displayMsg(data);
        }
    });

    function appendGroup(data) {
        $('#roomlist').append('' +
            '<li id=gr_el_' + data.groupName.replace(idPattern, '_') + '>' +
            '<div style="margin: 5px 0px;" id=gr_' + data.groupName.replace(idPattern, '_') + '>' + data.groupName + '</div>' +
            '</li>');
        if (data.groupOwner == curUser) {
            $('li#gr_el_' + data.groupName.replace(idPattern, '_')).
                append('<img id=del_' + data.groupName.replace(idPattern, '_') +
                    ' src="assets/delete-img.png" alt="Delete group" title="Удалить группу" style="cursor:pointer; height:16px; width:16px; margin:5px 5px 5px 15px; float: left;">')
                .append('<img id=add_' + data.groupName.replace(idPattern, '_') +
                    ' src="assets/add-person-mini.png" alt="Add in group" title="Добавить в группу" style="cursor:pointer; height:16px; width:16px; margin:5px 5px; float: left;">')
                .append('<p style="display: block;"></p>');
            $('img#del_' + data.groupName.replace(idPattern, '_')).click(function () {
                socket.emit('remove group', data.groupName);
            });
            $('img#add_' + data.groupName.replace(idPattern, '_')).click(function () {
                addDialog
                    .data('groupName', data.groupName)
                    .dialog("open");
            });
        } else {
            $('li#gr_el_' + data.groupName.replace(idPattern, '_')).
                append('<img id=user_' + data.groupName.replace(idPattern, '_') +
                    ' src="assets/leave-group.png" alt="Leave this group" title="Выйти из группы" style="cursor:pointer; height:16px; width:16px; margin:5px 5px 5px 15px; float: left;">')
                .append('<p style="display: block;"></p>');
            $('img#user_' + data.groupName.replace(idPattern, '_')).click(function () {
                socket.emit('kick from group', { groupName: data.groupName, userName: curUser });
            });

        }
        $('li#gr_el_' + data.groupName.replace(idPattern, '_')).append('<ul style="float: left; display:grid; padding: 0px; margin: 5px 0px 5px 20px" id=users_in_group_' + data.groupName.replace(idPattern, '_') + '></ul>');

        $('div#gr_' + data.groupName.replace(idPattern, '_')).click(function () {
            if ($('#sendmessageto').val() != this.innerText) {
                var oldGroup = localStorage.getItem('old group');
                $('#sendmessageto').val(this.innerText);

                localStorage.setItem('old group', $('#sendmessageto').val());

                $("#chatarea").text('');
                $(this).removeClass('newmessage');
                if (oldGroup) {
                    $('li#user_' + oldGroup.replace(idPattern, '_')).remove();
                }
                socket.emit('load users of current group', $('#sendmessageto').val(), curUser);

                socket.emit("retrive group history", this.innerText);
                $("#msg_text").focus();
                groupMsg = 1;

            }
        });
    }
    function displayMsg(data) {
        finalMessage = $("<li><b>" + data.sendingUserName + "</b> в " + data.timeMsg + ": " + data.message + "</li>");

        $("#chatarea").append(finalMessage);
        $('#chatarea').scrollTop("99999");
    }

    socket.on('post render users of current group', function (data) {
        if ($('#sendmessageto').val() == data.groupName) {
            $('ul#users_in_group_' + $('#sendmessageto').val().replace(idPattern, '_')).append('<li style="margin: 5px 0px;" id=user_' + $('#sendmessageto').val().replace(idPattern, '_') + '>' +
                '<div style="margin: 5px 0px" id=user_' + data.userName.replace(idPattern, '_') + '>' + data.userName + '</div></li>');                        
            if (data.groupOwner == curUser && data.userName != curUser) {
                $($('div#user_' + data.userName.replace(idPattern, '_'))[0].parentElement)
                    .append('<img id=user_' + data.userName.replace(idPattern, '_') +
                        ' src="assets/kick-from-group.png" alt="Kick from group" title="Удалить из группы" style="cursor:pointer; height:16px; width:16px; margin:5px 5px 5px 15px; float: left;">');
                $('img#user_' + data.userName.replace(idPattern, '_')).click(function () {
                    socket.emit('kick from group', { groupName: $('#sendmessageto').val(), userName: data.userName });
                });
            }
        }
    });

    socket.on('render users of current group', function (docs) {
        $.each(docs, function (key, value) {
            appendUsersOfGroup(value);
        });
    });

    socket.on('remove kicked user', function (data) {
        $($('div#user_' + data.userName.replace(idPattern, '_'))[0].parentElement).remove();
    });

    function appendUsersOfGroup(data) {

        $('ul#users_in_group_' + $('#sendmessageto').val().replace(idPattern, '_')).append('<li style="margin: 5px 0px;" id=user_' + $('#sendmessageto').val().replace(idPattern, '_') + '>' + //float:inherit;
            '<div style="margin: 5px 0px" id=user_' + data.userName.replace(idPattern, '_') + '>' + data.userName + '</div></li>')
        if (data.groupOwner == curUser && data.userName != curUser) {
            $($('div#user_' + data.userName.replace(idPattern, '_'))[0].parentElement)
                .append('<img id=user_' + data.userName.replace(idPattern, '_') +
                    ' src="assets/kick-from-group.png" alt="Kick from group" title="Удалить из группы" style="cursor:pointer; height:16px; width:16px; margin:5px 5px 5px 15px; float: left;">');
            $('img#user_' + data.userName.replace(idPattern, '_')).click(function () {
                socket.emit('kick from group', { groupName: $('#sendmessageto').val(), userName: data.userName });
            });
        }    
    }

    socket.on('updateuser', function (user) {
        console.log(user);
        $('li#' + user.username.replace(idPattern, '_')); //.html("<li>" + user.username + "</li>"); //' (' + user.status +  //style='display: block;'
        if (user.status == 'online') {
            $('li#' + user.username.replace(idPattern, '_'))
                .addClass('online')
                .removeClass('offline');
        } else {
            $('li#' + user.username.replace(idPattern, '_'))
                .addClass('offline')
                .removeClass('online');
        }        
    });

    socket.on('load userlist', function (data) {
        $('#userlist').empty();
        for (var key in data) {
            addUser = $("<li>" + data[key].username + "("+data[key].positionName +")</li>");
            addUser.attr("id", data[key].username.replace(idPattern, '_'));
            if (data[key].status == 'online') {
                addUser.addClass('online');
            } else {
                addUser.addClass('offline');
            }
            addUser.click(function () {
                if (dialog.dialog("isOpen")) {
                    $('#group-user-container').append(this);
                    return;
                }
                if (addDialog.dialog("isOpen")) {
                    $('#add-to-group-container').append(this);
                    return;
                }
                if ($('#sendmessageto').val() != this.innerText) {
                    $('#sendmessageto').val(this.innerText.split('(')[0]);
                    $("#chatarea").text('');
                    $(this).removeClass('newmessage');
                    socket.emit("retrive private history", $('#sendmessageto').val(), curUser);
                    $("#msg_text").focus();
                    groupMsg = 0;
                }
                if (this.innerText == curUser) {
                    $('#sendmessageto').val('');
                    $("#chatarea").text('');
                    socket.emit('retrive history');
                    $("#msg_text").focus();
                    groupMsg = 0;
                }
            });
            $('#userlist').append(addUser);
        }
    });

    socket.on("connected", function (serv, msg, date) {
        if (!$('#sendmessageto').val()) {
            finalMessage = $("<li><b>" + serv + "</b> " + msg + ": " + date + "</li>");
            $("#chatarea").append(finalMessage);
            $('#chatarea').scrollTop("99999");
        }
    });

    socket.on('update direct message', function (data) {
        var selector = '#' + data.sendingUserName.replace(idPattern, '_');
        if ($('#sendmessageto').val() != data.sendingUserName) {
            $(selector).addClass('newmessage');
            sendNotification('Сообщение от ' + data.sendingUserName, { body: data.message });
        }
        else {
            displayMsg(data);
        }
    });

    socket.on('update group message', function (data) {
        var selector = '#gr_' + data.receivingUserName.replace(idPattern, '_');
        if ($('#sendmessageto').val() != data.receivingUserName) {
            $(selector).addClass('newmessage');
            sendNotification('Сообщение в группе ' + data.receivingUserName, { body: data.message });
        }
        else {
            displayMsg(data);
        }
    });

    socket.on('disconnected', function (serv, msg, date) {
        if (!$('#sendmessageto').val()) {
            finalMessage = $("<li><b>" + serv + "</b> " + msg + ": " + date + "</li>");
            $("#chatarea").append(finalMessage);
            $('#chatarea').scrollTop("99999");
        }
    });

    socket.on('self update message', function (data) {
        finalMessage = $("<li><b>" + data.sendingUserName + "</b> в " + data.timeMsg + ": " + data.message + "</li>");
        $("#chatarea").append(finalMessage);
        $('#chatarea').scrollTop("99999");
    });

    $("form#chat").submit(function (e) {
        e.preventDefault();
        mess = $("#msg_text").val();
        messTo = $("#sendmessageto").val();
        if (!groupMsg) {
            socket.emit("send message", safe(mess), messTo, curUser);
        } else {
            socket.emit("send group message", safe(mess), messTo, curUser);
        }
        $("form#chat #msg_text").val("");
        $("#msg_text").focus();
    });

    $('#search').keyup(function () {
        var filter = $(this).val();
        $('#userlist li').each(function () {
            if ($(this).text().search(new RegExp(filter, "i")) < 0) {
                $(this).hide();
            } else {
                $(this).show();
            }
        });
    });
})