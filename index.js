var express = require('express');
var app = express();

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

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});

// routes prefixed with <code>webappContext</code>
app.get(prefixRoute('sigin.html'), function(request, response) {
    response.render('pages/signin');
});

app.get(prefixRoute('home.html'), function(request, response) {
    var email = request.query.email;
    console.log("got email: " + email);
    // TODO: Validate
    response.render('pages/home' , { email: email });
});
