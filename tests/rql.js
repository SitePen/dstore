define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/Deferred',
	'dojo/request/registry',
	'dstore/rql',
	'dstore/Memory',
	'dstore/Rest'
], function(registerSuite, assert, declare, Deferred, registry, rql, Memory, JsonRest){

	var TestModel = declare(null, {
		describe: function(){
			return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
		}
	});

	var rqlMemory = rql(new Memory({
		data: [
			{id: 1, name: 'one', prime: false, mappedTo: 'E'},
			{id: 2, name: 'two', prime: true, mappedTo: 'D', even: true},
			{id: 3, name: 'three', prime: true, mappedTo: 'C'},
			{id: 4, name: 'four', prime: false, mappedTo: null, even: true},
			{id: 5, name: 'five', prime: true, mappedTo: 'A'}
		],
		model: TestModel
	}));

	registerSuite({
		name: 'dstore RqlMemory',

		'get': function(){
			assert.strictEqual(rqlMemory.get(1).name, 'one');
			assert.strictEqual(rqlMemory.get(4).name, 'four');
			assert.strictEqual(rqlMemory.get(1).describe(), 'one is not a prime');
		},

		'query': function(){
			assert.strictEqual(rqlMemory.query('prime=true').length, 3);
			assert.strictEqual(rqlMemory.query('prime=true&even!=true').length, 2);
			assert.strictEqual(rqlMemory.query('prime=true&id>3').length, 1);

			assert.strictEqual(rqlMemory.query('(prime=true|id>3)').length, 4);
			assert.strictEqual(rqlMemory.query('(prime=true|id>3)', {start: 1, count: 2}).length, 2);
		}
	});

	var lastMockRequest;
	registry.register(/http:\/\/test.com\/.*/, function mock(url){
		lastMockRequest = url;
		var def = new Deferred();
		def.resolve('[]');
		def.response = new Deferred();
		return def;
	});
	var rqlRest = rql(new JsonRest({
		target: 'http://test.com/'
	}));

	registerSuite({
		name: 'dstore RqlJsonRest',

		'query': function(){
			rqlRest.query({prime: true, even: true});
			assert.strictEqual(lastMockRequest, 'http://test.com/?eq(prime,true)&eq(even,true)');
		}
	});
});
