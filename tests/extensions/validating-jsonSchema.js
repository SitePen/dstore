define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/lang',
	'dojo/json',
	'dojo/_base/declare',
	'dstore/Memory',
	'dstore/Validating',
	'dstore/extensions/jsonSchema'
], function (registerSuite, assert, lang, JSON, declare, Memory, Validating, jsonSchema) {

	var validatingMemory = (declare([Memory, Validating]))({
		model: jsonSchema({
			properties: {
				prime: {
					type: 'boolean'
				},
				number: {
					type: 'number',
					minimum: 1,
					maximum: 10
				},
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
		name: 'dstore validating jsonSchema',

		'get': function () {
			assert.strictEqual(validatingMemory.getSync(1).name, 'one');
		},

		'model errors': function () {
			validatingMemory.allowErrors = true;
			var four = validatingMemory.getSync(4);
			four.set('number', 33);
			assert.strictEqual(JSON.stringify(four.property('number').get('errors')), JSON.stringify([
				{'property': 'number', 'message': 'must have a maximum value of 10'}
			]));
			four.set('number', 3);
			assert.strictEqual(four.property('number').get('errors'), undefined);
		},
		
		'put update': function () {
			var four = lang.delegate(validatingMemory.getSync(4));
			four.prime = 'not a boolean';
			four.number = 34;
			four.name = 33;
			return validatingMemory.put(four).then(function () {
				assert.fail('should not pass validation');
			}, function (validationError) {
				assert.strictEqual(JSON.stringify(validationError.errors), JSON.stringify([
					{'property': 'prime', 'message': 'string value found, but a boolean is required'},
					{'property': 'number', 'message': 'must have a maximum value of 10'},
					{'property': 'name', 'message': 'number value found, but a string is required'}
				]));
			});
		}
	});
});
