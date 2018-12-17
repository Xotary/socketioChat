
function getCurrentDate() {
    var currentDate = new Date();
    var day = (currentDate.getDate() < 10 ? '0' : '') + currentDate.getDate();
    var month = ((currentDate.getMonth() + 1) < 10 ? '0' : '') + (currentDate.getMonth() + 1);
    var year = currentDate.getFullYear();
    var hour = (currentDate.getHours() < 10 ? '0' : '') + currentDate.getHours();
    var minute = (currentDate.getMinutes() < 10 ? '0' : '') + currentDate.getMinutes();
    var second = (currentDate.getSeconds() < 10 ? '0' : '') + currentDate.getSeconds();
    return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
}

var port = process.env.PORT || 3010,
express = require("express"),
app = express(),
//server = require('http').Server(app),
https = require('https'),
fs = require('fs'),
users = {}, socks = {};
var path = require('path');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
var mongo = require('mongoose');
var nodemailer = require('nodemailer');

var options = {
pfx: fs.readFileSync('C:\\Users\\crm_t_s\\Desktop\\simpleChat\\k2bio.pfx'),
passphrase: '1'
};

var server = https.createServer(options, app).listen(port, function () {
console.log('server is running');
console.log('listening on *: ' + port);
});

/* server.listen(port, function () {
//if (err) throw err
console.log('listening on *: ' + port);
}); */


mongo.connect('mongodb://localhost/chat', function (err) {
if (err) {
    console.log(err);
} else {
    console.log('connected to mongodb');
}
});

var chatSchema = mongo.Schema({
sendingUserName: String,
receivingUserName: String,
message: String,
timeMsg: { type: Date, default: getCurrentDate }
});

var groupSchema = mongo.Schema({
userName: String,
groupName: String,
groupOwner: String
});

var groupModel = mongo.model('Groups', groupSchema);
var chatModel = mongo.model('Message', chatSchema);

var io = require("socket.io")(server);

app.use(express.static(path.join(__dirname, 'public')));

var numUsers = 0;

var mode = 'test';
var urlStr = 'http://192.168.0.76:62683/ServiceTools/json/GetUsers?mode=' + mode;
var xhr = new XMLHttpRequest();
xhr.open("GET", urlStr, false);
xhr.setRequestHeader("Accept", "application/json");
xhr.send();
var response = JSON.parse(xhr.responseText);

//var userList = {};
/* response.split(';').forEach(obj => {
var element = obj.split('(');
if (!element[1]) element[1] = '';
users[element[0]] = { 'username': element[0], 'email': element[1].replace(')', ''), 'status': 'offline' };
});
 */
response.forEach(element => {
    users[element.Name] = { 'username': element.Name, 'email': element.Email, 'positionName': element.PositionName, 'status': 'offline' }    
});

var transporter = nodemailer.createTransport({
service: 'yandex',
auth: {
    user: 'tavion2@yandex.ru',
    pass: 'Zaq12wsx'
}
});


//console.log(users);

