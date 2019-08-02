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

// var fs=require('fs');

server.listen(3000);

// app.listen(3000);



//listen connection
io.on("connection",function(socket){

	console.log(socket.id + " connected");

	socket.on("disconnect",function(){
		
		

		console.log(socket.id + " disconnected, isplay:" + socket.play);

		if(socket.play){
			socket.broadcast.to(socket.roomId).emit('You-win');
		}

		//set playfirst=true for other socket

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		if(typeof playerinRoom !== 'undefined'){

			for(var id in playerinRoom.sockets){
				var s = io.sockets.connected[id];

				s.playfirst = true;
				s.ready=false;
				s.play=false;
			}

			socket.broadcast.to(socket.roomId).emit('Opponent-leave-room');
		}
		
	});

	socket.on('User-join-room',function(){

		socket.join('Caro');
		socket.roomId='Caro';

		socket.ready=false;
		socket.play=false;


		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		if(playerinRoom.length === 3){

			socket.leave('Caro');

			socket.emit('Room-is-full');
		}
		else{

			if(playerinRoom.length === 1){

				socket.playfirst=true;

				socket.emit('Init-player',{wait:true,username:'player1'});
			}
			else{

				socket.playfirst=false;

				socket.emit('Init-player',{wait:false, username:'player2', opponent: 'player1'});

				socket.broadcast.to(socket.roomId).emit('Opponent-join',{opponent:'player2'});

				io.to(socket.roomId).emit('Game-ready');

				
			}		
		}
		// socket.point=10;
	});

	socket.on('User-ready',function(){

		if(socket.play===true) return;

		socket.ready=true;
		
		socket.broadcast.to(socket.roomId).emit('Opponent-ready');

		//if both ready
		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		for(var id in playerinRoom.sockets){

			if(id!==socket.id){
				var s = io.sockets.connected[id];

				if(s.ready===true){
					if(socket.playfirst===true){
						socket.emit('Game-start',true);
						s.emit('Game-start',false);
					}
					else{
						socket.emit('Game-start',false);
						s.emit('Game-start',true);
					}

					// io.to(socket.roomId).emit('Game-start');

					s.play=true;

					socket.play=true;
				}
			}
		}

		//io.to(socket.roomId).emit('Game-start');
	})

	socket.on("Client-send-mgs",function(msg){
		socket.broadcast.to(socket.roomId).emit('Server-send-msg',msg);
	});

	socket.on('User-win',function(data){

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		for(var id in playerinRoom.sockets){

			var s = io.sockets.connected[id];
			s.play=false;
			s.ready=false;
			s.playfirst=false;
		}

		socket.playfirst=true;


		socket.broadcast.to(socket.roomId).emit('You-lose',data);

		io.to(socket.roomId).emit('Game-end',true);
	});

	socket.on('Change-turn',function(data){
		socket.broadcast.to(socket.roomId).emit('Your-turn',data);
	});

	socket.on('No-cell-left',function(){

		//false is draw
		io.to(socket.roomId).emit('Game-end',false);

		var playerinRoom =io.sockets.adapter.rooms[socket.roomId];

		for(var id in playerinRoom.sockets){

			var s = io.sockets.connected[id];
			s.play=false;
			s.ready=false;
		}
	})

});

app.get('/',function(req,res){
	res.render("play");

});

app.get('/create-user',function(req,res){
	res.render("createuser");

});
