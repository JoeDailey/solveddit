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
        db.run('CREATE TABLE "users" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE , "name" VARCHAR(70) NOT NULL UNIQUE, "password" VARCHAR(61) NOT NULL, "points" INTEGER NOT NULL  DEFAULT 0, "points_ever" INTEGER NOT NULL  DEFAULT 0 "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
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
//---------------------------------------------/////-landing page
captifeye.get('/', function(req, res){
    getUser(req, function(user){
        res.render("base", {
            user:JSON.stringify(user),
            content:"Lucas, hi"
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
        "user":JSON.stringify({username:"Lucas"}),
        "errorNumber":404,
        "errorMessage":"sorry, lulz"
    });
});
//404 Error end/////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Misc Start//////////////////////////////////////////////////////////////////////////////
//base cookie check and navigation building
var getUser = function(req, callback){
    if (req.signedCookies.name == undefined) {
        callback(null);
    } else {
        db.serialize(function(){
            console.log("serialize");
            db.get("SELECT * FROM users WHERE name='"+req.signedCookies.username+"';", function(err, user){
                if(err) callback(null);
                else{
                     // db.all('SELECT * FROM questions WHERE notification=true;', function(err, notes){
                     //    if(err) callback(null);
                        // else{
                            var data = {
                                "username":user.name,
                                "notificationCount":notes.length,
                                "points":0//user.points
                            };
                            callback(data);
                        // }
                    // });
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
