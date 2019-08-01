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

	function loadCell() {
		var c = new Array();
		for (i = 0; i < SIZE[0]; i++) {
			c[i] = new Array();
		}
		var i, cells = document.getElementsByTagName("td");
		for (i = 0; i < cells.length; i++) {
			var cell = cells[i];
			var _pos, _r, _c;
			var r = getAttributes(cell);
			_pos = new String(r["cell"]);
			_r = eval(_pos.split(",")[0]);
			_c = eval(_pos.split(",")[1]);
			c[_r][_c] = cell;
		}

		return c;
	}
	var socket=io("http://localhost:3000");
var putable=false; //ko dc danh

var SIZE = [15, 20]; // so o chieu ngang, chieu doc

//SiZE[0]=row
//SIZE[1]=col


var CELL = initArray(); // mang luu diem
var COUNT=0;
var TABLE;
var X = true; // luot danh
var END = false;
var HCOLOR = 'pink';

var signal = new Array();
signal[X] = "<img src='http://l.yimg.com/us.yimg.com/i/mesg/emoticons7/19.gif'>";
signal[!X] = "<img src='http://l.yimg.com/us.yimg.com/i/mesg/emoticons7/31.gif'>";


var POINT = new Array();
POINT[X] = 1;
POINT[!X] = 2;

function repaint() {
	var i, j;
	var c, r, p;
	for (i = 0; i < SIZE[0]; i++) {
		for (j = 0; j < SIZE[1]; j++) {
			c = TABLE[i][j];
			//alert(i+"-"+j);
			r = getAttributes(c);
			p = eval(r["point"]);
			if (p == POINT[X]) {
				c.innerHTML = signal[X];
			} else if (p == POINT[!X]) {
				c.innerHTML = signal[!X];
			}
		}
	}
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
	TABLE = loadCell();
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

			if(w){
				socket.emit('User-win');
				swal("You win!", {
					buttons: false,
					className: "sweet-alert-win",
					timer: 2000,
				});
			}
			else{
				if(COUNT==15*20){
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
				TABLE[r][j].style.backgroundColor = HCOLOR;
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
				TABLE[i][c].style.backgroundColor = HCOLOR;
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
				TABLE[rhead--][j].style.backgroundColor = HCOLOR;
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
				TABLE[rhead++][j].style.backgroundColor = HCOLOR;
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


function generateReadyButton(el){
	el.append('<button class="player-ready-btn">Ready...</button>');
}

function countDown(){
	$('#ms_timer').countdowntimer({
		borderColor: "#3198cb",
		backgroundColor:"#3a656b",
		seconds : 15,
		size : "md",
		displayFormat: 'S',
		timeUp : timeisUp
	});
}

function timeisUp(){
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

	socket.emit('User-join');

	socket.on('Set-turn',function(data){
		X=data.signal;

		$('.player-me .user-username').html(data.username);

		if(typeof data.opponent !== 'undefined'){
			$('.player-opponent .user-username').html(data.opponent);
		}
		if(data.wait){
			//waiting opponent
		}
	});


	//for first player
	socket.on('Opponent-join',function(data){

		$('.player-opponent .user-username').html(data.opponent);

	});


	//for first player
	socket.on('Start-first',function(data){
		putable=true;
	});


	socket.on('Game-ready',function(){
		generateReadyButton($('.user'));

	});


	$(document).on('click','.player-me .player-ready-btn',function(){
		socket.emit('User-ready');
		$(this).siblings('.successAnimation').show();
		$(this).remove();
	});

	socket.on('Opponent-ready',function(){
		$('.player-opponent .player-ready-btn').remove();
		$('.player-opponent .successAnimation').show();
	})

	//for both players
	socket.on('Game-start',function(data){

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

		countDown();		

	});


	socket.on('Server-send-msg',function(msg){
		var message_item='<div class="message-item others"><span class="message-content">'+msg+'</span></div>';
		$('.list-message').append(message_item);
	});


	socket.on('You-lose',function(){
		putable=false;
		swal("You lose!", {
			buttons: false,
			className: "sweet-alert-lose",
			timer: 2000,
		});
	});

	socket.on('Your-turn',function(data){

		$("#ms_timer").countdowntimer("destroy");

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
	});


	socket.on('You-win',function(){
		swal("You win!", {
			buttons: false,
			className: "sweet-alert-win",
			timer: 2000,
		});
	});


	socket.on('Game-draw',function(){
		
		swal("Hòaa!!!", {
			buttons: false,
			className: "sweet-alert-win",
			timer: 2000,
		});

		putable=false;
		$('.player-me').removeClass('rainbow-border');
		$('.player-opponent').removeClass('rainbow-border');

	});


	socket.on('Game-end',function(){
		putable=false;
		$('.player-me').removeClass('rainbow-border');
		$('.player-opponent').removeClass('rainbow-border');
	});


	socket.on('Opponent-leave-room',function(){
		putable = false;

		swal({
			title: "Đối thủ đã thoát phòng chơi",
			icon: "warning",
			buttons: ['Ở lại','Rời phòng'],
			dangerMode: false,
		})
		.then((leaveRoom) => {
			if (leaveRoom) {

			}
		});
		$('.player-me').removeClass('rainbow-border');
		$('.player-opponent').removeClass('rainbow-border');

		$('.player-opponent .user-username').html('');
		$('.player-opponent .avatar').attr('src','');
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


