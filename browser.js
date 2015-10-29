/*
@author: Simeon Ackermann
@date: 10.2015

Simple browser for OntoWiki SiteExnteions to browse through resources.
*/
(function( $ ) {
	function Browser( elem ) {
		this.$elem = $(elem);
		this.browse = null;
		this.model = null;
		this.selection = null;
		this.offset = null;
		this.limit = 15;
		this.list = [];
		this.filteredList = null;
		this.addBtn = false; // opens a new RDForm (https://github.com/simeonackermann/RDForm)
		this.page = window.location.href.split(/[\\/]/).pop();
		this.prefixes = 'PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n';
		return this;
	}

	Browser.prototype = {
		init : function(callback) {			
			var _this = this;	
			if ( typeof callback === 'undefined' ) { callback = function() {}; }
			if ( _this.selection == null ) { // set init selection
				for (var prop in _this.browse) {
					_this.selection = prop;
					break;
				}
			}
			if ( _this.offset == null ) {
				_this.offset = 0;
			}
			if ( _this.addBtn ) {
				_this.printNewResBtn();
			}
			_this.$elem.find(".panel-footer").addClass("loading");
			_this.fetch(function(list) {
				_this.list = list;
				_this.printPage();
				_this.$elem.find(".panel-footer").removeClass("loading");

				if ( $(".search-field").attr("data-value") != "" ) {
					$(".browser-search").val( $(".search-field").attr("data-value") ).trigger("keyup");
				}
				callback(true);
			});

			window.onpopstate = function(event) {
  				_this.execHistory( event.state )  				
			};
		},		

		printClassNavigation : function() {
			var _this = this;
			var navContainer = $('<ul class="browser-class-nav nav nav-tabs"></ul>');
			var i = 0;
			$.each(_this.browse, function(label,classes) {
				var element = $( '<li><a href="#'+label+'" data-item="'+label+'">'+label+'</a></li>' );
				$(navContainer).append( element );
			});
			_this.$elem.append( navContainer );

			$(navContainer).children().first().addClass("active");

			$(navContainer).find("a").click(function() { // select other class
				$(this).parent().siblings().removeClass("active");
				$(this).parent().addClass("active");
				$(".browser-list").html("");
				$(".browser-nav").html("");
				$(".browser-counter").html("");
				_this.selection = $(this).attr("data-item");
				_this.offset = 0;
				_this.init();
				_this.addHistoryEntry();
				return false;
			});
		},

		printBrowser : function() {
			var _this = this;
			var browser = $( '<div class="browser panel panel-default"></div>' );
			var searchField = $('<input type="search" class="form-control browser-search pull-right" style="width:30%" placeholder="Suche ...">');

			$(browser).append( $('<div class="panel-heading" style="height:55px"></div>').append(searchField) );
			$(browser).append('<ul class="browser-list list-group"></ul>');
			$(browser).append( $('<div class="panel-footer"></div>').append('<div class="browser-nav btn-group"></div><div class="browser-counter pull-right"></p>') );

			_this.$elem.append( browser );
			
			searchField.keyup(function() {
				_this.filteredList = _this.filter( $(this).val() );
				_this.offset = 0;				
				_this.printPage();
				_this.addHistoryEntry();
			});			
		},

		printNewResBtn : function() {
			var _this = this;
			var $container = $(".panel-heading");			
			$(".new-resource-button", $container).remove();
			var $dropdown = $('<div class="dropdown new-resource-button pull-right" style="margin:0 10px"></div>' );			

			if ( _this.browse[_this.selection]["classes"].length == 1 ) {
				var thisClassUri = _this.browse[_this.selection]["classes"][0];
				var label = thisClassUri.split("/").reverse()[0];
				if ( _this.model.length == 1 ) {
					$dropdown.append( '<a href="#" data-class-uri="' + thisClassUri + '" data-model-uri="'+_this.model[0]+'" class="btn btn-default">Neue Resource: ' + label + '</a>' );	
				} else {
					var $listContainer = $( '<ul class="dropdown-menu" role="menu" aria-labelledby="newResource"></ul>' );
					$.each( _this.model, function(k,model) {
						var thisMLabel = model.replace(/\/$/, '').split("/").reverse()[0];
						$listContainer.append( '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-class-uri="' + thisClassUri + '" data-model-uri="'+model+'">' + label + " (" + thisMLabel + ')</a></li>' );
					});
					$dropdown.append ( '<button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">Neue Resource... <span class="caret"></span></button>' );
					$dropdown.append( $listContainer );
				}
			} else {
				var $listContainer = $( '<ul class="dropdown-menu" role="menu" aria-labelledby="newResource"></ul>' );
				$.each( _this.browse[_this.selection]["classes"], function(k,classUri) {
					var label = classUri.split("/").reverse()[0];;
					if ( _this.model.length == 1 ) {
						$listContainer.append( '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-class-uri="' + classUri + '">' + label + '</a></li>' );
					} else {
						$.each( _this.model, function(k,model) {
							var thisMLabel = model.replace(/\/$/, '').split("/").reverse()[0];
							$listContainer.append( '<li role="presentation"><a role="menuitem" tabindex="-1" href="#" data-class-uri="' + classUri + '" data-model-uri="'+model+'">' + label + " (" + thisMLabel + ')</a></li>' );
						});
					}
				} );
				$dropdown.append ( '<button class="btn btn-default dropdown-toggle" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-expanded="true">Neue Resource... <span class="caret"></span></button>' );
				$dropdown.append( $listContainer );
			}
			
			$container.append( $dropdown );

			$("a", $dropdown).click(function(e) { // create new form from dropdown
				var template = $(this).attr("data-class-uri").split("/").reverse()[0];
				$("#resourceTemplate").val( template );
				resourceTemplate = template;
				$("#modelIri").val( $(this).attr("data-model-uri") );
				modelIri =  $(this).attr("data-model-uri");
				createForm();
				e.preventDefault();
			});
		},

		printPage : function() {
			var _this = this;
			var $list = $(".browser-list").html("");
			var $nav = $(".browser-nav").html("");
			var $counter = $(".browser-counter").html("");

			var list = (_this.filteredList != null) ? _this.filteredList : _this.list;
			
			for (var i = _this.offset; i < list.length; i++) {
				if (i >= (_this.offset + _this.limit) ) { break; }
				var label = (list[i].label !== undefined) ? list[i].label.value : list[i].resourceUri.value.split("/").reverse()[0];
				$list.append('<li class="browser-entry list-group-item"><a href="'+list[i].resourceUri.value+'">'+label+'</a></li>');				
			};

			if ( list.length == 0 ) {
				$list.append('<li class="browser-entry list-group-item">Kein entsprechender Eintrag gefunden.</li>');	
			}

			var prevBtn = $('<button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-arrow-left"></span> zurück</button> ');
			var nextBtn = $('<button type="button" class="btn btn-default btn-sm">weiter <span class="glyphicon glyphicon-arrow-right"></span></button>');

			if ( _this.offset > 0 && list.length > _this.limit ) {
				$nav.append(prevBtn);
			}
			if ( list.length > ( _this.offset + _this.limit ) ) {
				$nav.append(nextBtn);
			}

			if ( list.length > 0 ) {
				$nav.append("<div class='pull-left' style='margin:3px 7px'><small>Seite "+(1+(_this.offset/_this.limit))+" von "+Math.ceil((list.length/_this.limit))+"</small></div>");
				$counter.text("gesamt: " + list.length);
			}			

			nextBtn.click(function() {
				_this.offset = _this.offset + _this.limit;
				_this.printPage();
				_this.addHistoryEntry();
				return false;
			});
			prevBtn.click(function() {
				_this.offset = _this.offset - _this.limit;
				_this.printPage();
				_this.addHistoryEntry();
				return false;
			});			
		},

		filter : function(search) {
			var _this = this;
			var search = new RegExp( search, "gi");
			return $.grep(_this.list, function(item) {
				var label = (item.label !== undefined) ? item.label.value : item.resourceUri.value;
				return ( label.search(search) !== -1 )
			} );
		},

		fetch : function(callback) {
			var _this = this;			
			var query = "";

			if ( _this.browse[_this.selection].hasOwnProperty("query") ) {
				query = _this.browse[_this.selection]["query"];
			} else {
				var filter = "?body = <" + _this.browse[_this.selection]["classes"].join("> || ?body = <") + ">";
				query = "SELECT DISTINCT * WHERE { ?resourceUri rdf:type ?body . OPTIONAL { ?resourceUri rdfs:label ?label . } FILTER ( "+filter+" ) } ORDER BY ?label ?resourceUri";
			}
			
			$.ajax({
				url: urlBase + "sparql",
				dataType: "json",
				data: {
					query: _this.prefixes + query,
					format: "json"
				},
				success: function( data ) {
					callback(data.results.bindings);
				},
				error: function(e) {
					callback([]);
				},
			});
		},		

		addHistoryEntry : function() {
			var _this = this;			
			var stateObj = { selection: _this.selection, offset: _this.offset, search: $(".browser-search").val() };
			history.pushState(stateObj, "Browser", _this.page);
				
		},

		execHistory : function( state ) {
			var _this = this;			

			if ( state == null ) {				
				state = {};
				for (var prop in _this.browse) {
					state.selection = prop;
					break;
				}
				state.offset = 0;
				state.search = "";				
			}

			_this.selection = state.selection;
			_this.offset = state.offset;
			$(".browser-class-nav li").removeClass("active");
			$('.browser-class-nav a[data-item="'+state.selection+'"]').parent().addClass("active");
			
			_this.init( function() {
				if ( state.search != "" ) {
					$(".browser-search").val( state.search );
					_this.filteredList = _this.filter( state.search );
					_this.printPage();
				}
			});
		}
	};

	
	$.fn.Browser = function( settings ) {
		return this.each(function() {
			var browser = new Browser( this );			
			browser.browse = settings["browse"];
			browser.model = settings["model"];
			browser.printClassNavigation();
			browser.printBrowser();

			if ( history.state != null ) {
				browser.execHistory( history.state );
			} else {
				browser.init();
			}
		});		
	};
})(jQuery);