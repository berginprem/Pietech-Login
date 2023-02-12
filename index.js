require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const mongoSanitize = require('express-mongo-sanitize');

const dbUrl = process.env.DB_URL
// const {MongoStore} = require("connect-mongo")
const MongoDBStore = require('connect-mongodb-session')(session);

mongoose.set('strictQuery', false);
mongoose.connect(dbUrl)
// mongoose.connect('mongodb://localhost:27017/pietech-login')

const db = mongoose.connection;
db.on('error', console.log.bind(console, "connection error:"));
db.once("open", ()=>{
    console.log("Database connected");
})


const app = express();
app.engine('ejs',ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname,'public')));
app.use(mongoSanitize())

const store = new MongoDBStore({
    url: 'mongodb://localhost:27017/pietech-login',
    secret: 'thisshouldbeabettersecret!',
    touchAfter: 24*60*60
})

store.on("error", function (e){
    console.log("Session store error", e)
})

const sessionConfig = {
    store,
    secret: 'thisshouldbeabettersecret!',
    resave: false,
    saveUninitialized: true,
    cookie:{
        httpOnly: true,
        expires: Date.now() +1000*60*60*24*7,
        maxAge: 1000*60*60*24*7
    }
}
app.use(session(sessionConfig));
app.use(flash());

app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req,res,next) =>{
    // console.log(req.query);
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})
isLoggedIn = (req, res, next) =>{
    if(!req.isAuthenticated()){
        req.session.returnTo = req.originalUrl;
        req.flash('error','you must be logged in');
        return res.redirect('/login');
    }
    next();
}


app.get('/', (req, res) => {
    res.render('home')
})

app.get('/register',(req,res)=>{
    res.render('users/register');
})

app.post('/register',async (req,res,next)=>{
        try{
            const {email, username, password} = req.body;
            const user = new User({email, username});
            const registeredUser = await User.register(user, password);
            req.login(registeredUser, e =>{
                if(e) return next(e);
                req.flash('success', 'Welcome to Your page!');
                res.redirect('/page');
            })        
        }catch(e){
            req.flash('error', e.message);
            res.redirect('/register');
        }
})

app.get('/login',(req,res)=>{
    res.render('users/login')
})
app.get('/page',isLoggedIn,(req,res)=>{
    res.render('page')
})
app.post('/login',passport.authenticate('local', {failureFlash:true, failureRedirect: '/login'}),(req,res)=>{
    req.flash('success', 'welcome back!');
    console.log('hi')
    console.log(req.session.returnTo)
    const redirectUrl = req.session.returnTo || '/page';
    delete req.session.returnTo;
    res.redirect(redirectUrl);
})
app.get('/logout',(req,res,next)=>{
    req.logout(function(err) {
        if (err) { return next(err);}
        req.flash('success', 'Goodbye!');
        res.redirect('/');
    });
    
})

app.listen(process.env.PORT||3000, ()=>{
    console.log('listening on port 3000');
})
module.exports = app;