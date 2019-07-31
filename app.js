var express = require('express');

var app = express();

// var session = require('express-session');

app.use(express.static("public"));
app.use(express.json());
// app.use(session());

app.set("view engine","ejs");
app.set("views","./views");

var server=require("http").createServer(app);

var io = require('socket.io')(server);

var fs=require('fs');

server.listen(3000);

// app.listen(3000);



//listen connection
io.on("connection",function(socket){

	console.log(socket.id + " connected");

	socket.on("disconnect",function(){
		
		if(typeof socket.username === 'undefined'){
			return false;
		}

		console.log(socket.id + " disconnected");
		//use array

		io.emit('Server-send-user-offline',socket.id);

		
	});

	socket.on('User-join',function(){

		var list_sockets=io.sockets.adapter.rooms;
		// console.log(list_sockets.length);
		var count=0;
		for(var s in list_sockets){
			count++;
			if(count > 1){
				break;
			}
		}

		if(count === 1){
			socket.emit('Set-turn',{signal:true,wait:true});
		}
		else{

			socket.broadcast.emit('Start-first');

			socket.emit('Set-turn',{signal:false,wait:false});	
		}		

		// socket.point=10;
	});

	socket.on("Client-send-mgs",function(msg){
		socket.broadcast.emit('Server-send-msg',msg);
	});

	socket.on('User-win',function(){
		socket.broadcast.emit('You-lose');
		// socket.emit('You-win');
	});

	socket.on('Change-turn',function(data){
		socket.broadcast.emit('Your-turn',data);
	})

});

app.get('/',function(req,res){
	res.render("play");

});

app.get('/create-user',function(req,res){
	res.render("createuser");

});
