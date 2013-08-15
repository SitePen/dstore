define([
	'intern!object',
	'intern/chai!assert',
	'dojo/_base/lang',
	'dstore/Memory',
	'dstore/extensions/validatingSchema'
], function(registerSuite, assert, lang, Memory, validatingSchema){

	var validatingMemory = validatingSchema(new Memory(), {
		properties: {
			prime: Boolean,
			even: Boolean,
			name: {
				type: 'string',
				required: true
			}
		}
	});
	validatingMemory.setData([
		{id: 1, name: 'one', prime: false, mappedTo: 'E'},
		{id: 2, name: 'two', even: true, prime: true, mappedTo: 'D'},
		{id: 3, name: 'three', prime: true, mappedTo: 'C'},
		{id: 4, name: 'four', even: true, prime: false, mappedTo: null},
		{id: 5, name: 'five', prime: true, mappedTo: 'A'}
	]);

	registerSuite({
		name: 'dstore validatingMemory',

		'get': function(){
			assert.strictEqual(validatingMemory.get(1).name, 'one');
		},

		'put update': function(){
			var four = lang.delegate(validatingMemory.get(4));
			four.prime = 'not a boolean';
			four.name = 33;
			var validationError;
			try{
				validatingMemory.put(four);
			}catch(e){
				validationError = e;
			}
			assert.strictEqual(JSON.stringify(validationError.errors), JSON.stringify([
				{'property': 'prime', 'message': 'string value found, but a boolean is required'},
				{'property': 'name', 'message': 'number value found, but a string is required'}
			]));
		},

		'model rejection': function(){
			var four = validatingMemory.get(4);
			var validationErrors = [];
			try{
				four.set('prime', 'not a boolean');
			}catch(e){
				validationErrors.push(e.errors[0]);
			}
			try{
				four.set('name', 33);
			}catch(e){
				validationErrors.push(e.errors[0]);
			}
			assert.strictEqual(JSON.stringify(validationErrors), JSON.stringify([
				{'property': '', 'message': 'string value found, but a boolean is required'},
				{'property': '', 'message': 'number value found, but a string is required'}
			]));
			assert.strictEqual(four.get('prime'), false);
			assert.strictEqual(four.get('name'), 'four');
		},

		'model errors': function(){
			validatingMemory.allowErrors = true;
			var four = validatingMemory.get(4);
			four.set('prime', 'not a boolean');
			four.set('name', 33);
			assert.strictEqual(JSON.stringify(four.get('primeError')), JSON.stringify([
				{'property': '', 'message': 'string value found, but a boolean is required'}
			]));
			assert.strictEqual(JSON.stringify(four.get('nameError')), JSON.stringify([
				{'property': '', 'message': 'number value found, but a string is required'}
			]));
			four.set('prime', false);
			four.set('name', 'four');
			assert.strictEqual(four.get('primeError'), null);
			assert.strictEqual(four.get('nameError'), null);
		}
	});
});
