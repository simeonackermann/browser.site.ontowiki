# Browser-Plugin for Ontowiki SiteExtension #

The Plugin provides a simple interface to browse through resource with the SiteExtension for OntoWiki OntoWiki.

The results are seperated into their class-types, can be filtered and the list use pagination.

## Usage

- include the browser.js, browser.css and bootstrap.min.css in your site 
- create a page with <div class="browser"></div>
- Example JavaScript call:

```
var arg = {
	"model" : [ "http://your-model-uri.org/" ],
	"browse" : {
		"Persons" : {
			"classes" : ["http://your-model-uri.org/model/Person"]
		},
		"Locations" : {
			"classes" : ["http://your-model-uri.org/model/Country", "http://your-model-uri.org/model/City"]
		}
		/* ... */
	}
};
$(".browser").Browser( arg );
```

## Parameter

- model - The URI of your target model
- browse - Array with classes to show. Structure:

```
"browse" : {
	"Title Of The Class" : {
		"classes" : [ "http://class-uri.de/XY", "http://class-uri.de/YZ", ... ]
	}
}
```

For individual queries (e.g. other label) you can use a "query" key. It needs to bind a ?resourceUri variable:

```
"browse" : {
	"Title Of The Class" : {
		"query"		"SELECT DISTINCT * WHERE { ?resourceUri rdf:type ?body . ?resourceUri rdfs:label ?label . } " +
						"FILTER ( ?body = <http://class-uri.de/XY> ) } ORDER BY ?label ?resourceUri",
		"classes" 	: [ "http://class-uri.de/XY" ]
	}
}
```
