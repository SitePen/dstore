define([
	'require',
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/_base/lang',
	'dstore/JsonRest'
], function(require, registerSuite, assert, declare, lang, JsonRest){

	// NOTE: Because HTTP headers are case-insensitive they should always be provided as all-lowercase
	// strings to simplify testing.
	function runTest(method, args){
		var d = this.async();
		store[method].apply(store, args).then(d.callback(function(result){
			var k;
			var resultHeaders = result.headers;
			for(k in requestHeaders){
				if(resultHeaders.hasOwnProperty(k)){
					assert.strictEqual(resultHeaders[k], requestHeaders[k]);
				}
			}

			for(k in globalHeaders){
				if(resultHeaders.hasOwnProperty(k)){
					assert.strictEqual(resultHeaders[k], globalHeaders[k]);
				}
			}
		}), lang.hitch(d, 'reject'));
	}

	var TestModel = declare(null, {
		describe: function(){
			return 'name is ' + this.name;
		}
	});

	var globalHeaders = {
		'test-global-header-a': 'true',
		'test-global-header-b': 'yes'
	};
	var requestHeaders = {
		'test-local-header-a': 'true',
		'test-local-header-b': 'yes',
		'test-override': 'overridden'
	};
	var store = new JsonRest({
		target: require.toUrl('dstore/tests/x.y').match(/(.+)x\.y$/)[1],
		headers: lang.mixin({ 'test-override': false }, globalHeaders),
		model: TestModel
	});

	registerSuite({
		name: 'dstore JsonRest',

		'get': function(){
			var d = this.async();
			store.get('data/node1.1').then(d.callback(function(object){
				assert.strictEqual(object.name, 'node1.1');
				assert.strictEqual(object.describe(), 'name is node1.1');
				assert.strictEqual(object.someProperty, 'somePropertyA1');
			}));
		},

		'query': function(){
			var d = this.async();
			store.query('data/treeTestRoot').then(d.callback(function(results){
				var object = results[0];
				assert.strictEqual(object.name, 'node1');
				assert.strictEqual(object.describe(), 'name is node1');
				assert.strictEqual(object.someProperty, 'somePropertyA');
			}));
		},

		'query iterative': function(){
			var d = this.async();
			var i = 0;
			return store.query('data/treeTestRoot').forEach(d.rejectOnError(function(object){
				i++;
				assert.strictEqual(object.name, 'node' + i);
			}));
		},

		'headers get 1': function(){
			runTest.call(this, 'get', [ 'index.php', requestHeaders ]);
		},

		'headers get 2': function(){
			runTest.call(this, 'get', [ 'index.php', { headers: requestHeaders } ]);
		},

		'headers remove': function(){
			runTest.call(this, 'remove', [ 'index.php', { headers: requestHeaders } ]);
		},

		'headers query': function(){
			runTest.call(this, 'query', [
				{},
				{ headers: requestHeaders, start: 20, count: 42 }
			]);
		},

		'headers put': function(){
			runTest.call(this, 'put', [
				{},
				{ headers: requestHeaders }
			]);
		},

		'headers add': function(){
			runTest.call(this, 'add', [
				{},
				{ headers: requestHeaders }
			]);
		}
	});
});
