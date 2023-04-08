//jshint esversion:6
require('dotenv').config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs =require("ejs");
const mongoose=require("mongoose");
// const encrypt = require('mongoose-encryption');
// const md5=require("md5");
// const bcrypt = require('bcrypt');
// const saltRounds = 10;
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

main().catch(err=> console.log(err));
async function main(){
    await mongoose.connect('mongodb://127.0.0.1:27017/secretDB');
}
const app=express();
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static(__dirname+"/public"));

app.use(session({
    secret:"Our Secret.",
    resave:false,
    saveUninitialized:false
 }));
 
 app.use(passport.initialize());
 app.use(passport.session());

const UserSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});
// UserSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password'] });
UserSchema.plugin(passportLocalMongoose);
UserSchema.plugin(findOrCreate);

const User=mongoose.model("User",UserSchema);

passport.use(User.createStrategy());
// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({username:profile.username,googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get("/",function(req,res){
   res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secret");
  });

app.get("/login",function(req,res){
   res.render("login");
});
app.get("/register",function(req,res){
   res.render("register");
  
});
//------------------------------------------------
// app.post("/register",function(req,res){

//     bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//         const newData=new User({
//             email:req.body.username,
//             password:hash
//           });
//           newData.save();
//           res.render("secrets");
//     });
    
// });

// app.post("/login",async function(req,res){
   
//     const required=await User.findOne({
//         email:req.body.username
//     });
//     if(required!=null)
//     {
//         bcrypt.compare(req.body.password, required.password, function(err, result) {
//             if(result==true)
//             {
//                 res.render("secrets");
//             }
//         });
//     }
//     else{
//         res.send("Invalid UserName or Password");
//     }

// });
//--------------------------------------------

app.post("/login",function(req,res){
   const user=new User({
     username:req.body.username,
     password:req.body.password
   });
   req.login(user,function(err){
    if(err)
    {
        console.log(err);
    }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secret");
        });
    }
   });
});


app.post("/register",function(req,res){
   User.register({username:req.body.username},req.body.password,function(err,user){
    if(err)
    {
        console.log(err);
        res.redirect("/register");
    }
    else{
        passport.authenticate("local")(req,res,function(){
            res.redirect("/secret");
        });
    }
   })
});

app.get("/secret",async function(req,res){
   const foud= await User.find({"secret":{$ne:null}})
   if(foud)
   {
        res.render("secrets",{usereWithSecrets:foud})
   }
});


app.get("/logout",function(req,res){
    req.logout(function(err) {
        if (err) { return next(err); }
        res.redirect('/');
      });
});

app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }
});

app.post("/submit",async function(req,res){
    const submitSecret=req.body.secret;
  //  console.log(req.user.id);
   const found=await User.findById(req.user.id);
   if(found!=null)
   {
     found.secret=submitSecret;
      found.save();
      res.redirect("/secret");
   }
   else{
    res.redirect("/secret");
   }
});


app.listen(3000,function(){
    console.log("WEBSITE STARTED");
});