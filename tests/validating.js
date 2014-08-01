define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/lang',
	'dojo/json',
	'dojo/_base/declare',
	'dstore/Memory',
	'dstore/Model',
	'dstore/Validating',
	'dstore/validators/NumericValidator'
], function (registerSuite, assert, lang, JSON, declare, Memory, Model, Validating, NumericValidator) {

	var validatingMemory = new (declare([Memory, Validating]))({
		model: declare(Model, {
			schema: {
				prime: 'boolean',
				number: new NumericValidator({
					minimum: 1,
					maximum: 10
				}),
				name: {
					type: 'string',
					required: true
				}
			}
		})
	});
	validatingMemory.setData([
		{id: 1, name: 'one', number: 1, prime: false, mappedTo: 'E'},
		{id: 2, name: 'two', number: 2, prime: true, mappedTo: 'D'},
		{id: 3, name: 'three', number: 3, prime: true, mappedTo: 'C'},
		{id: 4, name: 'four', number: 4, even: true, prime: false, mappedTo: null},
		{id: 5, name: 'five', number: 5, prime: true, mappedTo: 'A'}
	]);

	registerSuite({
		name: 'dstore validatingMemory',

		'get': function () {
			assert.strictEqual(validatingMemory.getSync(1).name, 'one');
		},

		'put update': function () {
			var four = lang.delegate(validatingMemory.get(4));
			four.prime = 'not a boolean';
			four.number = 34;
			four.name = 33;
			return validatingMemory.put(four).then(function () {
				assert.fail('should not pass validation');
			}, function (validationError) {
				assert.strictEqual(JSON.stringify(validationError.errors), JSON.stringify([
					'not a boolean is not a boolean',
					'The value is too high',
					'33 is not a string'
				]));
			});
		},
		'add update': function () {
			var four = {
				prime: 'not a boolean',
				number: 34,
				name: 33
			};
			return validatingMemory.add(four).then(function () {
				assert.fail('should not pass validation');
			}, function (validationError) {
				assert.strictEqual(JSON.stringify(validationError.errors), JSON.stringify([
					'not a boolean is not a boolean',
					'The value is too high',
					'33 is not a string'
				]));
			});
		}

	});
});
