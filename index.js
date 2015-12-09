var express = require('express');
var winston = require('winston');
var cookieParser = require('cookie-parser');

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

winston.level = 'debug';

var app = express();
app.use(cookieParser());
app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  winston.info('conceptbase app started on port', app.get('port'));
});

// routes prefixed with <code>webappContext</code>
app.get(prefixRoute('signin.html'), function(request, response) {
    var cookies = request.cookies;
    if (isCookiePresent(cookies)) {
      response.redirect(prefixRoute('home.html'));
    } else {
      response.render('pages/signin');
    }
});

// this sets the 'email' cookie based on if 'email' query param was present or not
app.get(prefixRoute('home.html'), function(request, response) {
    var cookies = request.cookies;
    var email = request.query.email;
    if (email && email !== '') {
      response.cookie('email', email, { maxAge: 900000, httpOnly: false });
      winston.debug("set cookie to %s", email);
    } else {
      if(isCookiePresent(cookies)) {
        winston.debug("cookie already set to: %s", cookies.email);
      } else {
        response.status(400).send("<b>You have been signed out</b>");
        response.end();
        return;
      }
    }
    response.render('pages/home');
});
