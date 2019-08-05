(function(){
	function initArray() {
		var i, j;
		var c = new Array();
		for (i = 0; i < SIZE[0]; i++) {
			c[i] = new Array();
			for (j = 0; j < SIZE[1]; j++)
				c[i][j] = 0;
		}
		return c;
	}

	var app_url=$('meta[name="app-url"]').attr('content');
	var app_port=$('meta[name="app-port"]').attr('content');

	var roomid=$('meta[name="room-id"]').attr('content');

	var bet_point=$('meta[name="bet-point"]').attr('content');

	var socket=io(app_url+':'+app_port);


var putable=false; //ko dc danh

var SIZE = [15, 20]; // so o chieu ngang, chieu doc

//SIZE[0]=row
//SIZE[1]=col


var CELL; // mang luu diem
var COUNT=0;
var X = false; // luot danh
var END = false;
var COUNTDOWN;

var signal = new Array();
signal[X] = "<img src='19.gif'>";
signal[!X] = "<img src='31.gif'>";


var POINT = new Array();
POINT[X] = 1;
POINT[!X] = 2;

function initGlobalVariable(){
	X=false;
	putable=false;
	CELL=initArray();
	COUNT=0;
	END=false;

}

function clearBoard(){
	$('.cell').attr('point',0).html('');
	$('.mark-win').removeClass('mark-win');
	$('input[name="message"]').removeAttr('disabled');
}

// ve ban co
function drawBoard() {
	var i, j;
	sBoard = "<table border='0px' cellpadding=0 cellspacing=1 bgcolor=#CCCCCC>";
	for (i = 0; i < SIZE[0]; i++) {
		sBoard += "<tr>";
		for (j = 0; j < SIZE[1]; j++) {
			sBoard += "<td bgcolor=#FFFFFF class='cell' cell='" + i + "," + j + "' point=0>&nbsp;</td>";
		}
		sBoard += "</tr>";
	}
	sBoard += "</table>";
	$('.table').append(sBoard);
}

// gan su kien click va xu ly
function addCellEvent() {
	var cells = document.getElementsByTagName("td");
	var i;
	var kt=0;
	for (i = 0; i < cells.length; i++) {
		cells[i].onclick = function() {
			if(putable===false){
				return;
			}
			if (END) {
				// warn("Xong rồi. Đồ con g�!");
				return;
			}
			var r;
			r = getAttributes(this);
			if (r["point"] != 0) { 

				// o da duoc danh dau
				return;
			}
			//het luot danh
			putable=false;
			COUNT++;

			setPoint(this, POINT[X]);
			this.innerHTML = signal[X];

			var _pos, _r, _c;
			_pos = new String(r["cell"]);
			_r = eval(_pos.split(",")[0]);
			_c = eval(_pos.split(",")[1]);
			CELL[_r][_c] = POINT[X];

			// log(_r + "," + _c + " = " + CELL[_r][_c]);

			var w = checkWin(_r, _c);

			socket.emit('Change-turn',{r:_r,c:_c});
			clearInterval(COUNTDOWN);

			COUNTDOWN=countDown();

			if(w){
				socket.emit('User-win',{r:_r,c:_c});
				resultGameAlert(1);
			}
			else{
				if(COUNT==SIZE[0]*SIZE[1]){
					socket.emit('No-cell-left');
				}
				else{
					$('.player-me').toggleClass('rainbow-border');
					$('.player-opponent').toggleClass('rainbow-border');
				}
			}

		}}

	}


// kiem tra sau khi danh o r,c da co ai thang chua
function checkWin(r, c) {
	var i, j;
	var t, v = CELL[r][c], nv, pv;
	var rhead, rtail;
	var chead, ctail;
	var ck_blockheads=false;
	// cung hang
	t = 1;
	chead = c;
	rhead = r;
	rtail = r;
	ctail = c;
	for (j = c + 1; j < SIZE[1]; j++) {
		nv = CELL[r][j];
		if (nv == v) {
			t += 1;
			ctail = j;
		}
		else
			break;
	}
	for (j = c - 1; j >= 0; j--) {
		pv = CELL[r][j];
		if (pv == v) {
			t += 1;
			chead = j;
		}
		else
			break;
	}
	
	if (t >= 5) {

		//check chan 2 dau
		if(t==5&&(chead-1>=0&&ctail+1<SIZE[1]&&CELL[r][chead-1]===POINT[!X]&&CELL[r][ctail+1]===POINT[!X])){
			ck_blockheads=true;
		}
		if(t>5||!ck_blockheads){
			// highlight
			for (j = chead; j <= ctail; j++) {
				$('td[cell="' + r + ',' + j + '"]').addClass('mark-win');
			}
			END = true;
			return true;
		}
	}
	// cung cot
	t = 1;
	chead = c;
	rhead = r;
	rtail = r;
	ctail = c;
	for (i = r + 1; i < SIZE[0]; i++) {
		nv = CELL[i][c];
		if (nv == v) {
			t += 1;
			rtail = i;
		}
		else
			break;
	}
	for (i = r - 1; i >= 0; i--) {
		pv = CELL[i][c];
		if (pv == v) {
			t += 1;
			rhead = i;
		}
		else
			break;
	}
	if (t >= 5) {
		
		//check chan 2 dau
		if(t==5&&(rhead-1>=0&&rtail+1<SIZE[0]&&CELL[rhead-1][c]===POINT[!X]&&CELL[rtail+1][c]===POINT[!X])){
			ck_blockheads=true;
		}
		if(t>5||!ck_blockheads){
			// highlight
			for (i = rhead; i <= rtail; i++) {
				$('td[cell="' + i + ',' + c + '"]').addClass('mark-win');
			}
			END = true;
			return true;
		}
	}
	// cheo /
	chead = c;
	ctail = c;
	rhead = r;
	rtail = r;
	t = 1;
	i = r - 1;
	for (j = c + 1; j < SIZE[1]; j++) {
		if (i < 0) break;
		pv = CELL[i--][j];
		if (pv == v) {
			t += 1;
			ctail = j;
			rtail = i+1;
		}
		else
			break;
	}
	i = r + 1;
	for (j = c - 1; j >= 0; j--) {
		if (i >= SIZE[0]) break;
		pv = CELL[i++][j];
		if (pv == v) {
			t += 1;
			chead = j;
			rhead = i-1;
		}
		else
			break;
	}
	if (t >= 5) {
		
		//check chan 2 dau
		if(t==5&&(rhead+1<SIZE[0]&&chead-1>=0&&rtail-1>=0&&ctail+1<SIZE[1]&&CELL[rhead+1][chead-1]===POINT[!X]&&CELL[rtail-1][ctail+1]===POINT[!X])){
			ck_blockheads=true;
		}
		if(t>5||!ck_blockheads){
			END = true;
			for (j = chead; j <= ctail; j++) {
				$('td[cell="' + rhead + ',' + j + '"]').addClass('mark-win');
				rhead--;
			}
			return true;
		}
	}
	// cheo \
	chead = c;
	ctail = c;
	rhead = r;
	rtail = r;
	t = 1;
	i = r + 1;
	for (j = c + 1; j < SIZE[1]; j++) {
		if (i >= SIZE[0]) break;
		pv = CELL[i++][j];
		if (pv == v) {
			t += 1;
			ctail = j;
			rtail = i-1;
		}
		else
			break;
	}
	i = r - 1;
	for (j = c - 1; j >= 0; j--) {
		if (i < 0) break;
		pv = CELL[i--][j];
		if (pv == v) {
			t += 1;
			chead = j;
			rhead = i+1;
		}
		else
			break;
	}
	if (t >= 5) {

		//check chan 2 dau
		if(t==5&&(rhead-1>=0&&chead-1>=0&&rtail+1<SIZE[0]&&ctail+1<SIZE[1]&&CELL[rhead-1][chead-1]===POINT[!X]&&CELL[rtail+1][ctail+1]===POINT[!X])){
			ck_blockheads=true;
		}
		if(t>5||!ck_blockheads){
			END = true;
			for (j = chead; j <= ctail; j++) {
				$('td[cell="' + rhead + ',' + j + '"]').addClass('mark-win');
				rhead++;
			}
			return true;
		}
	}	
}

// thay doi diem cho o (khi duoc danh dau)
function setPoint(cell, value) {
	cell.attributes.getNamedItem("point").value = value;
}

// lay toan bo cac attribute cua o, tra ve mang dang dictionary
function getAttributes(cell) {
	var r = new Array();
	var as = cell.attributes;
	for (i = 0; i < as.length; i++) {
		r[as[i].name] = as[i].value;
	}
	return r;
}



function overlay(text){

	$('.overlay').remove();
	$('.table').append('<div class="overlay"><div class="overlay-text">'+text+'</div></div>');
}


function resultGameAlert(type){
	var el;
	if(type===1){
		el='<div class="mswal-result mswal-alert-win"><div class="mswal-title">Bạn thắng! '+signal[X]+'</div></div>';
	}
	else if(type===2){
		el='<div class="mswal-result mswal-alert-lose"><div class="mswal-title">Bạn thua! '+signal[X]+'</div></div>';
	}
	else if(type===0){
		el='<div class="mswal-result mswal-alert-draw"><div class="mswal-title">Hòaaa!! '+signal[X]+'</div></div>';
	}
	$('.header').append(el);

	// $('.mswal-result').animate({top:'50%'},500);

	$('.mswal-result').animate({top:'50%'},500).delay(2000).fadeOut(1000,function(){
		$(this).remove();	
	});

}

function CountdownTimer(element,setup,callbackFinish){
	
	var seconds=setup.seconds-1;

	var interval=setInterval(function(){
		element.html(seconds);
		if(seconds==0){
			if(callbackFinish!==null){
				callbackFinish();
			}
			clearInterval(interval);
		}
		seconds--;
	},1000);
	return interval;
}

function countDown(callback=null){
	$('#countdown-sec').html(15);
	return CountdownTimer($('#countdown-sec'),{
		seconds:15,
	},callback);

}

function stopCountDown(){
	clearInterval(COUNTDOWN);
}

function setZeroCountDown(){
	clearInterval(COUNTDOWN);
	$('#countdown-sec').html('0');
}

function timeisUp(){

	COUNTDOWN=countDown();

	if(putable){
		putable=false;
		socket.emit('Change-turn',false);
	}
	$('.player-me').toggleClass('rainbow-border');
	$('.player-opponent').toggleClass('rainbow-border');
}

$(document).ready(function(){
	drawBoard();
	addCellEvent();

	// resultGameAlert(1);

	socket.emit('User-join-room',{roomid:roomid,bet_point:bet_point});

	socket.on('Room-is-full',function(){
		alert('Phòng đã đầy!');
		(window).location.href='/';
	});

	socket.on('Init-player',function(data){

		$('.player-me .user-username').html(data.user.name);
		$('.player-me .user-avatar').attr('src',data.user.avatar);
		$('.player-me .user-point').html(data.user.point);

		if(typeof data.opponent !== 'undefined'){
			$('.player-opponent .user-username').html(data.opponent.name);
			$('.player-me .user-avatar').attr('src',data.opponent.avatar);
			$('.player-me .user-point').html(data.opponent.point);
		}

		//first palayer
		if(data.wait){

			$('.player-opponent .user-avatar').attr('src','/avatarloader.gif');
			//waiting opponent
			var text='<div>Đang chờ đối thủ</div> <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
			overlay(text);

		}

		//second player
		else{
			bet_point=data.roomInf.bet_point;
			
			$('.roomId input[name="roomId"]').val(data.roomInf.id);

			$('.roomId input[name="bet_point"]').val(data.roomInf.bet_point);
			overlay('<button class="player-ready-btn">Sẵn sàng</button>');
		}
	});


	//for first player
	socket.on('Opponent-join',function(data){

		$('.player-opponent .user-username').html(data.opponent);

	});

	//for both player
	socket.on('Game-ready',function(){
		initGlobalVariable();
		overlay('<button class="player-ready-btn">Sẵn sàng</button>');
	});


	$(document).on('click','.player-ready-btn',function(){
		var text='<div>Chờ đối thủ sẵn sàng</div> <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
		$('.overlay-text').html(text);
		socket.emit('User-ready');
		$('.player-me .successAnimation').show();
	});

	socket.on('Opponent-ready',function(){
		$('.player-opponent .successAnimation').show();
	})


	//for first player
	// socket.on('Start-first',function(data){
	// 	putable=true;
	// });


	//for both players
	socket.on('Game-start',function(data){

		clearBoard();

		$('.option button').removeAttr('disabled');

		if(data==true){
			putable=true;
			X=true;
		}

		$('.overlay').remove();

		$('.successAnimation').hide();

		$('.player-me').append($(signal[X]).addClass('player-signal'));

		$('.player-opponent').append($(signal[!X]).addClass('player-signal'));


		if(putable){
			$('.player-me').toggleClass('rainbow-border');
		}
		else{
			$('.player-opponent').toggleClass('rainbow-border');
		}


		//start game
		if(data==true){
			COUNTDOWN=countDown(timeisUp);
		}
		else{
			COUNTDOWN=countDown();
		}		

	});


	socket.on('Server-send-msg',function(msg){
		var message_item='<div class="message-item others"><span class="message-content">'+msg+'</span></div>';
		$('.list-message').append(message_item);
	});


	socket.on('You-lose',function(data){
		putable=false;
		checkWin(data.r,data.c);
		resultGameAlert(2);
	});

	socket.on('Your-turn',function(data){

		clearInterval(COUNTDOWN);

		putable=true;
		if(data!==false){
			CELL[data.r][data.c]=POINT[!X];
			var cell=$('td[cell="' + data.r + ',' + data.c + '"]');
			cell.html(signal[!X]);
			cell.attr('point',POINT[!X]);
			COUNT++;
		}
		$('.player-me').toggleClass('rainbow-border');
		$('.player-opponent').toggleClass('rainbow-border');

		COUNTDOWN = countDown(timeisUp);
	});

	//opponent leave
	socket.on('You-win',function(){
		resultGameAlert(1);

		setZeroCountDown();
	});


	$('.request-lose button').click(function(){
		alert('Chưa dùng đc');
		// socket.emit('User-request-lose');
	});

	$('.request-draw button').click(function(){
		alert('Chưa dùng đc');
		// socket.emit('User-request-draw');
	});

	//both player
	socket.on('Game-end',function(isWin){
		setZeroCountDown();

		if(isWin==false){
			//draw
			resultGameAlert(0);
		}

		$('.option button').attr('disabled','disabled');
		
		$('.player-me').removeClass('rainbow-border');
		$('.player-opponent').removeClass('rainbow-border');

		//new game

		setTimeout(function(){
			initGlobalVariable();
			overlay('<button class="player-ready-btn">Sẵn sàng</button>');
		},4000);

	});


	socket.on('Opponent-leave-room',function(){
		putable = false;
		var text='<div>Đang chờ đối thủ</div> <div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';
		overlay(text);

		swal({
			title: "Đối thủ đã thoát phòng chơi",
			icon: "warning",
			buttons: ['Ở lại','Rời phòng'],
			dangerMode: false,
		})
		.then((leaveRoom) => {
			if (leaveRoom) {
				(window).location.href='/';
			}
			
		});

		$('.option button').attr('disabled','disabled');

		$('.player-me').removeClass('rainbow-border');
		$('.player-opponent').removeClass('rainbow-border');
		$('.successAnimation').hide();
		$('.player-opponent .user-username').html('');
		$('.player-opponent .user-avatar').attr('src','/avatarloader.gif');
		$('.player-opponent .user-point').html('');
		$('.player-signal').remove();
	});




	$('button[name="submit-msg"]').click(function(){
		var msg=$("input[name='message']").val().trim();
		$("input[name='message']").val('');
		if(msg==='') return false;
		socket.emit('Client-send-mgs',msg);

		var message_item='<div class="message-item owner"><span class="message-content">'+msg+'</span></div>';

		$('.list-message').append(message_item);
	});
});
})();


