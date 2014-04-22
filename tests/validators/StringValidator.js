define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Model',
	'dstore/Memory',
	'dstore/validators/StringValidator'
], function (registerSuite, assert, declare, Model, Memory, StringValidator) {

	registerSuite({
		name: 'StringValidator',
		'StringValidator in array': function () {
			var model = new Model({
				schema: {
					foo: {
						validators: [new StringValidator({
							minimumLength: 1,
							maximumLength: 10,
							pattern: /\w+/
						})]
					}
				}
			});
			var foo = model.property('foo');
			foo.put('');
			assert.deepEqual(foo.get('errors'), ['This is too short', 'The pattern did not match']);
			foo.put('this is just too long of string to allow');
			assert.deepEqual(foo.get('errors'), ['This is too long']);
			foo.put('???');
			assert.deepEqual(foo.get('errors'), ['The pattern did not match']);
			foo.put('hello');
			assert.strictEqual(foo.get('errors'), undefined);
		},
		'StringValidator direct': function () {
			var model = new Model({
				schema: {
					foo: new StringValidator({
						minimumLength: 1,
						maximumLength: 10,
						pattern: /\w+/
					})
				}
			});
			var foo = model.property('foo');
			foo.put('');
			assert.deepEqual(foo.get('errors'), ['This is too short', 'The pattern did not match']);
			foo.put('this is just too long of string to allow');
			assert.deepEqual(foo.get('errors'), ['This is too long']);
			foo.put('???');
			assert.deepEqual(foo.get('errors'), ['The pattern did not match']);
			foo.put('hello');
			assert.strictEqual(foo.get('errors'), undefined);
		}
	});
});
