(function(){
	var app_url=$('meta[name="app-url"]').attr('content');
	var app_port=$('meta[name="app-port"]').attr('content');

	var socket=io(app_url+':'+app_port);
	$(document).ready(function(){


		$('.create-room button').click(function(){
			var roomid=$('.create-room input').val().trim();
			if(roomid===''){
				return false;
			}
			else{
				$('.join-room button').attr('disabled','disabled');
				socket.emit('Create-room',roomid);
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


		socket.on('Room-is-full',function(){
			alert('Phòng đã đầy!');
			$('.create-room button').removeAttr('disabled');
		});

		socket.on('Room-not-exist',function(){
			alert('Phòng không tồn tại!');
			$('.create-room button').removeAttr('disabled');
		});

		socket.on('Join-room-success',function(){
			$('.join-room form').submit();
			//Join room
		});

	});

}())