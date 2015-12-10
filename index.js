var express = require('express');
var winston = require('winston');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var conceptStore = require('./store/concept-store.js').conceptStore;
var util = require('util');

// random string to obfuscate
var webappContext = '992f0957e1dcafc773d94f8ea4c9ba32ae9f4afe';

function prefixRoute(path) {
    var fSlash = '/';
    if(path[0] === fSlash) {
        return fSlash + webappContext  + path;
    } else {
        return fSlash + webappContext  + fSlash + path;
    }
}

function isCookiePresent(cookies) {
  return cookies.email && cookies.email.trim() !== '';
}

function requireAuthentication(req, res, next) {
  var cookies = req.cookies;
  if (isCookiePresent(cookies)) {
    winston.debug("cookie already set to: %s", cookies.email);
    req.user = cookies.email;
  } else {
    var email = req.query.email;
    if (email && email !== '') {
      res.cookie('email', email, { maxAge: 900000, httpOnly: false });
      winston.debug("set cookie to %s", email);
    } else {
        res.render("pages/signin"); // ask to sign in
        return;
    }
  }
  next();
}

winston.level = 'debug';
// create application/json parser
var jsonParser = bodyParser.json()

var app = express();
// set up middleware
app.use(cookieParser());
//parse json for the appropriate requests
app.use(bodyParser.json({ type: 'json' }))
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// default routes
app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  winston.info('conceptbase app started on port', app.get('port'));
});

//----routes prefixed with <code>webappContext</code>-------------------------//

app.all(prefixRoute('/*'), requireAuthentication);

app.get(prefixRoute('/'), function(request, response) {
  response.render('pages/home');
});

app.get(prefixRoute('/home.html'), function(request, response) {
  response.render('pages/home');
});

//--------REST data endpoints-------------------------------------------------//
/**
 * Create a new concept in the datastore
 */
app.post(prefixRoute("/concept"), function(req, res) {
  var concept = req.body;
  if(!concept) {
    var error = { msg: 'concept object was not present in the request or marlformed!' };
    res.status(400).send(JSON.stringify(error));
  } else {
    winston.debug("received concept %s", JSON.stringify(concept));
    conceptStore.add(concept, req.user, function(conceptId, error) {
      if(error) {
        var msg = { msg: error };
        res.status(500)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(msg));
      } else {
        var msg = { id: conceptId };
        res.status(201)
            .set('Content-Type', 'application/json')
            .send(JSON.stringify(msg));
      }
    });
  }
});

app.get(prefixRoute("/concept/:id"), function(req, res) {
  winston.debug("retrieving concept %s", req.params.id);
  conceptStore.get(req.params.id, function(concept) {
    if(!concept) {
      var error = util.format("concept '%s' not found!", req.params.id);
      res.status(404)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({msg : error}));
    } else {
      res.status(200)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify(concept));
    }
  });
});
