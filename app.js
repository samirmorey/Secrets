//jshint esversion:6
require("dotenv").config();//always put right-at-the-top
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const md5 = require('md5');//hashing concept
// const bcrypt = require('bcrypt');//hashing with salting
// const saltRounds = 10;
// const encrypt = require('mongoose-encryption');

const app=express();

app.use(express.static("public"));
app.set("view engine","ejs");
app.use(bodyParser.urlencoded({
  extended:true
}));

app.use(session({           //necessary to put above DB connection
  secret: 'This is secret.',
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_URI,{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);
const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET,encryptedFields:["password"] }); //put above model always


const User= new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
}) ;

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});//put below model

passport.use(new GoogleStrategy({  //put below deserializeUser
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://sharesecrets45.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",function(req,res) {
  res.render("home");
});

app.get("/auth/google",
passport.authenticate("google",{scope:["profile"]})
);

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });
app.get("/login",function(req,res) {
  res.render("login");
});
app.get("/register",function(req,res) {
  res.render("register");
});
app.get("/secrets",function(req,res) {
  User.find({"secret":{$ne:null}}, function(err,foundUser) {
    if (err) {
      console.log(err);
    }else {
      if (foundUser) {
        res.render("secrets",{userWithSecrets:foundUser});
      }
    }
  });
});

app.get("/submit",function(req,res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  }else {
    res.redirect("/login");
  }
});
app.post("/submit",function(req,res) {
  const createdSecret=req.body.secret;
  User.findById(req.user.id,function(err,foundUser) {
    if (err) {
      console.log(err);
    }else {
      if (foundUser) {
        foundUser.secret=createdSecret;
        foundUser.save(function() {
          res.redirect("/secrets");
        });
      }
    }
  });
});
app.get("/logout",function(req,res) {
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res) {
 User.register({username: req.body.username},req.body.password,function(err,user) {
   if (err) {
     console.log(err);
     res.redirect("/register");
   }else {
     passport.authenticate("local")(req,res,function() {
       res.redirect("/secrets");
     })
   }
 });
});
app.post("/login",function(req,res) {
 const user= new User({
   username:req.body.username,
   password:req.body.password
 });
 req.login(user,function(err) {
   if (err) {
     console.log(err);
   }else {
     passport.authenticate("local")(req,res,function() {
       res.redirect("/secrets");
     });
   }
 });
});




app.listen(process.env.PORT,function() {
  console.log("server is running on 3000");
})

// methods used for hashing and salting
// app.post("/register",function(req,res) {
//
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser=new User({
//     email: req.body.username,
//     password: hash
//   });
//   newUser.save(function(err) {
//     if (!err) {
//       res.render("secrets");
//     }else {
//       console.log(err);
//     }
// });
// });
// });
// app.post("/login",function(req,res) {
//   const username=req.body.username;
//   const password=req.body.password;
//
//   User.findOne({email: username}, function(err, foundUser) {
//     if (err) {
//       console.log("c");
//     }else  {
//       if (foundUser) {
//         bcrypt.compare(password, foundUser.password, function(err, result) {
//        if (result === true) {
//          res.render("secrets");
//        }
//       });
//       }
//     }
//   });
// });
