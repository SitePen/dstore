define([
	'dojo/_base/lang',
	'dojo/Deferred',
	'dojo/io-query',
	'intern/chai!assert'
], function(lang, Deferred, ioQuery, assert){
	// A mock request handler for testing.
	var latestUrl,
		latestQuery,
		latestRequestHeaders,
		responseHeaders,
		responseText;

	function mockRequest(url, options){
		latestUrl = url;
		latestQuery = ioQuery.queryToObject(url.match(/[^?]*(?:\?([^#]*))?/)[1] || "");
		latestOptions = options;
		latestRequestHeaders = {};

		var headers = options.headers;
		for(var name in headers){
			latestRequestHeaders[name.toLowerCase()] = headers[name];
		}

		var dfd = new Deferred();
		dfd.resolve(responseText);

		var responseDfd = new Deferred();
		responseDfd.resolve({
			getHeader: function(name){
				return responseHeaders[name.toLowerCase()];
			}
		});

		return lang.delegate(dfd.promise, {
			response: responseDfd
		});
	}

	mockRequest.setResponseText = function(text){
		responseText = text;
	};
	mockRequest.setResponseHeaders = function(headers){
		responseHeaders = {};
		for(var name in headers){
			responseHeaders[name.toLowerCase()] = headers[name];
		}
	};

	mockRequest.assertHttpMethod = function(expectedMethod){
		assert.strictEqual(latestOptions.method || "GET", expectedMethod);
	};
	mockRequest.assertRequestHeaders = function(expectedHeaders){
		for(var name in expectedHeaders){
			var lowerCaseName = name.toLowerCase();
			assert.property(latestRequestHeaders, lowerCaseName);
			assert.strictEqual(latestRequestHeaders[lowerCaseName], expectedHeaders[name]);
		}
	};
	mockRequest.assertQueryParams = function(expectedParams){
		for(var name in expectedParams){
			assert.property(latestQuery, name);
			assert.equal(expectedParams[name], latestQuery[name]);
		}
	};

	return mockRequest;
});
