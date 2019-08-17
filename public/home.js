(function(){
	var app_url=$('meta[name="app-url"]').attr('content');
	var app_port=$('meta[name="app-port"]').attr('content');

	// var socket=io(app_url+':'+app_port);
	var socket=io(app_url);
	$(document).ready(function(){


		$('.create-room button').click(function(){
			var roomid=$('.create-room input[name="room_id_create"]').val().trim();
			var bet_point=$('.create-room input[name="bet_point"]').val();
			if(roomid===''){
				return false;
			}
			else{
				$('.join-room button').attr('disabled','disabled');
				socket.emit('Create-room',{roomid:roomid,bet_point:bet_point});
			}
		});

		$('.join-room button').click(function(){
			var roomid=$('.join-room input').val().trim();
			if(roomid===''){
				return false;
			}
			else{
				$('.create-room button').attr('disabled','disabled');
				socket.emit('Join-room',roomid);
			}
		});

		socket.on('Create-room-success',function(data){
			$('.create-room form').submit();
		});

		socket.on('Create-room-fail',function(){
			$('.join-room button').removeAttr('disabled');
			alert('Tên phòng này đã được sử dụng');
		});

		socket.on('Not-enough-point-to-create',function(){
			$('.join-room button').removeAttr('disabled');
			alert('Không đủ số điểm !');
		});


		socket.on('Room-is-full',function(){
			alert('Phòng đã đầy!');
			$('.create-room button').removeAttr('disabled');
		});

		socket.on('Not-enough-point-to-join',function(){
			$('.create-room button').removeAttr('disabled');
			alert('Không đủ số điểm để vào phòng này!');
		});

		socket.on('Room-not-exist',function(){
			alert('Phòng không tồn tại!');
			$('.create-room button').removeAttr('disabled');
		});

		socket.on('Join-room-success',function(data){
			$('.join-room form').append('<input type="hidden" name="bet_point" value="'+data+'">');
			$('.join-room form').submit();
			//Join room
		});

	});

}())