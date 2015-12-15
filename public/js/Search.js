  /* Search React Component==================================== */

function preg_quote( str ) {
  return (str+'').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
}

function highlight(data, search){
    return data.replace( new RegExp( "(" + preg_quote( search ) + ")" , 'gi' ), "<b>$1</b>" );
}

// Concept Renderer

var ResourceItem = React.createClass({

  getInitialState: function() {
    var resource = this.props.item;
    var didUserLikeResourceBefore = resource['likedBy'][conceptBase.user] === true;
    this.state = {};
    this.state.numLikes = resource.numLikes;
    this.state.thumbsCallback = didUserLikeResourceBefore ? this.handleThumbsDownClick : this.handleThumbsUpClick;
    this.state.thumbsIcon = didUserLikeResourceBefore ? "fa-thumbs-down" : "fa-thumbs-up";

    return this.state;
  },

  handleThumbsUpClick: function(event) {
    var resource = this.props.item;
    var domain = this.props.domain;
    var concept = this.props.concept;
    var that = this;
    $.ajax({
      method: "POST",
      url: "domain/" + domain + "/concept/" + concept + "/resource/" + resource.id + "/like" ,
      dataType: "json"
    })
    .done(function( msg ) {
      that.setState({
        numLikes: msg.likes,
        thumbsCallback: that.handleThumbsDownClick,
        thumbsIcon: "fa-thumbs-down"
      });
    })
    .fail(function( error ) {
      console.error(JSON.stringify(error));
    });
  },

  handleThumbsDownClick: function(event) {
    var resource = this.props.item;
    var domain = this.props.domain;
    var concept = this.props.concept;
    var that = this;
    $.ajax({
      method: "POST",
      url: "domain/" + domain + "/concept/" + concept + "/resource/" + resource.id + "/unlike" ,
      dataType: "json"
    })
    .done(function( msg ) {
      that.setState({
        numLikes: msg.likes,
        thumbsCallback: that.handleThumbsUpClick,
        thumbsIcon: "fa-thumbs-up"
      });
    })
    .fail(function( error ) {
      console.error(JSON.stringify(error));
    });
  },

  render: function() {
    var resource = this.props.item;
    var id = this.props.id;

    return (
      <div id={"resource-" + id} className="resource">
        <div className="resource-header">
          <div>
            <i className="fa fa-external-link"></i>
            &nbsp;
            <span className="link-content">
              <a href={resource.link} target="_blank">
                {resource.link}
                </a>
            </span>
            &nbsp;&nbsp;
            <i onClick={this.state.thumbsCallback} className={"thumbs fa " + this.state.thumbsIcon}>
            </i>
            &nbsp;
            <button className="like-count btn btn-default btn-xs" type="button">
              <span className="badge">{this.state.numLikes}</span> Likes
            </button>
            &nbsp;&nbsp;
            Posted by <a href="#" className="user-info">{resource.created_by}</a>
          </div>
          <div className="resource-description">
            {resource.description}
          </div>
        </div>
      </div>
    );
  }
});

var ConceptRenderer = React.createClass({

  render: function() {
    var rows;
    var concept = this.props.concept;
    var resources = this.props.concept.resources;
    if(resources) {
      rows = resources.map(function(item, i) {
        return (function(_item, _i) {
          return(
            <ResourceItem item={_item} concept={concept.id} domain={concept.domain} id={_i}/>
          );
        })(item, i);
      }.bind(this));
    }

    return (
      <div id="concept-wrapper" className="concept-wrapper">
        <h4>
          <span className="label label-default">{concept.domain}</span>
          &nbsp;&nbsp;
          <span className="label label-primary">{concept.name}</span>
        </h4>
        <div className="concept-description">
          <i className="fa fa-quote-left fa-border"></i>
            {concept.description}
          <i className="fa fa-quote-right fa-border"></i>
        </div>
        <div className="resource-count">
          Found <span className="badge">{resources.length}</span> resources
        </div>
        <div className="resource-items">
          {rows}
        </div>
      </div>
    );

  }
});

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

  handleClick: function(event) {
    $('#search-results').hide();
    $('#search').val(this.props.item.name);

    var domNode = document.getElementById('concept-container');
    ReactDOM.unmountComponentAtNode(domNode);
    ReactDOM.render(<ConceptRenderer concept={this.props.item} />, domNode);
  },

  render : function() {
    var item = this.props.item;
    var id = this.props.id;
    return (
        <a href="#" onClick={this.handleClick} className="result" id={"result-" + id} data-id={id}>
          <i className={"fa fa-check"}></i>
          &nbsp;&nbsp;&nbsp;
          <span className="description" dangerouslySetInnerHTML={{__html: item.formattedName}}></span>
          <br/>
          <span className="description" dangerouslySetInnerHTML={{__html:'in ' + item.domain}}></span>
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

    $('#search-results').show();

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
              var item = concept;
              item.formattedName = formattedName;
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
        <div className={"input-group"}>
          <input id="search" onKeyUp={this.getResults} autoComplete="off"
            type="text" placeholder={this.props.placeholder} />
          <span className={"input-group-addon"}>
            <a href="#" onClick={this.getResults}><i className={"fa fa-search"}></i></a>
          </span>
        </div>
        <SearchList items={this.state.data.items}/>
      </div>
    );
  }
});

ReactDOM.render(<SearchArea url={"concept/search"} placeholder="Search ..." />,
  document.getElementById('search-area'));
