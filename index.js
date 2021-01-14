var express = require('express');
var app = express();
const path = require('path')
const multer = require("multer");
var bodyparser = require('body-parser');
var session = require('express-session');
const sesLT = 720000;
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/";

app.use(bodyparser.urlencoded({
    extended : true
}));

app.use(bodyparser.json());

//creating session
app.use(session({
    name: 'sid',
    resave: false,
    saveUninitialized: false,
    secret:'appu$IS$super$',
    cookie: {
        maxAge: sesLT,
        sameSite: true,
        secure: false,
    }
}))
const users = [
    {id:1, username:'cc@nitc', password:'cc@nitc'}
]

//REDIRECTION
const redirectLogin = (req, res, next) => {
    if(!req.session.userId){
        res.redirect('/login')
    }else{
        next()
    }
}

const redirectMain = (req, res, next) => {
    if(req.session.userId){
        res.redirect('/add')
    }else{
        next()
    }
}

//LOGIN & LOGOUT
app.get('/login',redirectMain,function(req,res){
    res.sendFile(__dirname + '/public/log.html');
});
app.post('/login', (req,res) => {
    const { username, password } = req.body
    if(username && password){
        const user = users.find(
            user => user.username === username && user.password === password)
    if (user){
        req.session.userId = user.id
        return res.redirect('/add')
    }}
    res.redirect('/login')
});
app.post('/logout',(req,res)=>{
    req.session.destroy(err =>{
        if(err){
            return res.redirect('/add');
        }
        res.clearCookie('sid').redirect('/');
    })
})

//HOME NODE
app.get('/',function(req,res){
    res.sendFile(__dirname + '/public/home.html');
});

//ADMIN HOME NODE
app.get('/home',function(req,res){
    res.sendFile(__dirname + '/public/homeA.html');
});

//SEARCH NODE
app.get('/search',function(req,res){
    res.sendFile(__dirname + '/public/search.html');
});

//ADD NODE
app.get('/add',redirectLogin, function(req,res){
    res.sendFile(__dirname + '/public/addI.html');
});

//ADD POST NODE - changed to image uploading scheme
// app.post('/add', function(req,res){
//     var collect = req.body;
//     let i;
//     var meta =`{ "${collect.addKey[0]}": "${collect.addValue[0]}"`;
//     for (i = 1; i < collect.addKey.length; i++) {
//         meta += `, "${collect.addKey[i]}": "${collect.addValue[i]}"`
//     }
//     meta +=` }`
//     meta = JSON.parse(meta);
//     MongoClient.connect(url, function(err, db) {
//         if (err) throw err;
//         var dbo = db.db("mydb");
//         dbo.collection("customers").insertOne(meta, function(err, res) {
//             if (err) throw err;
//             // console.log("1 document inserted");
//             db.close();
//         });
//     res.sendFile(__dirname + '/public/addS.html');
//     });
// });

//SEARCH POST NODE
app.post('/search', function(req,res){
    var query = req.body;
    // console.log(req.body);
    var meta = "";
    MongoClient.connect(url, function(err, db) {
        if (err) throw err;
        var dbo = db.db("mydb");
        dbo.collection("customers").find(query).toArray(function(err, result) {
          if (err) throw err;
          res.json(result);
          db.close();
        });
    });
});

//IMAGE UPLOAD
const fileFilter = (req, file, cb) => {
    if (
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/jpeg"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Image uploaded is not of type jpg or jpeg"), false);
    }
  };
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `${__dirname}/public/views/${process.env.UPLOAD_PATH}`)
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)) //Appending extension
    }
  })
  
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 },
  }).single("image");

  const convertToNormalDate = (val) => {
    const dt = val.split(/[\s:]+/).map((val) => parseInt(val));
    dt[1] -= 1;
  
    const [y, m, d, h, M, s] = dt;
    return (new Date(y, m, d, h, M, s));
  }
//ADD IMAGE NODE
app.post('/api/images', function(req,res){
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
          res.status(500).send({ success: false, message: err.message });
        } else if (err) {
          throw err;
        }
    
        if (!req.body.metadata) {
          res.status(400).send({ success: false, message: "No metadata" });
        }
        
        const metadata = JSON.parse(req.body.metadata);
    
        metadata.DateTimeDigitized = (metadata.DateTimeDigitized) ? convertToNormalDate(metadata.DateTimeDigitized) : undefined;
        metadata.DateTimeOriginal = (metadata.DateTimeOriginal) ? convertToNormalDate(metadata.DateTimeOriginal) : undefined;
        metadata.DateTime = (metadata.DateTime) ? convertToNormalDate(metadata.DateTime) : undefined;
    
        metadata.Size = req.file.size;
        metadata.OriginalName = req.file.originalname;
        metadata.FileName = req.file.filename;
        // console.log(metadata);
        var valuesM = Object.values(metadata);
        var keysM = Object.keys(metadata);
        var meta =`{ "${keysM[0]}": "${valuesM[0]}"`;
        for (i = 1; i < keysM.length; i++) {
            meta += `, "${keysM[i]}": "${valuesM[i]}"`
        }
        meta +=` }`
        // console.log(meta);
        meta = JSON.parse(meta);
        MongoClient.connect(url, function(err, db) {
            if (err) throw err;
            var dbo = db.db("mydb");
            dbo.collection("customers").insertOne(meta, function(err, res) {
                if (err) throw err;
                // console.log("1 document inserted");
                db.close();
            });
        res.sendFile(__dirname + '/public/addS.html');
        });
    });
    // console.log(req.body);
});

app.use(express.static('public'));
app.listen(3021);
console.log('running on port 3020....');