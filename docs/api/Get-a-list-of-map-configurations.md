# Retrieve the latest versions of all SMK Map Configurations (non-published only)
## `GET /MapConfigurations`
Executing a GET at the /MapConfigurations/ endpoint will return a listing of all non published SMK Map Configurations

Example of curl command:

``` bash
$ curl 'http://localhost:8080/MapConfigurations/' -i \
    -H 'Accept: application/json'
```

Example HTTPie command:

``` bash
$ http GET 'http://localhost:8080/MapConfigurations/' \
    'Accept:application/json'
```

Example of http request:

``` http
GET /MapConfigurations/ HTTP/1.1
Accept: application/json
Host: localhost:8080
```

Example of http response:

``` http
HTTP/1.1 200 OK
Content-Type: application/json;charset=UTF-8
Content-Length: 155

[{"name":"test","id":"test","revision":1,"creator":"Test","valid":true},{"name":"dylans map","id":"dylans-map","revision":4,"creator":"Test","valid":true}]
```

Response
body:

``` options=
[{"name":"test","id":"test","revision":1,"creator":"Test","valid":true},{"name":"dylans map","id":"dylans-map","revision":4,"creator":"Test","valid":true}]
```

Response
fields:

|               |           |                                                                                      |
| ------------- | --------- | ------------------------------------------------------------------------------------ |
| Path          | Type      | Description                                                                          |
| `[].name`     | `String`  | The name of the SMK Map Configuration                                                |
| `[].id`       | `String`  | The ID of the SMK Map Configuration                                                  |
| `[].revision` | `Number`  | The current revision of the SMK Map Configuration                                    |
| `[].creator`  | `String`  | The creator of the SMK Map Configuration                                             |
| `[].valid`    | `Boolean` | A flag indicating if the configuration matches the current SMK version specification |