io.on('connection', function (socket) {
try {
    socket.on('retrive history', function () {

        var query = chatModel.find({ receivingUserName: 'all' });
        query.sort('-timeMsg').limit(200).exec(function (err, docs) {
            if (err) throw err;
            socket.emit('send history', docs);
        });
    });

    socket.on('retrive private history', function (to, from) {
        var query = chatModel.find({ receivingUserName: { $in: [to, from] }, sendingUserName: { $in: [to, from] } });
        query.sort('-timeMsg').limit(200).exec(function (err, docs) {
            if (err) throw err;
            socket.emit('send history', docs);
        });
    })

    socket.on('retrive group history', function (to) {
        var query = chatModel.find({ receivingUserName: to });
        query.sort('-timeMsg').limit(200).exec(function (err, docs) {
            if (err) throw err;
            socket.emit('send history', docs);
        });
    })

    socket.on('load usergropus', function (curUser) {
        var query = groupModel.find({ userName: curUser });
        query.exec(function (err, docs) {
            if (err) throw err;
            socket.emit('append all groups', docs);
            docs.forEach(element => {
                socket.join(element.groupName);
            });
        });
    });

    socket.on('load users of current group', function (groupName, curUser) {
        var usersInGroup = [];
        var query = groupModel.find({ groupName: groupName });
        query.exec(function (err, docs) {
            if (err) throw err;
            docs.forEach(element => {
                usersInGroup.push(element.userName);
            });
            if (docs[0].groupOwner == curUser){
                owner = 1;
            }                
            else{
                owner = 0;
            }            
            socket.emit('render users of current group', docs);
        });
        
    });

    socket.on("join", function (username) {
        try {
            socket.emit('load userlist', users);
            socket.username = username;
            if (!users[socket.username]) {
                users[socket.username] = { status: 'online', email: 'hz@hz.io', username: username };
            }

            users[socket.username].status = 'online';
            socks[socket.username] = { 'socket': socket };
            console.log("USERNAME " + username + "  IS CONNECTED");
            //console.log(users);
            socket.emit('connected', 'SERVER', 'you have connected at ', getCurrentDate());
            socket.broadcast.emit('connected', 'SERVER', username + ' has connected at ', getCurrentDate());
            io.sockets.emit('updateuser', users[socket.username]);
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('send message', function (msg, to, from) {
        try {
            if (!to) {
                var globalMsg = new chatModel({ message: msg, sendingUserName: from, receivingUserName: "all" });
                globalMsg.save(function (err) {
                    if (err) throw err;
                });
                io.sockets.emit('update messages', globalMsg);
            } else {
                var dirMsg = new chatModel({ message: msg, sendingUserName: from, receivingUserName: to });
                dirMsg.save(function (err) {
                    if (err) throw err;
                });

                if (users[to].status == 'offline' && users[to].email != '') {

                    var mailOptions = {
                        from: 'tavion2@yandex.ru',
                        to: users[to].email,
                        subject: 'you have a new private message from ' + from + '!',
                        text: msg
                    };
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log('Email sent: ' + info.response);
                        }
                    });
                    socket.emit('self update message', dirMsg);
                } else {
                    socket.emit('self update message', dirMsg);
                    socket.broadcast.to(socks[to].socket.id).emit('update direct message', dirMsg);
                }
            }
        } catch (error) {
            console.log(error);
        }
    });

    socket.on('remove group', function (groupName) {
        io.sockets.in(groupName).emit('de append group', groupName);
        var usersInGroup = groupModel.find({ groupName: groupName })
        usersInGroup.exec(function(err, docs) {
            docs.forEach(element => {
                if(socks[element.userName]){
                    socks[element.userName].socket.leave(groupName);
                }
            });
        })
        var query = groupModel.remove({ groupName: groupName })
        try {
            query.exec(function () {
                console.log('group ' + groupName + ' was removed');
            });
        } catch (error) {
            console.log(error)
        }
    });

    socket.on('kick from group', function (data){
        if(socks[data.userName]){
            //socket.broadcast.to(socks[data.userName].socket.id).emit('de append group', data.groupName);
            socket.emit('de append group', data.groupName);
            socks[data.userName].socket.leave(data.groupName);  
        }            
        io.sockets.in(data.groupName).emit('remove kicked user', data);
        var query = groupModel.remove({ groupName: data.groupName, userName: data.userName })
        try {
            query.exec(function () {
                console.log('User ' +data.userName+ ' quit from group ' + data.groupName );
            });
        } catch (error) {
            console.log(error)
        }           
    })

    socket.on('send group message', function (msg, to, from) {
        var groupMsg = new chatModel({ message: msg, sendingUserName: from, receivingUserName: to });
        groupMsg.save(function (err) {
            if (err) throw err;
        });
        io.sockets.in(to).emit('update group message', groupMsg);
    });

    socket.on('create new room', function (data) {
        var group = new groupModel({ userName: data.curUser, groupName: data.groupName, groupOwner: data.curUser });
        group.save(function (err) {
            if (err) throw err;
        });
        socket.join(data.groupName);

        data.usersInGroup.forEach(element => {
            if (element != data.curUser) {
                var group = new groupModel({ userName: element, groupName: data.groupName, groupOwner: data.groupOwner });
                group.save(function (err) {
                    if (err) throw err;
                });
            }
            try {
                if (socks[element]) {
                    socks[element].socket.join(data.groupName);
                    
                    socket.broadcast.to(socks[element].socket.id).emit('append group', data);
                }
            } catch (error) {
                console.log(error);
            }
        });
        socket.emit('append group', data); //.groupName
    })

    socket.on('add users in group', function (data) {
        data.usersInGroup.forEach(element => {
            var alreadyInGroup = groupModel.find({ groupName: data.groupName, userName: element });
            alreadyInGroup.exec(function (err, docs) {
                if (err) throw err;
                if (docs.length == 0) {
                    var addUser = new groupModel({ userName: element, groupName: data.groupName, groupOwner: data.groupOwner });
                    addUser.save(function (err) {
                        if (err) throw err;
                    });
                }
                try {
                    if (socks[element]) {
                        io.sockets.in(data.groupName).emit('post render users of current group', {groupName: data.groupName, userName: element, groupOwner: data.groupOwner}); //авто обновление новых пользователей
                        socks[element].socket.join(data.groupName);                        
                        socket.broadcast.to(socks[element].socket.id).emit('append group', data);
                        
                    }
                } catch (error) {
                    console.log(error);
                }
            });
        });
    });
    /*     socket.on('send direct message', function (userName, msg, from) {
            socket.emit('sefl update message', msg);
            socket.broadcast.to(users[userName].socket.id).emit('update direct chat', msg, from);
        }); */

    //реализовать, если понадобиться 
    /* socket.on('user_typing', function (username) {
        var id = users[username].socket.id;
        io.sockets.connected[id].emit('chat', JSON.stringify({ 'action': 'user_typing', 'data': users[socket.user] }));
    }); */

    socket.on('disconnect', function () {
        // remove the username from global users list
        try {
            delete socks[socket.username];
            users[socket.username].status = "offline";
            //console.log(socks);
            //console.log(users);
            console.log(users[socket.username].username + " disconnected")
            io.sockets.emit('updateuser', users[socket.username]);
            socket.broadcast.emit('disconnected', 'SERVER', socket.username + ' has disconnected at', getCurrentDate());
            //socket.disconnect(true);
        } catch (error) {
            console.log(error);
        }
    });
} catch (error) {
    console.log(error);
}
/*     var query = chatModel.find({ receivingUserName: 'all' });
    query.sort('-timeMsg').limit(200).exec(function (err, docs) {
        if (err) throw err;
        socket.emit('send history', docs);
    }); */
});


