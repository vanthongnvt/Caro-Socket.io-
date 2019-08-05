var express = require('express');

var passport= require('passport');

var passportFB =require('passport-facebook').Strategy;

var session = require('express-session')({
	secret:'ldisfs',
	resave: true,
	saveUninitialized: true
});

var bodyParser=require('body-parser');

var flash=require('connect-flash');

require('dotenv').config();

var app = express();

var mongoose=require('mongoose');

var db=mongoose.connect(process.env.DB_URL,{ useNewUrlParser: true,useCreateIndex: true }, function (err) {

});

var userModel=require('./models/user');

var matchModel=require('./models/match');



app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.json());

app.use(session);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

app.set("view engine","ejs");
app.set("views","./views");

var server=require("http").createServer(app);

server.listen(process.env.PORT);

var io = require('socket.io')(server);

// var fs=require('fs');

function midAuth(req, res, next) {
	next();
	// if(req.isAuthenticated()){
	// 	next();
	// }
	// else{
	// 	res.redirect('/login');
	// }
}

function sessionMiddleware(req,res, next){

}
io.use(function(socket, next){
	session(socket.request, {}, next);
});



app.get('/create-session',function(req,res){
	req.session.user={
		id:'2324242',
		name:'thonos',
		avatar:'/3224',
		point:'33535',
	};
	res.send('ok');
})


//listen connection
io.on("connection",function(socket){


	// socket.handshake.session.userdata = userdata;
	// socket.handshake.session.save();

	console.log(socket.request.session.user);

	socket.on("disconnect",function(){



		// console.log(socket.id + " disconnected, isplay:" + socket.play);

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


	socket.on('Create-room',function(room_id){

		var room =io.sockets.adapter.rooms[room_id];

		if(typeof room !=='undefined'){
			socket.emit('Create-room-fail');
		}
		else{
			socket.emit('Create-room-success',room_id);
		}

	});

	socket.on('Join-room',function(room_id){

		var playerinRoom =io.sockets.adapter.rooms[room_id];

		if(typeof playerinRoom !=='undefined'){

			if(playerinRoom.length===2){
				socket.emit('Room-is-full');
			}
			else{
				socket.emit('Join-room-success');
			}
		}
		else{
			socket.emit('Room-not-exist');
		}
	})

	socket.on('User-join-room',function(room){

		socket.join(room.roomid);
		socket.roomId=room.roomid;

		socket.ready=false;
		socket.play=false;


		var playerinRoom =io.sockets.adapter.rooms[room.roomid];

		if(playerinRoom.length === 3){

			socket.leave('Caro');

			socket.emit('Room-is-full');
		}
		else{
			socket.betPoint=room.bet_point;

			//first player
			if(playerinRoom.length === 1){


				socket.playfirst=true;

				socket.emit('Init-player',{wait:true,user:socket.request.session.user});
			}

			//second player
			else{

				socket.playfirst=false;

				for(var id in playerinRoom.sockets){

					if(id!==socket.id){
						var sfirst = io.sockets.connected[id];
						socket.emit('Init-player',{wait:false, user:socket.request.session.user, opponent: sfirst.request.session.user,roomInf:{
							id:sfirst.roomId,
							bet_point:sfirst.betPoint
						}});
						break;
					}
				}

				socket.broadcast.to(socket.roomId).emit('Opponent-join',{opponent:socket.request.session.user});

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

app.get('/',midAuth,function(req,res){

	// res.redirect('/login');

	res.render('home');
});

app.post('/create-room',midAuth,function(req,res){

	var params=req.body;

	// console.log(params);

	var bet_point=params.bet_point===''?0:parseInt(params.bet_point);

	if(bet_point<0){
		bet_point=0;
	}
	else if(bet_point>100){
		bet_point=100;
	}

	req.flash('room',{id:params.room_id_create,betPoint:bet_point});
	res.redirect('/play');

});

app.post('/join-room',midAuth,function(req,res){

	var params=req.body;

	req.flash('room',{id:params.room_id_join});
	res.redirect('/play');

});

app.get('/play',midAuth,function(req,res){

	var room=req.flash('room');
	
	if(room.length===0){
		
		return res.redirect('/');
	}
	// console.log(room[0].id);

	res.render("play",{
		roomId:room[0].id,
		betPoint:room[0].betPoint,
		user:req.user,
	});

});

app.get('/login',function(req,res){
	res.render('login');
});

app.get('/fb-login',passport.authenticate('facebook',{scope:['email']}));

app.get('/auth/fb',passport.authenticate('facebook',{
	failureRedirect:'/login',
	successRedirect:'/'
}));


passport.use('facebook',new passportFB({
	clientID:process.env.FACEBOOK_CLIENT_ID,
	clientSecret:process.env.FACEBOOK_CLIENT_SECRET,
	callbackURL: process.env.APP_URL + "/auth/fb",
	profileFields:['email','displayName','avatar']
},function(accessToken, refreshToken, profile, done){
	var get_profile=profile._json;

	userModel.findOne({id:get_profile.id},function(err,user){
		if(err) return done(err);
		if(user) {
			done(null,user);
		}

		var newUser= new userModel({
			id:get_profile.id,
			name:get_profile.name,
			email:get_profile.email,
			avatar:get_profile.avatar,
			point:500
		});

		newUser.save(function(err){
			return done(null,newUser);
		});
	})
}));

passport.serializeUser(function(user,done){
	done(null,user.id);
});

passport.deserializeUser(function(id,done){
	//get user
	userModel.findOne({id:id},function(err,user){
		done(null,user);
	})
})
