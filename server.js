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
        db.run('CREATE TABLE "questions" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE, "userid" INTEGER, "content" VARCHAR(1024), "pointsadded" INTEGER, "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
        db.run('CREATE TABLE "answers" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE, "userid" INTEGER, "questionid" INTEGER, "content" VARCHAR(1024), "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
        //userid is who voted
        db.run('CREATE TABLE "questionvotes" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE, "questionid" INTEGER, "userid" INTEGER, "positive" BOOLEAN, "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
        db.run('CREATE TABLE "answervotes" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE, "answerid" INTEGER, "userid" INTEGER, "positive" BOOLEAN, "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
        db.run('CREATE TABLE "users" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE , "name" VARCHAR(70) NOT NULL , "password" VARCHAR(61) NOT NULL, "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');

        //fake data
        db.run("INSERT INTO users (id, name, password) VALUES (1, 'Lucas', 'myencryptedpassword'); ");
        db.run("INSERT INTO questions (userid, content) VALUES (1,'Whats up?'); ");
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
       user: "solveddit.noreply@gmail.com",
       pass: "solveddit!"
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
//decrypt password -> callback(bool matches)
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
//---------------------------------------------/////-landing page
captifeye.get('/', function(req, res){
    // console.log("Sending base");
    var questions = []; 
    db.serialize(function(){
        db.all('SELECT * FROM questions as q INNER JOIN users as u on u.id = q.userid', function(err, rows){
            if(err==null){//no error
                for (var i = 0; i < rows.length; i++) {
                    questions.push({
                        "heading": rows[i].name,
                        "text": rows[i].content
                    });
                };
                res.render("base", {
                    questions: questions
                });
            }
        });
    });
    
});
//---------------------------------------------/////-signup + logins
captifeye.get('/auth', function(req, res){
    res.render("auth", {});
});
//Routing End///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Login/Logout Start//////////////////////////////////////////////////////////////////////
//---------------------------------------------/////-register
captifeye.post("/login", function(req, res){
    var name = req.body.username;
    var password = req.body.password;
    db.serialize(function(){
        db.get('SELECT * FROM users WHERE name="'+name+'";', function(err, row){
            if(err==null){
                if(row!=undefined){//exists
                    console.log(row.password+", "+password);
                    comparePassword(password, row.password, function(nul, match){
                        console.log("match:"+match);
                        if(match == true){
                            console.log("setting cookie")
                            res.cookie('name', ""+row.name, { maxAge: 3600000, signed: true });
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
    var name = req.body.username;
    var password = req.body.password;
    console.log(name +", "+password)
    db.serialize(function(){
        db.get('SELECT * FROM users WHERE name="'+name+'";', function(checkErr, checkRow){
            if(checkErr==null){
                if(checkRow==undefined){
                    cryptPassword(password, function(cryptErr, hash){
                        db.run('INSERT INTO users (name, password) VALUES ("'+name+'","'+hash+'");', function(err){
                            if(err==null){
                                res.cookie('name', ""+name, { maxAge: 3600000, signed: true });
                                res.redirect("/");
                            }
                        });
                    });
                }else{
                    res.send({status:304});
                }
            }else{
                console.log(checkErr);
                res.send(checkErr);
            }
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
        "errorMessage":"sorry, lulz"
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
