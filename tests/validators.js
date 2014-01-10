define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Model',
	'dstore/Memory',
	'dstore/validators/NumericValidator',
	'dstore/validators/StringValidator',
	'dstore/validators/UniqueValidator'
], function (registerSuite, assert, declare, Model, Memory, NumericValidator, StringValidator, UniqueValidator) {

	registerSuite({
		name: 'dstore validators in validator array',

		'NumericValidator': function () {
			var model = new Model({
				schema: {
					foo: {
						validators: [new NumericValidator({
							minimum: 10,
							maximum: 20
						})]
					}
				}
			});
			var foo = model.property('foo');
			foo.put(30);
			assert.deepEqual(foo.get('errors'), ['The value is too high']);
			foo.put(1);
			assert.deepEqual(foo.get('errors'), ['The value is too low']);
			foo.put('fd');
			assert.deepEqual(foo.get('errors'), ['The value is not a number']);
			foo.put(15);
			assert.strictEqual(foo.get('errors'), undefined);
		},
		'StringValidator': function () {
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
		'UniqueValidator': function () {
			var store = new Memory({
				data: [{id: 1}, {id: 2}]
			});
			var model = new Model({
				schema: {
					foo: {
						validators: [new UniqueValidator({
							uniqueStore: store
						})]
					},
					bar: {
						validators: [
							new NumericValidator({
								maximum: 10
							}),
							new UniqueValidator({
								uniqueStore: store
							})
						]
					}
				}
			});
			var foo = model.property('foo');
			foo.put(1);
			assert.deepEqual(foo.get('errors'), ['The value is not unique']);
			foo.put(100);
			assert.deepEqual(foo.get('errors'), undefined);
			var bar = model.property('bar');
			bar.put(1);
			assert.deepEqual(bar.get('errors'), ['The value is not unique']);
			bar.put(100);
			assert.deepEqual(bar.get('errors'), ['The value is too high']);
			bar.put(3);
			assert.deepEqual(bar.get('errors'), undefined);
		}
	});
	registerSuite({
		name: 'dstore validators as mixins',

		'NumericValidator': function () {
			var model = new Model({
				schema: {
					foo: new NumericValidator({
						minimum: 10,
						maximum: 20
					})
				}
			});
			var foo = model.property('foo');
			foo.put(30);
			assert.deepEqual(foo.get('errors'), ['The value is too high']);
			foo.put(1);
			assert.deepEqual(foo.get('errors'), ['The value is too low']);
			foo.put('fd');
			assert.deepEqual(foo.get('errors'), ['The value is not a number']);
			foo.put(15);
			assert.strictEqual(foo.get('errors'), undefined);
		},
		'StringValidator': function () {
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
		},
		'UniqueValidator': function () {
			var store = new Memory({
				data: [{id: 1}, {id: 2}]
			});
			var model = new Model({
				schema: {
					foo: new UniqueValidator({
						uniqueStore: store
					}),
					bar: new (declare([NumericValidator, UniqueValidator]))({
						uniqueStore: store,
						maximum: 10
					})
				}
			});
			var foo = model.property('foo');
			foo.put(1);
			assert.deepEqual(foo.get('errors'), ['The value is not unique']);
			foo.put(100);
			assert.deepEqual(foo.get('errors'), undefined);
			var bar = model.property('bar');
			bar.put(1);
			assert.deepEqual(bar.get('errors'), ['The value is not unique']);
			bar.put(100);
			assert.deepEqual(bar.get('errors'), ['The value is too high']);
			bar.put(3);
			assert.deepEqual(bar.get('errors'), undefined);
		}
	});
});
