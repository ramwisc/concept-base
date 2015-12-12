/* Search React Component==================================== */

function preg_quote( str ) {
  return (str+'').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
}

function highlight(data, search){
    return data.replace( new RegExp( "(" + preg_quote( search ) + ")" , 'gi' ), "<b>$1</b>" );
}

function logInfo(domain, concept) {
  console.log('domain = ' + domain);
  console.log('concept = ' + concept);
}

// List Component
var SearchList = React.createClass({

  render: function() {
    var rows;
    var items = this.props.items;
    if (items) {
      rows = items.map(function(item, i) {
        return(
          <ListItem item={item} id={i}/>
        );
      }.bind(this));
    }

    return (
      <div id="search-results">
        {rows}
      </div>
    );

  }

});

// List Item
var ListItem = React.createClass({
  render : function(){
    var item = this.props.item;
    var id = this.props.id;
    return (
        <a target="_blank" href="#" className="result" id={"result-" + id} data-id={id}>
          <i className={"fa fa-check"}></i>
          &nbsp;&nbsp;&nbsp;
          <span className="description" dangerouslySetInnerHTML={{__html: item.formattedName}}></span>
          <br/>
          <span className="description" dangerouslySetInnerHTML={{__html:'in ' + item.domain}}></span>
          <input type="hidden" value={item.domain + "/" + item.concept} />
        </a>
    );
  }
});

// Search Main
var SearchArea = React.createClass({

  // Gets initial state
  getInitialState: function() {
    return {
      data: {
        items : []
      }
    };
  },

  componentDidMount : function(url, _this, data){
    $('#search').focus();
  },

  getResults : function(e) {
    var _this = this;
    var date = new Date();
    var q = $('#search').val();
    var url = this.props.url;

    switch(e.which) {
      case 38: // up
        var currentId = $('#search-results .result.active').attr('data-id');
        var prevId = parseInt(currentId, 10) - 1;
        $('#search-results .result').removeClass('active');
        if(!$('#search-results #result-' + prevId).length) return false;
        $('#search-results #result-' + prevId).addClass('active');
        break;

      case 40: // down
        if(!$('#search-results .result.active').length){
          $('#search-results .result').first().addClass('active');
        } else {
          var currentId = $('#search-results .result.active').attr('data-id');
          var nextId = parseInt(currentId, 10) + 1;
          if(!$('#search-results #result-' + nextId).length) return false;
          $('#search-results .result').removeClass('active');
          $('#search-results #result-' + nextId).addClass('active');
        }
        break;

      case 13: // enter
        var domainAndConcept = $('#search-results .result.active :hidden').attr('value')[0];
        var split = domainAndConcept.split('/');
        var domain = split[0];
        var concept = split[1];
        console.log('domain = ' + domain);
        console.log('concept = ' + concept);
        break;

      default:
        var q = $('#search').val();
        if(!q || q.trim() === '') { return; } // noop if search term empty

        var url = url + '?query=' + q;
        var newItems = [];
        $.getJSON(url, function(concepts) {
          // Do your searching here
          concepts.forEach(function(concept, i) {
              var formattedName = highlight(concept.name, q);
              var item = {};
              item.formattedName = formattedName;
              item.domain = concept.domain;
              item.concept = concept.name;
              newItems.push(item);
            });

            if(!newItems.length){
              $('#search-results').removeClass('open');
            } else {
              $('#search-results').addClass('open');
            }

            if (_this.isMounted()) {
              _this.setState({
                data : {
                  items: newItems
                }
              });
            }
        });
        return; // exit this handler for other keys
    } //end switch
  },

  render : function() {
    return (
      <div>
        <input id="search" onKeyDown={this.getResults} type="text" placeholder={this.props.placeholder} />
        &nbsp;&nbsp;
        <i className={"fa fa-search fa-2x"}></i>
        <SearchList items={this.state.data.items}/>
      </div>
    );
  }
});

// http://abc/com/a/b/c returns 'a'
var webappContext =  window.location.pathname.split('/')[1];
var url = '/' + webappContext + "/concept/search";
ReactDOM.render(<SearchArea url={url} placeholder="Search ..." />,
  document.getElementById('search-area'));
