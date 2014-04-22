define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Model',
	'dstore/Memory',
	'dstore/validators/NumericValidator',
	'dstore/validators/UniqueValidator'
], function (registerSuite, assert, declare, Model, Memory, NumericValidator, UniqueValidator) {

	registerSuite({
		name: 'UniqueValidator',
		'UniqueValidator in array with NumericValidator': function () {
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
		},
		'UniqueValidator direct and mixed in with NumericValidator': function () {
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
