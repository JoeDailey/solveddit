$(document).ready(function(){
    console.log(user);
	if(user != null && user != "null"){
		$("#navbar-main").append($('<li class="dropdown"><a href="/user/'+user.username+'" class="dropdown-toggle" data-toggle="dropdown">'+user.username+'<b class="caret"></b></a><ul class="dropdown-menu"><li><a href="/user/'+user.username+'">My Profile</a></li><li><a href="/logout">Logout</a></li></ul></li>'));
	}else{
		$("#navbar-main").append($('<li><a href="/auth">Sign In</a></li>'));
	}
});