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
        db.run('CREATE TABLE "users" ("id" INTEGER PRIMARY KEY  NOT NULL  UNIQUE , "name" VARCHAR(70) NOT NULL UNIQUE, "password" VARCHAR(61) NOT NULL, "points" INTEGER NOT NULL  DEFAULT 0, "points_ever" INTEGER NOT NULL  DEFAULT 0, "created_at" DATETIME NOT NULL  DEFAULT CURRENT_TIMESTAMP);');
        //fake data, username: lucasmullens password password
        db.run('INSERT INTO "users" VALUES ("1","lucasmullens","$2a$10$hLxg2Kn0WB0H6gKnLFGfYeohxfJl193NM9OSbRRu3XlYPWiE/En1q","0","0","2014-01-18 10:23:49");');
        db.run('INSERT INTO "users" VALUES ("2","Steve","$2a$10$hLxg2Kn0WB0H6gKnLFGfYeohxfJl193NM9OSbRRu3XlYPWiE/En1q","0","0","2014-01-18 10:23:49");');
        db.run("INSERT INTO questions (userid, content) VALUES (1,'Whats up?'); ");
        db.run("INSERT INTO questions (userid, content) VALUES (2,'Why is there no red bull?'); ");
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
    getUser(req, function(user){
        var questions = []; 
        db.serialize(function(){
            // user.id
            var extra = 'EXISTS(SELECT * FROM questionvotes as qv WHERE qv.userid = "'+user.id+'" AND q.id=qv.questionid) as voted ';
            var query = 'SELECT *, '+extra+' FROM questions as q INNER JOIN users as u on u.id = q.userid';
            // query += ' LEFT JOIN (SELECT userid as qvuserid, questionid FROM questionvotes as qv WHERE qv.userid = "'+user.id+'") as qv on qv.questionid = q.id;'
            
            db.all(query, function(err, rows){
                if(err==null){//no error
                    for (var i = 0; i < rows.length; i++) {
                        // console.log(rows[i]);
                        questions.push({
                            "id": rows[i].id,
                            "username": rows[i].username,
                            "userid": rows[i].userid,
                            "heading": rows[i].name,
                            "text": rows[i].content,
                            "voted": rows[i].voted
                        });
                    };
                     res.render("base", {
                        user:JSON.stringify(user),
                        questions:questions,
                        voterid: user.id
                    });
                }
            });
        });
    });
});
//---------------------------------------------/////-signup + logins
captifeye.get('/auth', function(req, res){
    res.render("auth", {
        user:"null"
    });
});
//---------------------------------------------/////-username
captifeye.get('/user/:username', function(req, res){
    var username = req.params.username;
    getUser(req, function(user){
        db.serialize(function(){
            db.get('SELECT * FROM users WHERE name="'+username+'";', function(err, viewUser){
                if(err || viewUser==undefined) res.render('error', {user:user, errorNumber:404, errorMessage:"This user does not exist."});
                else
                    res.render('user', {
                        user:user,
                        viewUserName:viewUser.name,
                        viewUserPoints:viewUser.points,
                        viewUserPointsEver:viewUser.points_ever,
                    });
            });
        });
    });
});
//Routing End///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Login/Logout Start//////////////////////////////////////////////////////////////////////
//---------------------------------------------/////-login
captifeye.post("/login", function(req, res){
    var name = req.body.username;
    var password = req.body.password;
    db.serialize(function(){
        db.get('SELECT * FROM users WHERE name="'+name+'";', function(err, row){
            if(err==null){
                if(row!=undefined){//exists
                    comparePassword(password, row.password, function(nul, match){
                        if(match == true){
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
                res.send({status:404});
            }
        });
    });
});
//---------------------------------------------/////-register
captifeye.post("/register", function(req, res){
    var name = req.body.username;
    var password = req.body.password;
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
                    res.statusCode(304);
                }
            }else{
                res.render('error', {
                    errorMessage:"500",
                    errorMessage:"There was an issue connecting to the database."
                });
            }
        });  
    });
});
//---------------------------------------------/////-logout
captifeye.get('/logout', function(req, res){
  res.clearCookie('name');
  res.redirect('/');
});
//Login/Logout END//////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//API Start///////////////////////////////////////////////////////////////////////////////
captifeye.post('/api/question/vote', function(req, res){
    var questionid = req.body.questionid;
    var userid = req.body.userid;
    var positive = req.body.positive;
    db.serialize(function(){
        var query = 'INSERT INTO questionvotes (questionid, userid, positive) VALUES ('+questionid+', '+userid+', '+positive+')';
        db.run(query, function(err){
            if(err) res.send({status:400}); else res.send({status:200});
        });
    });
});
captifeye.post('/api/question/unvote', function(req, res){
    var questionid = req.body.questionid;
    var userid = req.body.userid;
    var positive = req.body.positive;
    db.serialize(function(){
        db.run('DELETE FROM questionvotes WHERE questionid='+questionid+' AND userid='+userid+';', function(err){
            if(err) res.send({status:400}); else res.send({status:200});
        });
    });
});
//API End///////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//404 Error start/////////////////////////////////////////////////////////////////////////
captifeye.get("*", function(req, res){
    getUser(req, function(user){
        res.render('error', {
            "user":user,
            "errorNumber":404,
            "errorMessage":"sorry, lulz"
        });
    })
});
//404 Error end/////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////
//Misc Start//////////////////////////////////////////////////////////////////////////////
//base cookie check and navigation building
var getUser = function(req, callback){
    if (req.signedCookies.name == undefined) {
        callback("null");
    } else {
        db.serialize(function(){
            db.get("SELECT * FROM users WHERE name='"+req.signedCookies.name+"';", function(err, user){
                if(err) callback("null");
                else{
                     // db.all('SELECT * FROM questions WHERE notification=true;', function(err, notes){
                     //    if(err) callback(null);
                        // else{
                            var data = {
                                "id":user.id,
                                "username":user.name,
                                "notificationCount":0,//notes.length,
                                "points":user.points
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
