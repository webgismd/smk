# Create a new SMK Map Configuration
## `POST /MapConfigurations`

Executing a POST at the /MapConfigurations/ endpoint with a body containing the required Map Configuration json will create a new, unpublished Map Configuration that can be used for editing.

All newly created documents will have their SMK Version set to *1*.

Example of curl command:

``` bash
$ curl 'http://localhost:8080/MapConfigurations/' -i -X POST \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json' \
    -d '{"lmfId":"my-application","name":"My Application","surround":{"type":"default","title":"My Application"},"viewer":{"type":"leaflet","location":{"extent":[null,null,null,null],"center":[-139.1782,47.6039],"zoom":5.0},"baseMap":"Imagery"},"tools":[{"type":"menu","enabled":true,"title":"Menu","showPanel":true},{"type":"dropdown","enabled":true,"title":"","showPanel":true}]}'
```

Example HTTPie
Request:

``` bash
$ echo '{"lmfId":"my-application","name":"My Application","surround":{"type":"default","title":"My Application"},"viewer":{"type":"leaflet","location":{"extent":[null,null,null,null],"center":[-139.1782,47.6039],"zoom":5.0},"baseMap":"Imagery"},"tools":[{"type":"menu","enabled":true,"title":"Menu","showPanel":true},{"type":"dropdown","enabled":true,"title":"","showPanel":true}]}' | http POST 'http://localhost:8080/MapConfigurations/' \
    'Content-Type:application/json' \
    'Accept:application/json'
```

Example of http request:

``` http
POST /MapConfigurations/ HTTP/1.1
Content-Type: application/json
Accept: application/json
Host: localhost:8080
Content-Length: 373

{"lmfId":"my-application","name":"My Application","surround":{"type":"default","title":"My Application"},"viewer":{"type":"leaflet","location":{"extent":[null,null,null,null],"center":[-139.1782,47.6039],"zoom":5.0},"baseMap":"Imagery"},"tools":[{"type":"menu","enabled":true,"title":"Menu","showPanel":true},{"type":"dropdown","enabled":true,"title":"","showPanel":true}]}
```

Example of http response:

``` http
HTTP/1.1 201 Created
Content-Type: application/json;charset=ISO-8859-1
Content-Length: 97

{ "status": "Success", "couchId": "ad593c1e44230b8894a465a049090521", "lmfId": "my-application" }
```

Request
body:

``` options=
{"lmfId":"my-application","name":"My Application","surround":{"type":"default","title":"My Application"},"viewer":{"type":"leaflet","location":{"extent":[null,null,null,null],"center":[-139.1782,47.6039],"zoom":5.0},"baseMap":"Imagery"},"tools":[{"type":"menu","enabled":true,"title":"Menu","showPanel":true},{"type":"dropdown","enabled":true,"title":"","showPanel":true}]}
```

Response
body:

``` options=
{ "status": "Success", "couchId": "ad593c1e44230b8894a465a049090521", "lmfId": "my-application" }
```
