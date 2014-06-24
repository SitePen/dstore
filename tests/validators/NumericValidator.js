define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/declare',
	'dstore/Model',
	'dstore/Memory',
	'dstore/validators/NumericValidator'
], function (registerSuite, assert, declare, Model, Memory, NumericValidator) {

	registerSuite({
		name: 'NumericValidator',

		'NumericValidator as array': function () {
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
		'NumericValidator as subclass': function () {
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
		}
	});
});
