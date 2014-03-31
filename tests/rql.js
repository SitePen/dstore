define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dojo/Deferred',
	'dojo/request/registry',
	'dstore/RqlClient',
	'dstore/RqlServer',
	'dstore/Memory',
	'dstore/Rest'
], function (registerSuite, assert, declare, Deferred, registry, RqlClient, RqlServer, Memory, Rest) {

	var TestModel = declare(null, {
		describe: function () {
			return this.name + ' is ' + (this.prime ? '' : 'not ') + 'a prime';
		}
	});

	var rqlMemory = new (declare([Memory, RqlClient]))({
		data: [
			{id: 1, name: 'one', prime: false, mappedTo: 'E'},
			{id: 2, name: 'two', prime: true, mappedTo: 'D', even: true},
			{id: 3, name: 'three', prime: true, mappedTo: 'C'},
			{id: 4, name: 'four', prime: false, mappedTo: null, even: true},
			{id: 5, name: 'five', prime: true, mappedTo: 'A'}
		],
		model: TestModel
	});

	registerSuite({
		name: 'dstore RqlMemory',

		'get': function () {
			assert.strictEqual(rqlMemory.get(1).name, 'one');
			assert.strictEqual(rqlMemory.get(4).name, 'four');
			assert.strictEqual(rqlMemory.get(1).describe(), 'one is not a prime');
		},

		'filter': function () {
			assert.strictEqual(rqlMemory.filter('prime=true').data.length, 3);
			assert.strictEqual(rqlMemory.filter('prime=true&even!=true').data.length, 2);
			assert.strictEqual(rqlMemory.filter('prime=true&id>3').data.length, 1);

			assert.strictEqual(rqlMemory.filter('(prime=true|id>3)').data.length, 4);
			assert.strictEqual(rqlMemory.filter('(prime=true|id>3)').range(1, 3).data.length, 2);
		}
	});

	var lastMockRequest;
	var mockHandle = registry.register(/http:\/\/test.com\/.*/, function mock(url) {
		lastMockRequest = url;
		var def = new Deferred();
		def.resolve('[]');
		def.response = new Deferred();
		return def;
	});
	var rqlRest = new (declare([Rest, RqlServer]))({
		target: 'http://test.com/'
	});

	registerSuite({
		name: 'dstore RqlRest',

		'filter': function () {
			rqlRest.filter({prime: true, even: true}).fetch();
			assert.strictEqual(lastMockRequest, 'http://test.com/?eq(prime,true)&eq(even,true)');
		},

		after: function () {
			mockHandle.remove();
		}
	});
});
