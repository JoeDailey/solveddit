$(document).ready(function(){
    console.log(user);
	if(user != null && user != "null"){
		$("#navbar-main").append($('<li class="dropdown"><a href="/user/'+user.username+'" class="dropdown-toggle" data-toggle="dropdown">'+user.username+'<b class="caret"></b></a><ul class="dropdown-menu"><li><a href="/user/'+user.username+'">My Profile</a></li><li><a href="/logout">Logout</a></li></ul></li>'));
	}else{
		$("#navbar-main").append($('<li><a href="/auth">Sign In</a></li>'));
	}

	$(".text-toggler").click(function(){
		$($(this).children('.glyphicon')).toggleClass('glyphicon-chevron-right');
		$($(this).children('.glyphicon')).toggleClass('glyphicon-chevron-down');
		$($($(this).parent()).children('.extra-text')).toggle();
	});
	$(".bonus-button").click(function(){
		if(user==null || user=="null") document.location.href = "/auth";
		else{
			if(user.points>0){
				$($($($($(this).parent()).parent()).parent()).children('.slider')).toggle();
				$($($(this).parent()).children('.bonus-button-comf')).toggle();
			}
		}
	});
	$('.slider').slider();
	$('.slider').css({
		"width":"96%",
		"margin-left":"2%",
		"margin-right":"2%"
	});
	$('.bonus-button-comf').hide();
	$('.slider').hide();
});