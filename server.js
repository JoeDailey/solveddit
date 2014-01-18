//Database Start//////////////////////////////////////////////////////////////////////////
var fs = require("fs");
////////CREATE DATABSE IF IT DOESN'T EXIST
var file = "db.sqlite3";
var exists = fs.existsSync(file);
if (!exists) {
    console.log("Creating DB file.");
    fs.openSync(file, "w");
}
var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);
if (!exists) {
    db.serialize(function() {
        db.run('CREATE TABLE "unregistered_users" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE , "name" VARCHAR(70) NOT NULL , "email" VARCHAR(90) NOT NULL  UNIQUE , "password" VARCHAR(50) NOT NULL , "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
        db.run('CREATE TABLE "users" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE , "name" VARCHAR(70) NOT NULL , "email" VARCHAR(90) NOT NULL  UNIQUE , "password" VARCHAR(50) NOT NULL , "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
    });
}
/////////END CREATE DATABASE
//Database End/////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//Set Up Start///////////////////////////////////////////////////////////////////////////
var $ = require('jQuery');
//rendering/////////////////////////////////////////////////////////////////////////////// 
var express = require('express');
var captifeye = express();
captifeye.set('view engine', 'ejs');
//email////////////////////////////////////////////////////////////////////////////////////
var email_templates = require('email-templates');
var nodemailer = require('nodemailer');
var mailer = nodemailer.createTransport("SMTP",{
   service: "Gmail",
   auth: {
       user: "captifeye@gmail.com",
       pass: "Captifizzle"
   }
});
//path/////////////////////////////////////////////////////////////////////////////////////
captifeye.use("/static", express.static(__dirname + '/static')); //static
//cookies//////////////////////////////////////////////////////////////////////////////////
captifeye.use(express.cookieParser('my secret here'));
//body parsing/////////////////////////////////////////////////////////////////////////////
captifeye.use(express.bodyParser());
captifeye.set('view options', {
    layout: false
});
//setup password encryption
var bcrypt = require('bcrypt');
console.log(bcrypt);
//encrypt password -> callback(err, hash)
var cryptPassword = function(password, callback) {
   bcrypt.genSalt(10, function(err, salt) {
    if (err) return callback(err);
      else {
        bcrypt.hash(password, salt, function(err, hash) {
            return callback(err, hash);
        });
      }
  });
};
//decript password -> callback(bool matches)
var comparePassword = function(password, userPassword, callback) {
   bcrypt.compare(password, userPassword, function(err, isPasswordMatch) {
      if (err) return callback(err);
      else return callback(null, isPasswordMatch);
   });
};
//start server
captifeye.listen(9000);
//Set Up End///////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//RoutingStart///////////////////////////////////////////////////////////////////////////
//---------------------------------------------/////-landing page |home<--cookie-->admin|
captifeye.get('/', function(req, res){
    console.log("Sending base");
    res.render("base", {});
});
//---------------------------------------------/////-forced-landing page
//---------------------------------------------/////-signup + logins
captifeye.get('/auth', function(req, res){
    res.render("auth", {});
});
//Routing End///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Login/Logout Start//////////////////////////////////////////////////////////////////////
//---------------------------------------------/////-register
captifeye.post("/login", function(req, res){
    var email = req.body.email;
    var password = req.body.password;
    db.serialize(function(){
        db.get('SELECT * FROM users WHERE email="'+email+'";', function(err, row){
            if(err==null){
                if(row!=undefined){//exists
                    console.log(row.password+", "+password);
                    comparePassword(password, row.password, function(nul, match){
                        console.log("match:"+match);
                        if(match == true){
                            console.log("setting cookie")
                            res.cookie('email', ""+row.email, { maxAge: 3600000, signed: true });
                            res.redirect("/");
                        }else{
                            res.send("304");
                        }
                    });
                }else{//does not exist
                    res.send({status:404});
                }
            }else{//err
                console.log("log: " + err);
                res.send({status:404});
            }
        });
    });
});
//---------------------------------------------/////-register
captifeye.post("/register", function(req, res){
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;
    db.serialize(function(){
        db.get('SELECT * FROM users WHERE email="'+email+'";', function(checkErr, checkRow){
            console.log("error: "+checkErr+", row:"+checkRow)
            if(checkErr==null){
                if(checkRow==undefined){
                    cryptPassword(password, function(cryptErr, hash){
                        console.log(cryptErr)
                        db.run('INSERT INTO unregistered_users (name,email,password) VALUES ("'+name+'","'+email+'","'+hash+'");', function(err){
                            console.log("err:"+err+" post-run");
                            if(err==null){
                                db.get('SELECT * FROM unregistered_users WHERE email="'+email+'";', function(error, row){
                                    console.log("error:"+error+" post-run");
                                    if(error==null){
                                        mailer.sendMail({
                                            from: "Captifeye Account Registration <noreply@captifeye.com>", // sender address
                                            to: name + "<" + email + ">", // comma separated list of receivers
                                            subject: "Account Registration", // Subject line
                                            text: "follow this link to register your account: localhost:7000/register/"+id2url(row.id) // plaintext body
                                        }, function(mail_error, response){
                                            if(mail_error){
                                                console.log(mail_error);
                                                res.send({status:500});
                                            }else{
                                                console.log("Message sent: " + response.message);
                                                res.redirect("/activate");
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                }else{
                    res.send({status:304});
                }
            }else{
                res.send({status:500});
            }
        });  
    });
});
//---------------------------------------------/////-activate
captifeye.get("/activate", function(req, res){
    if (req.signedCookies.email == undefined) {
        res.render("activate", {});
    }else
        res.redirect("/");
});
//---------------------------------------------/////-activate
captifeye.get("/register/:token", function(req, res){
    var query = 'SELECT * FROM unregistered_users WHERE id = "'+url2id(req.params.token)+'"';
    db.serialize(function(){
        db.get(query, function(err, row){
            console.log(err +", "+ row);
            if(err==null && row!=undefined)
                console.log("row:" +row);
                db.run('INSERT INTO users (name,email,password) VALUES ("'+row.name+'","'+row.email+'","'+row.password+'");', function(err){
                    if(err)
                        res.render("error", {errorNumber:"Something went wrong!",
                                             comment:"Your account was not added, we are working on it."});
                    else{
                        console.log("Logging Cookie");

                        res.cookie('email', row.email, { maxAge: 3600000, signed: true });
                        res.redirect("/");
                        db.run('DELETE FROM unregistered_users WHERE id='+row.id+';');
                    }
                })
        });
    });
});
//---------------------------------------------/////-logout
captifeye.get('/logout', function(req, res){
  res.clearCookie('email');
  res.redirect('/');
});
//Login/Logout END//////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//API Start///////////////////////////////////////////////////////////////////////////////

//API End///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//404 Error start/////////////////////////////////////////////////////////////////////////
captifeye.get("*", function(req, res){
    res.render('error', {
        "errorNumber":404,
        "comment":"sorry, lulz"
    });
});
//404 Error end/////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Misc Start//////////////////////////////////////////////////////////////////////////////
//base cookie check and navigation building
var getUser = function(req, res, unloggedRedirect, callback){
    console.log("getUser");
    if (req.signedCookies.email == undefined) {   
        res.redirect(unloggedRedirect);
    } else {
        db.serialize(function(){
            console.log("serialize");
            db.get("SELECT * FROM users WHERE email='"+req.signedCookies.email+"';", function(err, user){
                console.log("get users");
                if(err) res.render("error", { errorNumber:"ERROR!", comment:JSON.stringify(err)});
                else{
                     db.all('SELECT * FROM locations WHERE user_id="'+user.id+'";', function(err, locations){
                        console.log("all locations");
                        if(err){ res.render("error", { errorNumber:"ERROR!", comment:JSON.stringify(err)}); console.log(err)}
                        else{
                            var posts = [{name:"Bill Bong",
                                          time:"45 mins",
                                          url:"url",
                                          image:"static/admin/assets/img/avatar2.jpg",
                                          locaion:"The Nitty Gritty",
                                          deal:"Drunkest Birthday"}];
                            var notificationAlertCount = "";
                            if(posts.length != 0)
                                notificationAlertCount = '<span class="badge">'+posts.length+'</span>';
                            var notificationsHTML = "";
                            for(var i = 0; i < posts.length; i++){
                                notificationsHTML+='<li><a href="'+posts[i].url+'"><span class="photo"><img src="'+posts[i].image+'" alt=""/></span><span class="subject"><span class="from">'+posts[i].name+'</span><span class="time">'+posts[i].time+'</span></span><span class="message">@'+posts[i].locaion+'For '+posts[i].deal+'</span></a></li>'
                            }
                            console.log("Loc: " + JSON.stringify(locations));
                            var locationsHTML = "";
                            for(var j = 0; j < locations.length; j++){
                                locationsHTML+='<li><a href="/admin/'+id2url(locations[j].id)+'">'+locations[j].name+'</a></li>'
                            }
                            var data = {
                                "user":user,
                                "name":user.name, 
                                "notificationCount":posts.length,
                                "notificationAlertCount":notificationAlertCount,
                                "notificationsHTML":notificationsHTML,
                                "locations":locationsHTML
                            };
                            console.log("callingback");
                            callback(data);
                        }
                    });
                }
            });
        });
    }
}
//base 36 (a->z+0->9)
function url2id(url){
    return parseInt(url, 36);
}
function id2url(id){
    return id.toString(36);
}

//Misc End//////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
